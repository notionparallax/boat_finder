const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

const db = getFirestore();

const SITE_NAME_REGEX = /^[A-Za-z0-9À-ÖØ-öø-ÿ'&(),./+\-\s]+$/;

function validationError(res, message) {
    return res.status(400).json({ success: false, error: message });
}

function sanitizeString(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
}

function validateSiteId(siteId) {
    const trimmed = sanitizeString(siteId);
    if (!trimmed) {
        return { error: "siteId is required" };
    }
    if (trimmed.length > 128) {
        return { error: "siteId is invalid" };
    }
    return { value: trimmed };
}

function validateCreateSitePayload(body) {
    const allowedKeys = ["name", "depth", "latitude", "longitude"];
    const bodyKeys = Object.keys(body || {});
    const unknownKeys = bodyKeys.filter((key) => !allowedKeys.includes(key));
    if (unknownKeys.length > 0) {
        return { error: `Unknown field(s): ${unknownKeys.join(", ")}` };
    }

    const name = sanitizeString(body.name);
    if (!name) {
        return { error: "name is required" };
    }
    if (name.length < 2 || name.length > 120) {
        return { error: "name must be between 2 and 120 characters" };
    }
    if (!SITE_NAME_REGEX.test(name)) {
        return { error: "name contains invalid characters" };
    }

    if (typeof body.depth !== "number") {
        return { error: "depth must be a number" };
    }

    const depth = Number(body.depth);
    if (!Number.isInteger(depth)) {
        return { error: "depth must be an integer" };
    }
    if (depth < 1 || depth > 300) {
        return { error: "depth must be between 1 and 300" };
    }

    const hasLatitude = body.latitude !== undefined && body.latitude !== null && body.latitude !== "";
    const hasLongitude = body.longitude !== undefined && body.longitude !== null && body.longitude !== "";
    if (hasLatitude !== hasLongitude) {
        return { error: "latitude and longitude must both be provided" };
    }

    let latitude = null;
    let longitude = null;
    if (hasLatitude && hasLongitude) {
        if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
            return { error: "latitude and longitude must be numbers" };
        }

        latitude = Number(body.latitude);
        longitude = Number(body.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return { error: "latitude and longitude must be valid numbers" };
        }
        if (latitude < -90 || latitude > 90) {
            return { error: "latitude must be between -90 and 90" };
        }
        if (longitude < -180 || longitude > 180) {
            return { error: "longitude must be between -180 and 180" };
        }
    }

    return {
        value: {
            name,
            depth,
            latitude,
            longitude,
        },
    };
}

/**
 * Get all dive sites with user's interest flags
 */
