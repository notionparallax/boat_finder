/**
 * Test script to preview what the daily digest email will look like
 * This simulates the scheduled function logic but sends to a test email
 */
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const fs = require("fs");
const path = require("path");

// Load .env file manually
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach(line => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length) {
            process.env[key.trim()] = valueParts.join("=").trim();
        }
    });
}

// Initialize Firebase Admin
admin.initializeApp({
    projectId: "boat-finder-sydney"
});

const db = admin.firestore();

async function testDigest() {
    try {
        console.log("Testing daily digest logic...\n");

        // Get test email from command line
        const testEmail = process.argv[2];
        if (!testEmail) {
            console.error("Usage: node test-digest.js YOUR_EMAIL@example.com [threshold]");
            process.exit(1);
        }

        const testThreshold = parseInt(process.argv[3]) || 2;
        console.log(`Using test threshold: ${testThreshold} divers\n`);

        // Initialize SendGrid
        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey) {
            console.error("ERROR: SENDGRID_API_KEY not found in .env file");
            process.exit(1);
        }
        sgMail.setApiKey(apiKey);

        // Calculate date ranges
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const today = now.toISOString().split("T")[0];
        const endDate = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
        const endDateStr = endDate.toISOString().split("T")[0];

        console.log(`Checking availability from ${today} to ${endDateStr}`);

        // Get all availability for next 3 weeks
        const availabilitySnapshot = await db
            .collection("availability")
            .where("date", ">=", today)
            .where("date", "<=", endDateStr)
            .get();

        console.log(`Found ${availabilitySnapshot.size} availability records\n`);

        if (availabilitySnapshot.empty) {
            console.log("No availability in next 3 weeks");
            return;
        }

        // Get all user IDs and fetch user details
        const userIds = [...new Set(availabilitySnapshot.docs.map((doc) => doc.data().userId))];
        const userPromises = userIds.map((uid) => db.collection("users").doc(uid).get());
        const userDocs = await Promise.all(userPromises);
        const usersMap = {};
        userDocs.forEach((doc) => {
            if (doc.exists) {
                const data = doc.data();
                usersMap[doc.id] = {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    maxDepth: data.maxDepth || 0,
                };
            }
        });

        // Group by date and track which dates had new additions today
        const dateGroups = {};
        const newTodayDates = new Set();

        availabilitySnapshot.forEach((doc) => {
            const record = doc.data();
            const date = record.date;

            if (!dateGroups[date]) {
                dateGroups[date] = [];
            }
            dateGroups[date].push(record.userId);

            // Check if this record was added in the last 24 hours
            const createdAt = record.createdAt?.toDate();
            if (createdAt && createdAt >= yesterday) {
                newTodayDates.add(date);
            }
        });

        console.log(`Found ${Object.keys(dateGroups).length} unique dates with availability`);
        console.log(`${newTodayDates.size} dates had new additions in last 24 hours\n`);

        // Find dates that meet test threshold
        const newDatesOverThreshold = [];
        const allDatesOverThreshold = [];

        for (const [date, userIds] of Object.entries(dateGroups)) {
            const count = userIds.length;
            if (count >= testThreshold) {
                const divers = userIds
                    .map((uid) => usersMap[uid])
                    .filter((u) => u)
                    .sort((a, b) => b.maxDepth - a.maxDepth);

                const dateInfo = {
                    date,
                    count,
                    divers,
                    formattedDate: new Date(date + "T00:00:00Z").toLocaleDateString("en-AU", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        timeZone: "Australia/Sydney",
                    }),
                };

                allDatesOverThreshold.push(dateInfo);

                if (newTodayDates.has(date)) {
                    newDatesOverThreshold.push(dateInfo);
                }
            }
        }

        console.log(`Dates meeting threshold of ${testThreshold}:`);
        console.log(`- New today: ${newDatesOverThreshold.length}`);
        console.log(`- Total upcoming: ${allDatesOverThreshold.length}\n`);

        if (allDatesOverThreshold.length === 0) {
            console.log("No dates meet threshold - no email would be sent");
            return;
        }

        // Sort by date
        allDatesOverThreshold.sort((a, b) => a.date.localeCompare(b.date));
        newDatesOverThreshold.sort((a, b) => a.date.localeCompare(b.date));

        // Build email HTML
        let emailHtml = `
            <h2>🚢 Boat Finder Daily Digest</h2>
            <p>Hi there,</p>
        `;

        // Section 1: New dates that crossed threshold today
        if (newDatesOverThreshold.length > 0) {
            emailHtml += `
                <h3>🆕 New Today (${newDatesOverThreshold.length} ${newDatesOverThreshold.length === 1 ? 'date' : 'dates'})</h3>
                <p>These dates just reached your threshold of ${testThreshold} divers:</p>
            `;
            newDatesOverThreshold.forEach((dateInfo) => {
                const diverList = dateInfo.divers
                    .map((d) => `${d.firstName} ${d.lastName} (${d.maxDepth}m)`)
                    .join(", ");
                emailHtml += `
                    <div style="margin: 15px 0; padding: 10px; background: #f0f8ff; border-left: 4px solid #0066cc;">
                        <strong>${dateInfo.formattedDate}</strong> - ${dateInfo.count} divers<br/>
                        <span style="font-size: 14px; color: #666;">${diverList}</span>
                    </div>
                `;
            });
        }

        // Section 2: All upcoming dates over threshold
        emailHtml += `
            <h3>📅 All Upcoming Dates (Next 3 Weeks)</h3>
            <p>${allDatesOverThreshold.length} ${allDatesOverThreshold.length === 1 ? 'date has' : 'dates have'} ${testThreshold}+ divers:</p>
        `;
        allDatesOverThreshold.forEach((dateInfo) => {
            const diverList = dateInfo.divers
                .map((d) => `${d.firstName} ${d.lastName} (${d.maxDepth}m)`)
                .join(", ");
            emailHtml += `
                <div style="margin: 10px 0; padding: 8px; background: #f9f9f9; border-left: 3px solid #999;">
                    <strong>${dateInfo.formattedDate}</strong> - ${dateInfo.count} divers<br/>
                    <span style="font-size: 14px; color: #666;">${diverList}</span>
                </div>
            `;
        });

        emailHtml += `
            <p style="margin-top: 20px;">
                <a href="https://tech-dive.sydney" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
                    View Full Calendar
                </a>
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="font-size: 12px; color: #666;">
                You're receiving this because you're a boat operator and your notification threshold is ${testThreshold} ${testThreshold === 1 ? 'diver' : 'divers'}.
                <br />
                Update your preferences at <a href="https://tech-dive.sydney/profile">tech-dive.sydney/profile</a>
            </p>
        `;

        // Send test email
        const msg = {
            to: testEmail,
            from: process.env.EMAIL_FROM || "ben@tech-dive.sydney",
            replyTo: "ben@tech-dive.sydney",
            subject: `[TEST] Boat Finder: ${allDatesOverThreshold.length} dates with ${testThreshold}+ divers`,
            html: emailHtml,
        };

        console.log(`Sending test email to ${testEmail}...`);
        await sgMail.send(msg);
        console.log("✅ Test email sent successfully!");
        
    } catch (error) {
        console.error("❌ Error:", error);
        if (error.response) {
            console.error(error.response.body);
        }
    } finally {
        process.exit(0);
    }
}

testDigest();
