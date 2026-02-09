import { app } from '@azure/functions';
import { createResponse, getUserFromRequest, usersContainer } from '../utils/db.js';

app.http('getMe', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'users/me',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            // Query user from database
            const { resources } = await usersContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.userId = @userId',
                    parameters: [{ name: '@userId', value: authUser.userId }]
                })
                .fetchAll();

            if (resources.length === 0) {
                return { status: 404, jsonBody: { error: 'User not found' } };
            }

            return createResponse(true, resources[0]);
        } catch (error) {
            context.error('Error in getMe:', error);
            return createResponse(false, null, error.message);
        }
    }
});

app.http('updateProfile', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'users/profile',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            const body = await request.json();

            // Get existing user
            const { resources } = await usersContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.userId = @userId',
                    parameters: [{ name: '@userId', value: authUser.userId }]
                })
                .fetchAll();

            let user;
            if (resources.length === 0) {
                // Create new user
                user = {
                    id: crypto.randomUUID(),
                    userId: authUser.userId,
                    email: authUser.userDetails || '',
                    firstName: body.firstName || '',
                    lastName: body.lastName || '',
                    phone: body.phone || '',
                    certLevel: body.certLevel || '',
                    maxDepth: body.maxDepth || 0,
                    photoUrl: null,
                    isOperator: false,
                    operatorNotificationThreshold: null,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                await usersContainer.items.create(user);

                // Send admin notification email
                // TODO: Implement email notification when domain is configured

            } else {
                // Update existing user
                user = resources[0];
                user.phone = body.phone || user.phone;
                user.certLevel = body.certLevel || user.certLevel;
                user.maxDepth = body.maxDepth || user.maxDepth;
                user.operatorNotificationThreshold = body.operatorNotificationThreshold || user.operatorNotificationThreshold;
                user.lastLogin = new Date().toISOString();

                await usersContainer.item(user.id, user.userId).replace(user);
            }

            return createResponse(true, user);
        } catch (error) {
            context.error('Error in updateProfile:', error);
            return createResponse(false, null, error.message);
        }
    }
});
