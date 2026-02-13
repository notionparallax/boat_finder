const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const sgMail = require("@sendgrid/mail");

// Set default region for all functions
setGlobalOptions({ region: "australia-southeast1" });

const db = getFirestore();

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Daily digest email notification
 * Runs at 4:00 PM Sydney time every day
 * Checks 7 days ahead and notifies operators if threshold met
 */
exports.dailyDigest = onSchedule(
    {
        schedule: "0 16 * * *",
        timeZone: "Australia/Sydney",
    },
    async (event) => {
        try {
            console.log("Daily digest triggered");

            if (!process.env.SENDGRID_API_KEY) {
                console.warn("SENDGRID_API_KEY not configured - skipping email send");
                return;
            }

            // Get date 7 days from now
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 7);
            const dateStr = targetDate.toISOString().split("T")[0];

            console.log(`Checking availability for ${dateStr} (7 days ahead)`);

            // Get all availability for the target date
            const availabilitySnapshot = await db
                .collection("availability")
                .where("date", "==", dateStr)
                .get();

            const diverCount = availabilitySnapshot.size;
            console.log(`Found ${diverCount} divers available on ${dateStr}`);

            if (diverCount === 0) {
                console.log("No divers available - skipping notifications");
                return;
            }

            // Get operators who should be notified
            const operatorsSnapshot = await db
                .collection("users")
                .where("isOperator", "==", true)
                .where("operatorNotificationThreshold", "<=", diverCount)
                .get();

            console.log(`Found ${operatorsSnapshot.size} operators to notify`);

            if (operatorsSnapshot.empty) {
                return;
            }

            // Get user IDs from availability
            const userIds = availabilitySnapshot.docs.map((doc) => doc.data().userId);

            // Get diver details
            const userPromises = userIds.map((uid) => db.collection("users").doc(uid).get());
            const userDocs = await Promise.all(userPromises);

            const divers = userDocs
                .filter((doc) => doc.exists)
                .map((doc) => {
                    const data = doc.data();
                    return {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        maxDepth: data.maxDepth || 0,
                    };
                })
                .sort((a, b) => b.maxDepth - a.maxDepth);

            // Format diver list for email
            const diverList = divers
                .map((d) => `  • ${d.firstName} ${d.lastName} (${d.maxDepth}m)`)
                .join("\n");

            const formattedDate = new Date(dateStr).toLocaleDateString("en-AU", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "Australia/Sydney",
            });

            // Send emails to operators using SendGrid
            const emailPromises = [];
            
            operatorsSnapshot.forEach((doc) => {
                const operator = doc.data();
                
                const msg = {
                    to: operator.email,
                    from: process.env.EMAIL_FROM || "ben@tech-dive.sydney",
                    replyTo: "ben@tech-dive.sydney",
                    subject: `${diverCount} divers available on ${formattedDate}`,
                    html: `
                        <h2>Boat Finder Daily Digest</h2>
                        <p>Hi ${operator.firstName || "there"},</p>
                        <p><strong>${diverCount} tech divers</strong> have indicated availability for <strong>${formattedDate}</strong>.</p>
                        <h3>Available Divers:</h3>
                        <pre>${diverList}</pre>
                        <p>
                            <a href="https://tech-dive.sydney" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
                                View Calendar
                            </a>
                        </p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
                        <p style="font-size: 12px; color: #666;">
                            You're receiving this because you're a boat operator and your notification threshold is ${operator.operatorNotificationThreshold} divers.
                            <br />
                            Update your preferences at <a href="https://tech-dive.sydney/profile">tech-dive.sydney/profile</a>
                        </p>
                    `,
                };

                emailPromises.push(
                    sgMail.send(msg)
                        .then(() => {
                            console.log(`Email sent to ${operator.email}`);
                        })
                        .catch((error) => {
                            console.error(`Failed to send email to ${operator.email}:`, error);
                        })
                );
            });

            await Promise.all(emailPromises);
            console.log("Daily digest completed");
        } catch (error) {
            console.error("Error in daily digest:", error);
            throw error;
        }
    }
);
