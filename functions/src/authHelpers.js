const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();

/**
 * Verify the request carries a valid Firebase ID token.
 * Returns { uid, decodedToken } on success, or { error, status } on failure.
 */
async function verifyAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { error: "Unauthorized", status: 401 };
    }

    const token = authHeader.split("Bearer ")[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return { uid: decodedToken.uid, decodedToken };
    } catch (error) {
        return { error: "Unauthorized", status: 401 };
    }
}

/**
 * Verify the request carries a valid Firebase ID token AND that the caller
 * is an operator. Returns { uid, decodedToken } on success, or
 * { error, status } on failure.
 */
async function verifyOperator(req) {
    const auth = await verifyAuth(req);
    if (auth.error) {
        return auth;
    }

    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists || !userDoc.data().isOperator) {
        return { error: "Forbidden", status: 403 };
    }

    return auth;
}

module.exports = { verifyAuth, verifyOperator };
