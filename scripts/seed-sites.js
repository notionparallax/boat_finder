import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'boat-finder-sydney',
});

const db = getFirestore();

async function parseCsv(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Skip header row
    const dataLines = lines.slice(1).filter(line => line.trim());

    const sites = [];

    for (const line of dataLines) {
        // Parse CSV - handle quoted fields
        const fields = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField.trim());

        const [wkt, name, generalType, specificType, lat, lon, depthMax, depthTop, summary, sourceUrl, coordinateSource] = fields;

        // Skip if no name
        if (!name) continue;

        // Parse depth - use depthMax, fallback to depthTop
        let depth = parseInt(depthMax);
        if (isNaN(depth) || depth === 0) {
            depth = parseInt(depthTop);
        }
        if (isNaN(depth) || depth === 0) {
            depth = 40; // Default depth for sites with missing data
        }

        // Parse coordinates
        let latitude = parseFloat(lat);
        let longitude = parseFloat(lon);

        // Handle missing coordinates
        if (isNaN(latitude)) latitude = null;
        if (isNaN(longitude)) longitude = null;

        const siteId = crypto.randomUUID();

        sites.push({
            name: name,
            nameLower: name.toLowerCase(),
            depth: depth,
            latitude: latitude,
            longitude: longitude,
            type: specificType || generalType || 'wreck',
            description: summary || '',
            createdBy: 'system',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    return sites;
}

async function seedSites() {
    try {
        console.log('🚀 Starting dive sites seed...\n');

        // Parse CSV
        const csvPath = path.join(__dirname, '..', 'Wreck locations- wrecks.csv.csv');
        console.log(`📄 Reading CSV from: ${csvPath}`);

        const sites = await parseCsv(csvPath);
        console.log(`✅ Parsed ${sites.length} dive sites from CSV\n`);

        // Check if sites already exist
        const existingSnapshot = await db.collection('diveSites').limit(1).get();
        const existingCount = existingSnapshot.size;

        console.log(`📊 Current sites in database: ${existingCount > 0 ? 'some exist' : '0'}`);

        if (existingCount > 0) {
            console.log('\n⚠️  Sites already exist in database.');
            console.log('Do you want to:');
            console.log('  1. Skip seeding (default)');
            console.log('  2. Add new sites anyway (may create duplicates)');
            console.log('  3. Clear existing and reseed');
            console.log('\nTo proceed, re-run with: SEED_ACTION=add or SEED_ACTION=clear');

            const action = process.env.SEED_ACTION;
            if (!action || action === 'skip') {
                console.log('Skipping seed.');
                return;
            }

            if (action === 'clear') {
                console.log('\n🗑️  Clearing existing sites...');
                const allSites = await db.collection('diveSites').get();
                const batch = db.batch();
                allSites.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`✅ Deleted ${allSites.size} existing sites\n`);
            }
        }

        // Insert sites using batch writes (Firestore limit: 500 per batch)
        console.log('💾 Inserting sites into Firestore...');
        let successCount = 0;
        let errorCount = 0;

        const batchSize = 500;
        for (let i = 0; i < sites.length; i += batchSize) {
            const batch = db.batch();
            const chunk = sites.slice(i, i + batchSize);

            chunk.forEach(site => {
                const docRef = db.collection('diveSites').doc();
                batch.set(docRef, site);
            });

            try {
                await batch.commit();
                successCount += chunk.length;
                process.stdout.write(`\r  Inserted: ${successCount}/${sites.length}`);
            } catch (error) {
                errorCount += chunk.length;
                console.error(`\n❌ Error inserting batch:`, error.message);
            }
        }

        console.log(`\n\n✅ Seed completed!`);
        console.log(`   Success: ${successCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log(`   Total: ${sites.length}\n`);

        // Sample output
        console.log('📋 Sample sites:');
        sites.slice(0, 5).forEach(site => {
            console.log(`   • ${site.name} (${site.depth}m)`);
        });

    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seedSites();
