import { CosmosClient } from '@azure/cosmos';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read connection string from environment
const connectionString = process.env.AZURE_COSMOS_CONNECTION_STRING;

if (!connectionString) {
    console.error('Error: AZURE_COSMOS_CONNECTION_STRING environment variable not set');
    console.log('Usage: AZURE_COSMOS_CONNECTION_STRING="..." node seed-sites.js');
    process.exit(1);
}

const client = new CosmosClient(connectionString);
const database = client.database('BoatFinderDB');
const container = database.container('DiveSites');

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
            id: siteId,
            siteId: siteId,
            name: name,
            depth: depth,
            latitude: latitude,
            longitude: longitude,
            type: specificType || generalType || 'wreck',
            description: summary || '',
            createdBy: 'system',
            createdAt: new Date().toISOString()
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
        const { resources: existing } = await container.items
            .query('SELECT VALUE COUNT(1) FROM c')
            .fetchAll();

        const existingCount = existing[0] || 0;
        console.log(`📊 Current sites in database: ${existingCount}`);

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
                const { resources: allSites } = await container.items
                    .query('SELECT c.id, c.siteId FROM c')
                    .fetchAll();

                for (const site of allSites) {
                    await container.item(site.id, site.siteId).delete();
                }
                console.log(`✅ Deleted ${allSites.length} existing sites\n`);
            }
        }

        // Insert sites
        console.log('💾 Inserting sites into Cosmos DB...');
        let successCount = 0;
        let errorCount = 0;

        for (const site of sites) {
            try {
                await container.items.create(site);
                successCount++;
                process.stdout.write(`\r  Inserted: ${successCount}/${sites.length}`);
            } catch (error) {
                errorCount++;
                console.error(`\n❌ Error inserting ${site.name}:`, error.message);
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
