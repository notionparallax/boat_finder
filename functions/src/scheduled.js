const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore } = require("firebase-admin/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");

// Set default region for all functions
setGlobalOptions({ region: "australia-southeast1" });

const db = getFirestore();

/**
 * Daily digest email notification
 * Runs at 8:00 AM Sydney time every day
 * Checks 7 days ahead and notifies operators if threshold met
 */
exports.dailyDigest = onSchedule(
    {
        schedule: "0 8 * * *",
        timeZone: "Australia/Sydney",
    },
    async (event) => {
        try {
            console.log("Daily digest triggered");

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

            // TODO: Send emails to operators
            // For now, just log what would be sent
            operatorsSnapshot.forEach((doc) => {
                const operator = doc.data();
                console.log(`Would send email to ${operator.email}:`);
                console.log(`Subject: ${diverCount} divers available on ${formattedDate}`);
                console.log(`Divers:\n${diverList}`);
            });

            console.log("Daily digest completed");
        } catch (error) {
            console.error("Error in daily digest:", error);
            throw error;
        }
    }
);
