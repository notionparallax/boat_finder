import { app } from '@azure/functions';
import { createResponse, getUserFromRequest, siteInterestContainer, sitesContainer, usersContainer } from '../utils/db.js';

app.http('getAllSites', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'sites',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            // Get all sites
            const { resources: sites } = await sitesContainer.items
                .query('SELECT * FROM c ORDER BY c.name ASC')
                .fetchAll();

            if (sites.length === 0) {
                return createResponse(true, []);
            }

            // Get user's interests
            const { resources: userInterests } = await siteInterestContainer.items
                .query({
                    query: 'SELECT c.siteId FROM c WHERE c.userId = @userId',
                    parameters: [{ name: '@userId', value: authUser.userId }]
                })
                .fetchAll();

            const interestedSiteIds = new Set(userInterests.map(i => i.siteId));

            const siteIds = sites.map(site => site.siteId);

            // Get all interests for the returned sites in one query
            const { resources: siteInterests } = await siteInterestContainer.items
                .query({
                    query: `
                        SELECT c.siteId, c.userId
                        FROM c
                        WHERE ARRAY_CONTAINS(@siteIds, c.siteId)
                    `,
                    parameters: [{ name: '@siteIds', value: siteIds }]
                })
                .fetchAll();

            const uniqueUserIds = [...new Set(siteInterests.map(interest => interest.userId))];

            let usersById = new Map();
            if (uniqueUserIds.length > 0) {
                const { resources: users } = await usersContainer.items
                    .query({
                        query: `
                            SELECT c.userId, c.firstName, c.lastName, c.maxDepth, c.photoURL
                            FROM c
                            WHERE ARRAY_CONTAINS(@userIds, c.userId)
                        `,
                        parameters: [{ name: '@userIds', value: uniqueUserIds }]
                    })
                    .fetchAll();

                usersById = new Map(
                    users.map(user => [
                        user.userId,
                        {
                            ...user,
                            displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        }
                    ])
                );
            }

            const siteDiversMap = new Map();
            for (const interest of siteInterests) {
                const diver = usersById.get(interest.userId);
                if (!diver) continue;

                if (!siteDiversMap.has(interest.siteId)) {
                    siteDiversMap.set(interest.siteId, []);
                }

                siteDiversMap.get(interest.siteId).push(diver);
            }

            // Add isInterested flag to each site
            const sitesWithInterest = sites.map(site => ({
                ...site,
                isInterested: interestedSiteIds.has(site.siteId),
                interestedDivers: (siteDiversMap.get(site.siteId) || [])
                    .slice()
                    .sort((a, b) => (b.maxDepth || 0) - (a.maxDepth || 0))
            }));

            return createResponse(true, sitesWithInterest);
        } catch (error) {
            context.error('Error in getAllSites:', error);
            return createResponse(false, null, error.message);
        }
    }
});

app.http('getSite', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'sites/{siteId}',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            const siteId = request.params.siteId;

            // Get site
            const { resources: sites } = await sitesContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.siteId = @siteId',
                    parameters: [{ name: '@siteId', value: siteId }]
                })
                .fetchAll();

            if (sites.length === 0) {
                return { status: 404, jsonBody: { error: 'Site not found' } };
            }

            return createResponse(true, sites[0]);
        } catch (error) {
            context.error('Error in getSite:', error);
            return createResponse(false, null, error.message);
        }
    }
});

app.http('getSiteDivers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'sites/{siteId}/divers',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            const siteId = request.params.siteId;

            // Get all users interested in this site
            const { resources: interests } = await siteInterestContainer.items
                .query({
                    query: 'SELECT c.userId FROM c WHERE c.siteId = @siteId',
                    parameters: [{ name: '@siteId', value: siteId }]
                })
                .fetchAll();

            if (interests.length === 0) {
                return createResponse(true, []);
            }

            const userIds = interests.map(i => i.userId);

            // Get user details
            const { resources: users } = await usersContainer.items
                .query({
                    query: `
						SELECT c.userId, c.firstName, c.lastName, c.maxDepth
						FROM c 
						WHERE ARRAY_CONTAINS(@userIds, c.userId)
						ORDER BY c.maxDepth DESC
					`,
                    parameters: [{ name: '@userIds', value: userIds }]
                })
                .fetchAll();

            return createResponse(true, users);
        } catch (error) {
            context.error('Error in getSiteDivers:', error);
            return createResponse(false, null, error.message);
        }
    }
});

app.http('createSite', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'sites',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            const body = await request.json();
            const { name, depth, latitude, longitude } = body;

            if (!name || !depth) {
                return { status: 400, jsonBody: { error: 'name and depth are required' } };
            }

            // Check if site with same name exists
            const { resources: existing } = await sitesContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE LOWER(c.name) = LOWER(@name)',
                    parameters: [{ name: '@name', value: name }]
                })
                .fetchAll();

            if (existing.length > 0) {
                return { status: 400, jsonBody: { error: 'Site with this name already exists' } };
            }

            const siteId = crypto.randomUUID();
            const site = {
                id: siteId,
                siteId: siteId,
                name: name.trim(),
                depth: parseInt(depth),
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                createdBy: authUser.userId,
                createdAt: new Date().toISOString()
            };

            await sitesContainer.items.create(site);
            return createResponse(true, site);
        } catch (error) {
            context.error('Error in createSite:', error);
            return createResponse(false, null, error.message);
        }
    }
});

app.http('toggleSiteInterest', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'sites/{siteId}/interest',
    handler: async (request, context) => {
        try {
            const authUser = getUserFromRequest(request);
            if (!authUser) {
                return { status: 401, jsonBody: { error: 'Unauthorized' } };
            }

            const siteId = request.params.siteId;

            // Verify site exists
            const { resources: sites } = await sitesContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.siteId = @siteId',
                    parameters: [{ name: '@siteId', value: siteId }]
                })
                .fetchAll();

            if (sites.length === 0) {
                return { status: 404, jsonBody: { error: 'Site not found' } };
            }

            // Check if interest exists
            const { resources: existing } = await siteInterestContainer.items
                .query({
                    query: 'SELECT * FROM c WHERE c.userId = @userId AND c.siteId = @siteId',
                    parameters: [
                        { name: '@userId', value: authUser.userId },
                        { name: '@siteId', value: siteId }
                    ]
                })
                .fetchAll();

            if (existing.length > 0) {
                // Remove interest
                await siteInterestContainer.item(existing[0].id, siteId).delete();
                return createResponse(true, { interested: false, siteId });
            } else {
                // Add interest
                const interest = {
                    id: crypto.randomUUID(),
                    userId: authUser.userId,
                    siteId: siteId,
                    createdAt: new Date().toISOString()
                };
                await siteInterestContainer.items.create(interest);
                return createResponse(true, { interested: true, siteId });
            }
        } catch (error) {
            context.error('Error in toggleSiteInterest:', error);
            return createResponse(false, null, error.message);
        }
    }
});
