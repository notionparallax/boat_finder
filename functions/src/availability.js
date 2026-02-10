const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

const db = getFirestore();

/**
 * Get calendar view of all divers' availability for a date range
 */
exports.getCalendar = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        await admin.auth().verifyIdToken(token);

        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        // Get all availability records in date range
        const availabilitySnapshot = await db.collection("availability")
            .where("date", ">=", startDate)
            .where("date", "<=", endDate)
            .get();

        if (availabilitySnapshot.empty) {
            return res.status(200).json({ success: true, data: {} });
        }

        // Get unique user IDs
        const userIds = [...new Set(availabilitySnapshot.docs.map(doc => doc.data().userId))];

        // Get user details
        const userPromises = userIds.map(userId => db.collection("users").doc(userId).get());
        const userDocs = await Promise.all(userPromises);
        const users = userDocs
            .filter(doc => doc.exists)
            .map(doc => ({ userId: doc.id, ...doc.data() }));

        // Group availability by date
        const calendar = {};
        availabilitySnapshot.forEach(doc => {
            const record = doc.data();
            if (!calendar[record.date]) {
                calendar[record.date] = [];
            }

            const user = users.find(u => u.userId === record.userId);
            if (user) {
                calendar[record.date].push({
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    maxDepth: user.maxDepth,
                    phone: user.phone,
                    photoURL: user.photoURL,
                });
            }
        });

        return res.status(200).json({ success: true, data: calendar });
    } catch (error) {
        console.error("Error in getCalendar:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get detailed list of divers available on a specific date (operators only)
 */
exports.getDayDetails = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const date = req.query.date || req.params.date;

        // Check if user is operator
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists || !userDoc.data().isOperator) {
            return res.status(403).json({ error: "Operators only" });
        }

        // Get all availability for this date
        const availabilitySnapshot = await db.collection("availability")
            .where("date", "==", date)
            .get();

        if (availabilitySnapshot.empty) {
            return res.status(200).json({ success: true, data: { date, divers: [] } });
        }

        const userIds = availabilitySnapshot.docs.map(doc => doc.data().userId);

        // Get full user details
        const userPromises = userIds.map(uid => db.collection("users").doc(uid).get());
        const userDocs = await Promise.all(userPromises);

        const divers = userDocs
            .filter(doc => doc.exists)
            .map(doc => {
                const data = doc.data();
                return {
                    userId: doc.id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: data.phone,
                    maxDepth: data.maxDepth,
                    certLevel: data.certLevel,
                };
            });

        return res.status(200).json({ success: true, data: { date, divers } });
    } catch (error) {
        console.error("Error in getDayDetails:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Toggle availability for a specific date
 */
exports.toggleAvailability = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const { date } = req.body;

        if (!date) {
            return res.status(400).json({ error: "date is required" });
        }

        // Use composite key for document ID
        const docId = `${userId}_${date}`;

        // Check if availability exists
        const docRef = db.collection("availability").doc(docId);
        const doc = await docRef.get();

        if (doc.exists) {
            // Remove availability
            await docRef.delete();
            return res.status(200).json({ success: true, data: { available: false, date } });
        } else {
            // Add availability
            await docRef.set({
                userId: userId,
                date: date,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Check if this triggers operator notification threshold
            const daySnapshot = await db.collection("availability")
                .where("date", "==", date)
                .get();
            const diverCount = daySnapshot.size;

            // Get operators who want notifications at this threshold
            const operatorsSnapshot = await db.collection("users")
                .where("isOperator", "==", true)
                .where("operatorNotificationThreshold", "<=", diverCount)
                .get();

            // TODO: Send email notifications to operators
            if (!operatorsSnapshot.empty) {
                console.log(`${operatorsSnapshot.size} operators should be notified about ${date} (${diverCount} divers)`);
            }

            return res.status(200).json({ success: true, data: { available: true, date } });
        }
    } catch (error) {
        console.error("Error in toggleAvailability:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get the current user's availability dates
 */
exports.getMyDates = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        // Get user's availability
        const snapshot = await db.collection("availability")
            .where("userId", "==", userId)
            .where("date", ">=", startDate)
            .where("date", "<=", endDate)
            .orderBy("date", "asc")
            .get();

        const dates = snapshot.docs.map(doc => doc.data().date);
        return res.status(200).json({ success: true, data: dates });
    } catch (error) {
        console.error("Error in getMyDates:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