exports.getAllSites = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        // Get all sites
        const sitesSnapshot = await db.collection("diveSites")
            .orderBy("name", "asc")
            .get();

        // Get user's interests
        const interestsSnapshot = await db.collection("siteInterest")
            .where("userId", "==", userId)
            .get();

        const interestedSiteIds = new Set(
            interestsSnapshot.docs.map(doc => doc.data().siteId)
        );

        // Add isInterested flag to each site
        const sites = sitesSnapshot.docs.map(doc => ({
            siteId: doc.id,
            ...doc.data(),
            isInterested: interestedSiteIds.has(doc.id),
        }));

        return res.status(200).json({ success: true, data: sites });
    } catch (error) {
        console.error("Error in getAllSites:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get a single dive site by ID
 */
exports.getSite = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);

        const validatedSiteId = validateSiteId(req.query.siteId || req.params.siteId);
        if (validatedSiteId.error) {
            return validationError(res, validatedSiteId.error);
        }

        const siteId = validatedSiteId.value;

        const siteDoc = await db.collection("diveSites").doc(siteId).get();

        if (!siteDoc.exists) {
            return res.status(404).json({ error: "Site not found" });
        }

        return res.status(200).json({
            success: true,
            data: { siteId: siteDoc.id, ...siteDoc.data() }
        });
    } catch (error) {
        console.error("Error in getSite:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get all divers interested in a specific site
 */
exports.getSiteDivers = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);

        const validatedSiteId = validateSiteId(req.query.siteId || req.params.siteId);
        if (validatedSiteId.error) {
            return validationError(res, validatedSiteId.error);
        }

        const siteId = validatedSiteId.value;

        // Get all users interested in this site
        const interestsSnapshot = await db.collection("siteInterest")
            .where("siteId", "==", siteId)
            .get();

        if (interestsSnapshot.empty) {
            return res.status(200).json({ success: true, data: [] });
        }

        const userIds = interestsSnapshot.docs.map(doc => doc.data().userId);

        // Get user details
        const userPromises = userIds.map(uid => db.collection("users").doc(uid).get());
        const userDocs = await Promise.all(userPromises);

        const users = userDocs
            .filter(doc => doc.exists)
            .map(doc => {
                const data = doc.data();
                return {
                    userId: doc.id,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    maxDepth: data.maxDepth,
                };
            })
            .sort((a, b) => (b.maxDepth || 0) - (a.maxDepth || 0));

        return res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error("Error in getSiteDivers:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Create a new dive site
 */
exports.createSite = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const validatedPayload = validateCreateSitePayload(req.body || {});
        if (validatedPayload.error) {
            return validationError(res, validatedPayload.error);
        }

        const { name, depth, latitude, longitude } = validatedPayload.value;

        // Check if site with same name exists (case-insensitive)
        const existingSnapshot = await db.collection("diveSites")
            .where("nameLower", "==", name.toLowerCase())
            .get();

        if (!existingSnapshot.empty) {
            return res.status(400).json({ error: "Site with this name already exists" });
        }

        const siteData = {
            name,
            nameLower: name.toLowerCase(),
            depth,
            latitude,
            longitude,
            createdBy: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const siteRef = await db.collection("diveSites").add(siteData);

        return res.status(200).json({
            success: true,
            data: { siteId: siteRef.id, ...siteData }
        });
    } catch (error) {
        console.error("Error in createSite:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delete a dive site (only by creator)
 */
exports.deleteSite = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const validatedSiteId = validateSiteId(req.body?.siteId || req.params.siteId);
        if (validatedSiteId.error) {
            return validationError(res, validatedSiteId.error);
        }

        const siteId = validatedSiteId.value;

        // Get the site
        const siteDoc = await db.collection("diveSites").doc(siteId).get();
        if (!siteDoc.exists) {
            return res.status(404).json({ error: "Site not found" });
        }

        const siteData = siteDoc.data();

        // Check if user is the creator
        if (siteData.createdBy !== userId) {
            return res.status(403).json({ error: "Only the site creator can delete this site" });
        }

        // Delete the site
        await db.collection("diveSites").doc(siteId).delete();

        // Delete all interest records for this site
        const interestSnapshot = await db.collection("siteInterest")
            .where("siteId", "==", siteId)
            .get();

        const batch = db.batch();
        interestSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        return res.status(200).json({ success: true, data: { siteId } });
    } catch (error) {
        console.error("Error in deleteSite:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Toggle user's interest in a dive site
 */
exports.toggleSiteInterest = onRequest({ region: "australia-southeast1" }, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const validatedSiteId = validateSiteId(req.body?.siteId || req.params.siteId);
        if (validatedSiteId.error) {
            return validationError(res, validatedSiteId.error);
        }

        const siteId = validatedSiteId.value;

        // Verify site exists
        const siteDoc = await db.collection("diveSites").doc(siteId).get();
        if (!siteDoc.exists) {
            return res.status(404).json({ error: "Site not found" });
        }

        // Use composite key for document ID
        const docId = `${userId}_${siteId}`;
        const interestRef = db.collection("siteInterest").doc(docId);
        const interestDoc = await interestRef.get();

        if (interestDoc.exists) {
            // Remove interest
            await interestRef.delete();
            return res.status(200).json({ success: true, data: { interested: false, siteId } });
        } else {
            // Add interest
            await interestRef.set({
                userId: userId,
                siteId: siteId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return res.status(200).json({ success: true, data: { interested: true, siteId } });
        }
    } catch (error) {
        console.error("Error in toggleSiteInterest:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});
