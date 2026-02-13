const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const sgMail = require("@sendgrid/mail");

// Set default region for all functions
setGlobalOptions({ region: "australia-southeast1" });

// Define secrets for SendGrid
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const emailFrom = defineSecret("EMAIL_FROM");

const db = getFirestore();

/**
 * Shared digest logic
 */
async function sendDigestEmails(testEmail = null, testThreshold = null) {
    console.log("Daily digest triggered");

    // Initialize SendGrid with secret value
    const apiKey = sendgridApiKey.value();
    if (!apiKey) {
        console.warn("SENDGRID_API_KEY not configured - skipping email send");
        return { success: false, message: "SendGrid not configured" };
    }
    sgMail.setApiKey(apiKey);

    // Calculate date ranges
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const today = now.toISOString().split("T")[0];
    const endDate = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log(`Checking availability from ${today} to ${endDateStr}`);

    // Get all availability for next 3 weeks
    const availabilitySnapshot = await db
        .collection("availability")
        .where("date", ">=", today)
        .where("date", "<=", endDateStr)
        .get();

    if (availabilitySnapshot.empty) {
        console.log("No availability in next 3 weeks - skipping notifications");
        return { success: true, message: "No availability found", emailsSent: 0 };
    }

    // Get operators (or use test email)
    let operators = [];
    if (testEmail) {
        operators = [{ email: testEmail, firstName: "Test User", operatorNotificationThreshold: testThreshold || 1 }];
    } else {
        const operatorsSnapshot = await db
            .collection("users")
            .where("isOperator", "==", true)
            .get();
        operators = operatorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (operators.length === 0) {
        console.log("No operators found");
        return { success: true, message: "No operators found", emailsSent: 0 };
    }

    // Get all user IDs and fetch user details
    const userIds = [...new Set(availabilitySnapshot.docs.map((doc) => doc.data().userId))];
    const userPromises = userIds.map((uid) => db.collection("users").doc(uid).get());
    const userDocs = await Promise.all(userPromises);
    const usersMap = {};
    userDocs.forEach((doc) => {
        if (doc.exists) {
            const data = doc.data();
            usersMap[doc.id] = {
                firstName: data.firstName,
                lastName: data.lastName,
                maxDepth: data.maxDepth || 0,
            };
        }
    });

    // Group by date and track which dates had new additions today
    const dateGroups = {};
    const newTodayDates = new Set();

    availabilitySnapshot.forEach((doc) => {
        const record = doc.data();
        const date = record.date;

        if (!dateGroups[date]) {
            dateGroups[date] = [];
        }
        dateGroups[date].push(record.userId);

        // Check if this record was added in the last 24 hours
        const createdAt = record.createdAt?.toDate();
        if (createdAt && createdAt >= yesterday) {
            newTodayDates.add(date);
        }
    });

    // Send emails to each operator based on their threshold
    const emailPromises = [];
    const fromEmailAddr = emailFrom.value() || "ben@tech-dive.sydney";

    for (const operator of operators) {
        const threshold = operator.operatorNotificationThreshold || 0;

        // Find dates that meet operator's threshold
        const newDatesOverThreshold = [];
        const allDatesOverThreshold = [];

        for (const [date, userIds] of Object.entries(dateGroups)) {
            const count = userIds.length;
            if (count >= threshold) {
                const divers = userIds
                    .map((uid) => usersMap[uid])
                    .filter((u) => u)
                    .sort((a, b) => b.maxDepth - a.maxDepth);

                const dateInfo = {
                    date,
                    count,
                    divers,
                    formattedDate: new Date(date + "T00:00:00Z").toLocaleDateString("en-AU", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        timeZone: "Australia/Sydney",
                    }),
                };

                allDatesOverThreshold.push(dateInfo);

                // Check if this date had new additions today
                if (newTodayDates.has(date)) {
                    newDatesOverThreshold.push(dateInfo);
                }
            }
        }

        // Skip if no dates meet threshold
        if (allDatesOverThreshold.length === 0) {
            continue;
        }

        // Sort by date
        allDatesOverThreshold.sort((a, b) => a.date.localeCompare(b.date));
        newDatesOverThreshold.sort((a, b) => a.date.localeCompare(b.date));

        // Build email HTML
        let emailHtml = `
            <h2>🚢 Boat Finder Daily Digest</h2>
            <p>Hi ${operator.firstName || "there"},</p>
        `;

        // Section 1: New dates that crossed threshold today
        if (newDatesOverThreshold.length > 0) {
            emailHtml += `
                <h3>🆕 New Today (${newDatesOverThreshold.length} ${newDatesOverThreshold.length === 1 ? 'date' : 'dates'})</h3>
                <p>These dates just reached your threshold of ${threshold} divers:</p>
            `;
            newDatesOverThreshold.forEach((dateInfo) => {
                const diverList = dateInfo.divers
                    .map((d) => `${d.firstName} ${d.lastName} (${d.maxDepth}m)`)
                    .join(", ");
                emailHtml += `
                    <div style="margin: 15px 0; padding: 10px; background: #f0f8ff; border-left: 4px solid #0066cc;">
                        <strong>${dateInfo.formattedDate}</strong> - ${dateInfo.count} divers<br/>
                        <span style="font-size: 14px; color: #666;">${diverList}</span>
                    </div>
                `;
            });
        }

        // Section 2: All upcoming dates over threshold
        emailHtml += `
            <h3>📅 All Upcoming Dates (Next 3 Weeks)</h3>
            <p>${allDatesOverThreshold.length} ${allDatesOverThreshold.length === 1 ? 'date has' : 'dates have'} ${threshold}+ divers:</p>
            <ul style="list-style: none; padding: 0; margin: 10px 0;">
        `;
        allDatesOverThreshold.forEach((dateInfo) => {
            const diverList = dateInfo.divers
                .map((d) => `${d.firstName} ${d.lastName} (${d.maxDepth}m)`)
                .join(", ");
            emailHtml += `
                <li style="margin: 5px 0; font-size: 14px;">
                    <strong>${dateInfo.formattedDate}</strong> - ${dateInfo.count} ${dateInfo.count === 1 ? 'diver' : 'divers'}: ${diverList}
                </li>
            `;
        });
        emailHtml += `</ul>`;

        emailHtml += `
            <p style="margin-top: 20px;">
                <a href="https://tech-dive.sydney" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
                    View Full Calendar
                </a>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="font-size: 12px; color: #666;">
                You're receiving this because you're a boat operator and your notification threshold is ${threshold} ${threshold === 1 ? 'diver' : 'divers'}.
                <br />
                Update your preferences at <a href="https://tech-dive.sydney/profile">tech-dive.sydney/profile</a>
            </p>
        `;

        const msg = {
            to: operator.email,
            from: fromEmailAddr,
            replyTo: "ben@tech-dive.sydney",
            subject: testEmail ? `[TEST] Boat Finder: ${allDatesOverThreshold.length} dates with ${threshold}+ divers` : `Boat Finder: ${allDatesOverThreshold.length} dates with ${threshold}+ divers`,
            html: emailHtml,
        };

        emailPromises.push(
            sgMail
                .send(msg)
                .then(() => {
                    console.log(`Email sent to ${operator.email}`);
                })
                .catch((error) => {
                    console.error(`Failed to send email to ${operator.email}:`, error);
                    throw error;
                })
        );
    }

    await Promise.all(emailPromises);
    console.log(`Daily digest completed - sent ${emailPromises.length} emails`);
    return { success: true, message: "Emails sent", emailsSent: emailPromises.length };
}

