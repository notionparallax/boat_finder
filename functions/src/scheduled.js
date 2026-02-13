const { onSchedule } = require("firebase-functions/v2/scheduler");
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
            console.log("Daily digest triggered");

            // Initialize SendGrid with secret value
            const apiKey = sendgridApiKey.value();
            if (!apiKey) {
                console.warn("SENDGRID_API_KEY not configured - skipping email send");
                return;
            }
            sgMail.setApiKey(apiKey);

            // Get operators
            const operatorsSnapshot = await db
                .collection("users")
                .where("isOperator", "==", true)
                .get();

            if (operatorsSnapshot.empty) {
                console.log("No operators found");
                return;
            }

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
                return;
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
            const fromEmail = emailFrom.value() || "ben@tech-dive.sydney";

            for (const doc of operatorsSnapshot.docs) {
                const operator = doc.data();
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
                `;
                allDatesOverThreshold.forEach((dateInfo) => {
                    const diverList = dateInfo.divers
                        .map((d) => `${d.firstName} ${d.lastName} (${d.maxDepth}m)`)
                        .join(", ");
                    emailHtml += `
                        <div style="margin: 10px 0; padding: 8px; background: #f9f9f9; border-left: 3px solid #999;">
                            <strong>${dateInfo.formattedDate}</strong> - ${dateInfo.count} divers<br/>
                            <span style="font-size: 14px; color: #666;">${diverList}</span>
                        </div>
                    `;
                });

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
                    from: fromEmail,
                    replyTo: "ben@tech-dive.sydney",
                    subject: `Boat Finder: ${allDatesOverThreshold.length} dates with ${threshold}+ divers`,
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
                        })
                );
            }

            await Promise.all(emailPromises);
            console.log(`Daily digest completed - sent ${emailPromises.length} emails`);
        } catch (error) {
            console.error("Error in daily digest:", error);
            throw error;
        }
    }
);
