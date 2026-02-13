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

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.EMAIL_FROM || "ben@tech-dive.sydney";

if (!apiKey) {
    console.error("ERROR: SENDGRID_API_KEY not found in .env file");
    process.exit(1);
}

// Get recipient email from command line argument
const toEmail = process.argv[2];

if (!toEmail) {
    console.error("Usage: node test-sendgrid.js YOUR_EMAIL@example.com");
    process.exit(1);
}

sgMail.setApiKey(apiKey);

const msg = {
    to: toEmail,
    from: fromEmail,
    replyTo: "ben@tech-dive.sydney",
    subject: "Test Email from Boat Finder",
    html: `
        <h2>🚢 SendGrid Test Email</h2>
        <p>Hi there!</p>
        <p>This is a test email to confirm that SendGrid is working correctly for the Boat Finder application.</p>
        <p>If you're reading this, everything is set up properly! 🎉</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #666;">
            Sent at: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
        </p>
    `,
};

console.log(`Sending test email to ${toEmail} from ${fromEmail}...`);

sgMail
    .send(msg)
    .then(() => {
        console.log("✅ Email sent successfully!");
    })
    .catch((error) => {
        console.error("❌ Failed to send email:");
        console.error(error.response ? error.response.body : error);
    });
