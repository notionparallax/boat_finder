import { app } from '@azure/functions';
import { availabilityContainer, createResponse, getUserFromRequest, usersContainer } from '../utils/db.js';

app.http('getCalendar', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'availability/calendar',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            const url = new URL(request.url);
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');

            if (!startDate || !endDate) {
                return { status: 400, jsonBody: { error: 'startDate and endDate are required' } };
            }

            // Get all availability records in date range
            const { resources: availabilityRecords } = await availabilityContainer.items
                .query({
                    query: `
						SELECT * FROM c 
						WHERE c.date >= @startDate 
						AND c.date <= @endDate
						ORDER BY c.date ASC
					`,
                    parameters: [
                        { name: '@startDate', value: startDate },
                        { name: '@endDate', value: endDate }
                    ]
                })
                .fetchAll();

            // Get all unique user IDs
            const userIds = [...new Set(availabilityRecords.map(a => a.userId))];

            // Get user details for all divers
            let users = [];
            if (userIds.length > 0) {
                const { resources: userRecords } = await usersContainer.items
                    .query({
                        query: `
							SELECT c.userId, c.firstName, c.lastName, c.maxDepth, c.phone 
							FROM c 
							WHERE ARRAY_CONTAINS(@userIds, c.userId)
						`,
                        parameters: [{ name: '@userIds', value: userIds }]
                    })
                    .fetchAll();
                users = userRecords;
            }

            // Group availability by date
            const calendar = {};
            for (const record of availabilityRecords) {
                if (!calendar[record.date]) {
                    calendar[record.date] = [];
                }

                const user = users.find(u => u.userId === record.userId);
                if (user) {
                    calendar[record.date].push({
                        userId: user.userId,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        maxDepth: user.maxDepth,
                        phone: user.phone
                    });
                }
            }

            return createResponse(true, calendar);
        } catch (error) {
            context.error('Error in getCalendar:', error);
            return createResponse(false, null, error.message);
        }
    }
});

app.http('getDayDetails', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'availability/{date}',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            const date = request.params.date;

            // Check if user is operator
            const { resources: currentUser } = await usersContainer.items
                .query({
                    query: 'SELECT c.isOperator FROM c WHERE c.userId = @userId',
                    parameters: [{ name: '@userId', value: authUser.userId }]
                })
                .fetchAll();

            if (currentUser.length === 0 || !currentUser[0].isOperator) {
                return { status: 403, jsonBody: { error: 'Operators only' } };
            }

            // Get all availability for this date
            const { resources: availabilityRecords } = await availabilityContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.date = @date',
                    parameters: [{ name: '@date', value: date }]
                })
                .fetchAll();

            if (availabilityRecords.length === 0) {
                return createResponse(true, { date, divers: [] });
            }

            const userIds = availabilityRecords.map(a => a.userId);

            // Get full user details
            const { resources: users } = await usersContainer.items
                .query({
                    query: `
						SELECT c.userId, c.firstName, c.lastName, c.email, c.phone, c.maxDepth, c.certLevel
						FROM c 
						WHERE ARRAY_CONTAINS(@userIds, c.userId)
					`,
                    parameters: [{ name: '@userIds', value: userIds }]
                })
                .fetchAll();

            const divers = users.map(user => ({
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                maxDepth: user.maxDepth,
                certLevel: user.certLevel
            }));

            return createResponse(true, { date, divers });
        } catch (error) {
            context.error('Error in getDayDetails:', error);
            return createResponse(false, null, error.message);
        }
    }
});

app.http('toggleAvailability', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'availability/toggle',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            const body = await request.json();
            const { date } = body;

            if (!date) {
                return { status: 400, jsonBody: { error: 'date is required' } };
            }

            // Check if availability exists
            const { resources: existing } = await availabilityContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.userId = @userId AND c.date = @date',
                    parameters: [
                        { name: '@userId', value: authUser.userId },
                        { name: '@date', value: date }
                    ]
                })
                .fetchAll();

            if (existing.length > 0) {
                // Remove availability
                await availabilityContainer.item(existing[0].id, authUser.userId).delete();
                return createResponse(true, { available: false, date });
            } else {
                // Add availability
                const record = {
                    id: crypto.randomUUID(),
                    userId: authUser.userId,
                    date: date,
                    createdAt: new Date().toISOString()
                };
                await availabilityContainer.items.create(record);

                // Check if this triggers operator notification threshold
                // Get count of divers for this date
                const { resources: dayAvailability } = await availabilityContainer.items
                    .query({
                        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.date = @date',
                        parameters: [{ name: '@date', value: date }]
                    })
                    .fetchAll();

                const diverCount = dayAvailability[0] || 0;

                // Get operators who want notifications at this threshold
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

                // TODO: Send email notifications to operators
                // For now, just log
                if (operators.length > 0) {
                    context.log(`${operators.length} operators should be notified about ${date} (${diverCount} divers)`);
                }

                return createResponse(true, { available: true, date });
            }
        } catch (error) {
            context.error('Error in toggleAvailability:', error);
            return createResponse(false, null, error.message);
        }
    }
});

app.http('getMyDates', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'availability/my-dates',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            const url = new URL(request.url);
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');

            if (!startDate || !endDate) {
                return { status: 400, jsonBody: { error: 'startDate and endDate are required' } };
            }

            // Get user's availability
            const { resources } = await availabilityContainer.items
                .query({
                    query: `
						SELECT c.date FROM c 
						WHERE c.userId = @userId 
						AND c.date >= @startDate 
						AND c.date <= @endDate
						ORDER BY c.date ASC
					`,
                    parameters: [
                        { name: '@userId', value: authUser.userId },
                        { name: '@startDate', value: startDate },
                        { name: '@endDate', value: endDate }
                    ]
                })
                .fetchAll();

            const dates = resources.map(r => r.date);
            return createResponse(true, dates);
        } catch (error) {
            context.error('Error in getMyDates:', error);
            return createResponse(false, null, error.message);
        }
    }
});
