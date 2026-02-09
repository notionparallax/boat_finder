import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient(process.env.AZURE_COSMOS_CONNECTION_STRING);
const database = client.database('BoatFinderDB');

export const usersContainer = database.container('Users');
export const availabilityContainer = database.container('Availability');
export const sitesContainer = database.container('DiveSites');
export const siteInterestContainer = database.container('SiteInterest');

/**
 * Get user from request headers (Azure Static Web Apps auth)
 * @param {object} request 
 * @returns {object|null}
 */
export function getUserFromRequest(request) {
    const clientPrincipal = request.headers.get('x-ms-client-principal');
    if (!clientPrincipal) {
        return null;
    }

    const encoded = Buffer.from(clientPrincipal, 'base64');
    const decoded = JSON.parse(encoded.toString('ascii'));

    return {
        userId: decoded.userId,
        userDetails: decoded.userDetails,
        identityProvider: decoded.identityProvider,
        userRoles: decoded.userRoles
    };
}

/**
 * Create standard API response
 * @param {boolean} success 
 * @param {any} data 
 * @param {string} error 
 * @returns {object}
 */
export function createResponse(success, data = null, error = null) {
    return {
        status: success ? 200 : 400,
        jsonBody: {
            success,
            data,
            error
        }
    };
}
