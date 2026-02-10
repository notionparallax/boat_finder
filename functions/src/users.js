const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

// Initialize Firestore
const db = getFirestore();

/**
 * Get the current user's profile
 */
exports.getMe = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        // Verify Firebase Auth token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        // Get user from Firestore
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            // Create new user on first login
            const displayName = decodedToken.name || decodedToken.email?.split("@")[0] || "";
            const nameParts = displayName.split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            const newUser = {
                userId: userId,
                email: decodedToken.email || "",
                firstName: firstName,
                lastName: lastName,
                photoURL: decodedToken.picture || "",
                isOperator: false,
                operatorNotificationThreshold: 3,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await db.collection("users").doc(userId).set(newUser);
            return res.status(200).json({ success: true, data: newUser });
        }

        return res.status(200).json({ success: true, data: userDoc.data() });
    } catch (error) {
        console.error("Error in getMe:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Update the current user's profile
 */
exports.updateProfile = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        // Verify Firebase Auth token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const body = req.body;

        // Get existing user
        const userDoc = await db.collection("users").doc(userId).get();

        let userData;
        if (!userDoc.exists) {
            // Create new user
            const displayName = decodedToken.name || decodedToken.email?.split("@")[0] || "";
            const nameParts = displayName.split(" ");
            const firstName = body.firstName || nameParts[0] || "";
            const lastName = body.lastName || nameParts.slice(1).join(" ") || "";

            userData = {
                userId: userId,
                email: decodedToken.email || "",
                firstName: firstName,
                lastName: lastName,
                phone: body.phone || "",
                certLevel: body.certLevel || "",
                maxDepth: body.maxDepth || 0,
                photoURL: decodedToken.picture || "",
                isOperator: false,
                operatorNotificationThreshold: 3,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await db.collection("users").doc(userId).set(userData);
        } else {
            // Update existing user
            const updates = {};
            if (body.firstName !== undefined) updates.firstName = body.firstName;
            if (body.lastName !== undefined) updates.lastName = body.lastName;
            if (body.phone !== undefined) updates.phone = body.phone;
            if (body.certLevel !== undefined) updates.certLevel = body.certLevel;
            if (body.maxDepth !== undefined) updates.maxDepth = body.maxDepth;
            if (body.operatorNotificationThreshold !== undefined) {
                updates.operatorNotificationThreshold = body.operatorNotificationThreshold;
            }
            updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

            await db.collection("users").doc(userId).update(updates);
            userData = { ...userDoc.data(), ...updates };
        }

        return res.status(200).json({ success: true, data: userData });
    } catch (error) {
        console.error("Error in updateProfile:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
