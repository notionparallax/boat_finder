const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");

const db = getFirestore();

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

        const siteId = req.query.siteId || req.params.siteId;

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

        const siteId = req.query.siteId || req.params.siteId;

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

        const { name, depth, latitude, longitude } = req.body;

        if (!name || !depth) {
            return res.status(400).json({ error: "name and depth are required" });
        }

        // Check if site with same name exists (case-insensitive)
        const existingSnapshot = await db.collection("diveSites")
            .where("nameLower", "==", name.trim().toLowerCase())
            .get();

        if (!existingSnapshot.empty) {
            return res.status(400).json({ error: "Site with this name already exists" });
        }

        const siteData = {
            name: name.trim(),
            nameLower: name.trim().toLowerCase(),
            depth: parseInt(depth),
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
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
        console.log("=== DELETE SITE CALLED ===");
        console.log("Method:", req.method);
        console.log("Path:", req.path);
        console.log("Params:", req.params);
        console.log("Body:", req.body);

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        const siteId = req.body.siteId || req.params.siteId;
        console.log("Site ID to delete:", siteId);

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
        console.log("Deleting site from Firestore...");
        await db.collection("diveSites").doc(siteId).delete();
        console.log("Site deleted from Firestore");

        // Delete all interest records for this site
        console.log("Deleting interest records...");
        const interestSnapshot = await db.collection("siteInterest")
            .where("siteId", "==", siteId)
            .get();

        const batch = db.batch();
        interestSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log("Interest records deleted");

        console.log("=== DELETE SUCCESSFUL ===");
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

        const siteId = req.body.siteId || req.params.siteId;

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
