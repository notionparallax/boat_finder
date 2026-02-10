import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// You'll need to get an auth token from the browser and paste it here
const AUTH_TOKEN = process.env.FIREBASE_TOKEN || 'PASTE_YOUR_TOKEN_HERE';
const API_URL = 'https://australia-southeast1-boat-finder-sydney.cloudfunctions.net/api';

async function parseCsv(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const dataLines = lines.slice(1).filter(line => line.trim());
    const sites = [];

    for (const line of dataLines) {
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

        const [wkt, name, generalType, specificType, lat, lon, depthMax, depthTop, summary] = fields;
        if (!name) continue;

        let depth = parseInt(depthMax);
        if (isNaN(depth) || depth === 0) {
            depth = parseInt(depthTop);
        }
        if (isNaN(depth) || depth === 0) {
            depth = 40;
        }

        let latitude = parseFloat(lat);
        let longitude = parseFloat(lon);
        if (isNaN(latitude)) latitude = null;
        if (isNaN(longitude)) longitude = null;

        sites.push({
            name: name,
            depth: depth,
            latitude: latitude,
            longitude: longitude,
            type: specificType || generalType || 'wreck',
            description: summary || ''
        });
    }

    return sites;
}

async function seedSites() {
    try {
        console.log('🚀 Starting dive sites seed...\n');

        const csvPath = path.join(__dirname, '..', 'Wreck locations- wrecks.csv.csv');
        console.log(`📄 Reading CSV from: ${csvPath}`);

        const sites = await parseCsv(csvPath);
        console.log(`✅ Parsed ${sites.length} dive sites from CSV\n`);

        if (AUTH_TOKEN === 'PASTE_YOUR_TOKEN_HERE') {
            console.log('❌ Please set FIREBASE_TOKEN environment variable');
            console.log('   Get your token from browser DevTools:');
            console.log('   1. Open https://boat-finder-sydney.web.app');
            console.log('   2. Open DevTools Console (F12)');
            console.log('   3. Run: (await firebase.auth().currentUser.getIdToken())');
            console.log('   4. Copy the token and run:');
            console.log('      $env:FIREBASE_TOKEN="your_token"; node scripts/seed-sites-simple.js\n');
            return;
        }

        console.log('💾 Inserting sites via API...');
        let successCount = 0;
        let errorCount = 0;

        for (const site of sites) {
            try {
                const response = await fetch(`${API_URL}/sites`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AUTH_TOKEN}`
                    },
                    body: JSON.stringify(site)
                });

                if (response.ok) {
                    successCount++;
                    process.stdout.write(`\r  Inserted: ${successCount}/${sites.length}`);
                } else {
                    errorCount++;
                    const error = await response.text();
                    console.error(`\n❌ Error for ${site.name}:`, error);
                }
            } catch (error) {
                errorCount++;
                console.error(`\n❌ Error for ${site.name}:`, error.message);
            }
        }

        console.log(`\n\n✅ Seed completed!`);
        console.log(`   Success: ${successCount}`);
        console.log(`   Errors: ${errorCount}`);
        console.log(`   Total: ${sites.length}\n`);

    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seedSites();
