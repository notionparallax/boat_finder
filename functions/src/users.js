const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

// Initialize Firestore
const db = getFirestore();

const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/;

function validationError(res, message) {
    return res.status(400).json({ success: false, error: message });
}

function sanitizeString(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
}

function validateName(fieldName, value) {
    const trimmed = sanitizeString(value);
    if (!trimmed) {
        return { error: `${fieldName} is required` };
    }
    if (trimmed.length < 2 || trimmed.length > 80) {
        return { error: `${fieldName} must be between 2 and 80 characters` };
    }
    if (!NAME_REGEX.test(trimmed)) {
        return { error: `${fieldName} contains invalid characters` };
    }
    return { value: trimmed };
}

function normalizeAustralianMobile(input) {
    const raw = sanitizeString(input);
    if (!raw) {
        return { error: "phone is required" };
    }

    const normalized = raw.replace(/[\s()-]/g, "");

    if (/^04\d{8}$/.test(normalized)) {
        return { value: normalized };
    }

    if (/^\+614\d{8}$/.test(normalized)) {
        return { value: `0${normalized.slice(3)}` };
    }

    if (/^614\d{8}$/.test(normalized)) {
        return { value: `0${normalized.slice(2)}` };
    }

    return { error: "phone must be a valid Australian mobile number (e.g. 04XXXXXXXX)" };
}

function validateCertLevel(value) {
    const trimmed = sanitizeString(value);
    if (!trimmed) {
        return { error: "certLevel is required" };
    }
    if (trimmed.length < 2 || trimmed.length > 100) {
        return { error: "certLevel must be between 2 and 100 characters" };
    }
    return { value: trimmed };
}

function validateMaxDepth(value) {
    if (typeof value !== "number") {
        return { error: "maxDepth must be a number" };
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        return { error: "maxDepth must be an integer" };
    }
    if (parsed < 10 || parsed > 300) {
        return { error: "maxDepth must be between 10 and 300" };
    }
    return { value: parsed };
}

function validateOperatorThreshold(value) {
    if (value === undefined || value === null || value === "") {
        return { value: null };
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        return { error: "operatorNotificationThreshold must be an integer" };
    }
    if (parsed < 0 || parsed > 50) {
        return { error: "operatorNotificationThreshold must be between 0 and 50" };
    }

    return { value: parsed };
}

function validateProfilePayload(body, isOperator) {
    const allowedKeys = [
        "firstName",
        "lastName",
        "phone",
        "certLevel",
        "maxDepth",
        "operatorNotificationThreshold",
    ];

    const bodyKeys = Object.keys(body || {});
    const unknownKeys = bodyKeys.filter((key) => !allowedKeys.includes(key));
    if (unknownKeys.length > 0) {
        return { error: `Unknown field(s): ${unknownKeys.join(", ")}` };
    }

    const firstName = validateName("firstName", body.firstName);
    if (firstName.error) return { error: firstName.error };

    const lastName = validateName("lastName", body.lastName);
    if (lastName.error) return { error: lastName.error };

    const phone = normalizeAustralianMobile(body.phone);
    if (phone.error) return { error: phone.error };

    const certLevel = validateCertLevel(body.certLevel);
    if (certLevel.error) return { error: certLevel.error };

    const maxDepth = validateMaxDepth(body.maxDepth);
    if (maxDepth.error) return { error: maxDepth.error };

    const threshold = validateOperatorThreshold(body.operatorNotificationThreshold);
    if (threshold.error) return { error: threshold.error };

    const payload = {
        firstName: firstName.value,
        lastName: lastName.value,
        phone: phone.value,
        certLevel: certLevel.value,
        maxDepth: maxDepth.value,
    };

    if (isOperator) {
        payload.operatorNotificationThreshold = threshold.value;
    }

    return { value: payload };
}

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

        // Sync photoURL from auth token on every login
        const userData = userDoc.data();
        const authPhotoURL = decodedToken.picture || "";
        if (userData.photoURL !== authPhotoURL) {
            await db.collection("users").doc(userId).update({ photoURL: authPhotoURL });
            userData.photoURL = authPhotoURL;
        }

        return res.status(200).json({ success: true, data: userData });
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

        const body = req.body || {};

        // Get existing user
        const userDoc = await db.collection("users").doc(userId).get();

        const isOperator = !!userDoc.data()?.isOperator;
        const validated = validateProfilePayload(body, isOperator);
        if (validated.error) {
            return validationError(res, validated.error);
        }

        const payload = validated.value;

        let userData;
        if (!userDoc.exists) {
            // Create new user
            const displayName = decodedToken.name || decodedToken.email?.split("@")[0] || "";
            const nameParts = displayName.split(" ");
            const firstName = payload.firstName || nameParts[0] || "";
            const lastName = payload.lastName || nameParts.slice(1).join(" ") || "";

            userData = {
                userId: userId,
                email: decodedToken.email || "",
                firstName: firstName,
                lastName: lastName,
                phone: payload.phone,
                certLevel: payload.certLevel,
                maxDepth: payload.maxDepth,
                photoURL: decodedToken.picture || "",
                isOperator: false,
                operatorNotificationThreshold: 3,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await db.collection("users").doc(userId).set(userData);
        } else {
            // Update existing user
            const updates = {
                firstName: payload.firstName,
                lastName: payload.lastName,
                phone: payload.phone,
                certLevel: payload.certLevel,
                maxDepth: payload.maxDepth,
            };

            if (isOperator) {
                updates.operatorNotificationThreshold = payload.operatorNotificationThreshold;
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
