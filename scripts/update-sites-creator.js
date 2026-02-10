const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../boat-finder-sydney-firebase-adminsdk-8epev-8d85ab6dcc.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Your Firebase user ID
const USER_ID = 'YOUR_USER_ID_HERE'; // Replace with your actual UID

async function updateSitesCreator() {
    try {
        console.log(`Updating all sites to set createdBy to: ${USER_ID}`);

        // Get all sites
        const sitesSnapshot = await db.collection('diveSites').get();

        console.log(`Found ${sitesSnapshot.size} sites to update`);

        // Update in batches (Firestore limit is 500 per batch)
        const batchSize = 500;
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;

        for (const doc of sitesSnapshot.docs) {
            const site = doc.data();

            // Only update if createdBy is missing or null
            if (!site.createdBy) {
                batch.update(doc.ref, {
                    createdBy: USER_ID,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                count++;
                batchCount++;

                // Commit batch when it reaches 500
                if (batchCount === batchSize) {
                    await batch.commit();
                    console.log(`Committed batch of ${batchCount} updates (total: ${count})`);
                    batch = db.batch();
                    batchCount = 0;
                }
            }
        }

        // Commit remaining updates
        if (batchCount > 0) {
            await batch.commit();
            console.log(`Committed final batch of ${batchCount} updates`);
        }

        console.log(`✓ Successfully updated ${count} sites`);

        // Verify
        const verifySnapshot = await db.collection('diveSites')
            .where('createdBy', '==', USER_ID)
            .get();

        console.log(`Verification: ${verifySnapshot.size} sites now have createdBy = ${USER_ID}`);

    } catch (error) {
        console.error('Error updating sites:', error);
        process.exit(1);
    }

    process.exit(0);
}

updateSitesCreator();
