import { EmailClient } from '@azure/communication-email';
import { app } from '@azure/functions';
import { availabilityContainer, usersContainer } from '../utils/db.js';

const emailClient = process.env.AZURE_COMMUNICATION_CONNECTION_STRING
    ? new EmailClient(process.env.AZURE_COMMUNICATION_CONNECTION_STRING)
    : null;

app.timer('dailyDigest', {
    // Run at 8:00 AM Sydney time (10:00 PM UTC previous day in winter, 11:00 PM UTC in summer)
    // Using 10:00 PM UTC to approximate AEST (Australia Eastern Standard Time)
    schedule: '0 0 22 * * *',
    handler: async (myTimer, context) => {
        try {
            context.log('Daily digest timer triggered');

            if (!emailClient) {
                context.log('Email client not configured - skipping digest');
                return;
            }

            // Get date 7 days from now (looking ahead)
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 7);
            const dateStr = targetDate.toISOString().split('T')[0];

            context.log(`Checking availability for ${dateStr} (7 days ahead)`);

            // Get all availability for the target date
            const { resources: availabilityRecords } = await availabilityContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.date = @date',
                    parameters: [{ name: '@date', value: dateStr }]
                })
                .fetchAll();

            const diverCount = availabilityRecords.length;
            context.log(`Found ${diverCount} divers available on ${dateStr}`);

            if (diverCount === 0) {
                context.log('No divers available - skipping notifications');
                return;
            }

            // Get operators who should be notified
            const { resources: operators } = await usersContainer.items
                .query({
                    query: `
						SELECT c.email, c.firstName, c.operatorNotificationThreshold
						FROM c 
						WHERE c.isOperator = true 
						AND c.operatorNotificationThreshold <= @count
					`,
                    parameters: [{ name: '@count', value: diverCount }]
                })
                .fetchAll();

            context.log(`Found ${operators.length} operators to notify`);

            if (operators.length === 0) {
                return;
            }

            // Get user IDs from availability
            const userIds = availabilityRecords.map(a => a.userId);

            // Get diver details
            const { resources: divers } = await usersContainer.items
                .query({
                    query: `
						SELECT c.firstName, c.lastName, c.maxDepth
						FROM c 
						WHERE ARRAY_CONTAINS(@userIds, c.userId)
						ORDER BY c.maxDepth DESC
					`,
                    parameters: [{ name: '@userIds', value: userIds }]
                })
                .fetchAll();

            // Format diver list for email
            const diverList = divers
                .map(d => `  • ${d.firstName} ${d.lastName} (${d.maxDepth}m)`)
                .join('\n');

            const formattedDate = new Date(dateStr).toLocaleDateString('en-AU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Australia/Sydney'
            });

            // Send emails to operators
            const emailPromises = operators.map(async (operator) => {
                const message = {
                    senderAddress: process.env.EMAIL_FROM || 'noreply@tech-dive.sydney',
                    content: {
                        subject: `${diverCount} divers available on ${formattedDate}`,
                        html: `
							<h2>Boat Finder Daily Digest</h2>
							<p>Hi ${operator.firstName},</p>
							<p><strong>${diverCount} tech divers</strong> have indicated availability for <strong>${formattedDate}</strong>.</p>
							<h3>Available Divers:</h3>
							<pre>${diverList}</pre>
							<p>
								<a href="https://tech-dive.sydney" style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
									View Calendar
								</a>
							</p>
							<hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
							<p style="font-size: 12px; color: #666;">
								You're receiving this because you're a boat operator and your notification threshold is ${operator.operatorNotificationThreshold} divers.
								<br />
								Update your preferences at <a href="https://tech-dive.sydney/profile">tech-dive.sydney/profile</a>
							</p>
						`
                    },
                    recipients: {
                        to: [{ address: operator.email }]
                    }
                };

                try {
                    const poller = await emailClient.beginSend(message);
                    await poller.pollUntilDone();
                    context.log(`Email sent to ${operator.email}`);
                } catch (error) {
                    context.error(`Failed to send email to ${operator.email}:`, error);
                }
            });

            await Promise.all(emailPromises);
            context.log('Daily digest completed');

        } catch (error) {
            context.error('Error in daily digest:', error);
        }
    }
});
