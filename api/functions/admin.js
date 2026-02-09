import { app } from '@azure/functions';
import { createResponse, getUserFromRequest, usersContainer } from '../utils/db.js';

app.http('promoteOperator', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'adminapi/promote',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            // Check if current user is admin
            const { resources: currentUser } = await usersContainer.items
                .query({
                    query: 'SELECT c.email FROM c WHERE c.userId = @userId',
                    parameters: [{ name: '@userId', value: authUser.userId }]
                })
                .fetchAll();

            if (currentUser.length === 0 || currentUser[0].email !== 'ben@notionparallax.co.uk') {
                return { status: 403, jsonBody: { error: 'Admin access required' } };
            }

            const body = await request.json();
            const { userId } = body;

            if (!userId) {
                return { status: 400, jsonBody: { error: 'userId is required' } };
            }

            // Get target user
            const { resources: targetUsers } = await usersContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.userId = @userId',
                    parameters: [{ name: '@userId', value: userId }]
                })
                .fetchAll();

            if (targetUsers.length === 0) {
                return { status: 404, jsonBody: { error: 'User not found' } };
            }

            const targetUser = targetUsers[0];

            if (targetUser.isOperator) {
                return { status: 400, jsonBody: { error: 'User is already an operator' } };
            }

            // Promote to operator
            targetUser.isOperator = true;
            targetUser.operatorNotificationThreshold = 3; // Default threshold
            await usersContainer.item(targetUser.id, targetUser.userId).replace(targetUser);

            context.log(`User ${targetUser.email} promoted to operator by ${currentUser[0].email}`);

            return createResponse(true, {
                userId: targetUser.userId,
                email: targetUser.email,
                isOperator: true
            });
        } catch (error) {
            context.error('Error in promoteOperator:', error);
            return createResponse(false, null, error.message);
        }
    }
});

app.http('getUsers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'adminapi/users',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            // Check if current user is admin
            const { resources: currentUser } = await usersContainer.items
                .query({
                    query: 'SELECT c.email FROM c WHERE c.userId = @userId',
                    parameters: [{ name: '@userId', value: authUser.userId }]
                })
                .fetchAll();

            if (currentUser.length === 0 || currentUser[0].email !== 'ben@notionparallax.co.uk') {
                return { status: 403, jsonBody: { error: 'Admin access required' } };
            }

            const url = new URL(request.url);
            const search = url.searchParams.get('search');

            let query = 'SELECT c.userId, c.email, c.firstName, c.lastName, c.isOperator, c.createdAt, c.lastLogin FROM c';
            let parameters = [];

            if (search) {
                query += ` WHERE CONTAINS(LOWER(c.firstName), LOWER(@search)) 
				          OR CONTAINS(LOWER(c.lastName), LOWER(@search)) 
				          OR CONTAINS(LOWER(c.email), LOWER(@search))`;
                parameters.push({ name: '@search', value: search });
            }

            query += ' ORDER BY c.createdAt DESC';

            const { resources: users } = await usersContainer.items
                .query({ query, parameters })
                .fetchAll();

            return createResponse(true, users);
        } catch (error) {
            context.error('Error in getUsers:', error);
            return createResponse(false, null, error.message);
        }
    }
});