/**
 * Daily digest email notification
 * Runs at 4:00 PM Sydney time every day
 * Checks for days that crossed threshold today and all days in next 3 weeks over threshold
 */
exports.dailyDigest = onSchedule(
    {
        schedule: "0 16 * * *",
        timeZone: "Australia/Sydney",
        secrets: [sendgridApiKey, emailFrom],
        memory: "256MiB",
        timeoutSeconds: 300,
    },
    async (event) => {
        try {
            await sendDigestEmails();
        } catch (error) {
            console.error("Error in daily digest:", error);
            throw error;
        }
    }
);

/**
 * Test endpoint to manually trigger digest with custom email/threshold
 * GET /testDigest?email=YOUR_EMAIL&threshold=1
 */
exports.testDigest = onRequest(
    {
        secrets: [sendgridApiKey, emailFrom],
        memory: "256MiB",
        timeoutSeconds: 300,
    },
    async (req, res) => {
        try {
            const testEmail = req.query.email;
            const testThreshold = parseInt(req.query.threshold) || 1;

            if (!testEmail) {
                return res.status(400).json({
                    error: "Missing email parameter. Usage: ?email=YOUR_EMAIL&threshold=1"
                });
            }

            const result = await sendDigestEmails(testEmail, testThreshold);
            return res.status(200).json(result);
        } catch (error) {
            console.error("Error in test digest:", error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * Handler for test digest (used by API endpoint without Cloud Function wrapper)
 */
exports.handleTestDigest = async (req, res) => {
    try {
        const testEmail = req.query.email;
        const testThreshold = parseInt(req.query.threshold) || 1;

        if (!testEmail) {
            return res.status(400).json({
                error: "Missing email parameter. Usage: /api/test-digest?email=YOUR_EMAIL&threshold=1"
            });
        }

        const result = await sendDigestEmails(testEmail, testThreshold);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error in test digest:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
