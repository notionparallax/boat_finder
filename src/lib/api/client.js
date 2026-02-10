import { getAuthToken } from '$lib/stores/auth';

const API_BASE = '/api';

/**
 * Generic API fetch wrapper
 * @param {string} endpoint 
 * @param {object} options 
 * @returns {Promise<any>}
 */
async function apiFetch(endpoint, options = {}) {
    // Get auth token if user is logged in
    const token = await getAuthToken();

    const url = `${API_BASE}${endpoint}`;
    console.log('API Request:', options.method || 'GET', url);

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers
        }
    });

    console.log('API Response:', response.status, response.statusText);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }

    const result = await response.json();
    console.log('API Result:', result);
    // Extract data from {success: true, data: ...} response format
    return result.data !== undefined ? result.data : result;
}

// User API
export const userApi = {
    async getMe() {
        return apiFetch('/users/me');
    },

    async updateProfile(data) {
        return apiFetch('/users/profile', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};

// Availability API
export const availabilityApi = {
    async getCalendar(startDate, endDate) {
        return apiFetch(`/availability/calendar?startDate=${startDate}&endDate=${endDate}`);
    },

    async getDayDetails(date, minDepth = null) {
        const query = minDepth ? `?minDepth=${minDepth}` : '';
        return apiFetch(`/availability/day/${date}${query}`);
    },

    async toggleAvailability(date) {
        return apiFetch('/availability/toggle', {
            method: 'POST',
            body: JSON.stringify({ date })
        });
    },

    async getMyDates(startDate, endDate) {
        return apiFetch(`/availability/my-dates?startDate=${startDate}&endDate=${endDate}`);
    }
};

// Sites API
export const sitesApi = {
    async getAll() {
        return apiFetch('/sites');
    },

    async getSite(siteId) {
        return apiFetch(`/sites/${siteId}`);
    },

    async getDivers(siteId) {
        return apiFetch(`/sites/${siteId}/divers`);
    },

    async createSite(data) {
        return apiFetch('/sites', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async toggleInterest(siteId) {
        return apiFetch(`/sites/${siteId}/interest`, {
            method: 'POST'
        });
    },

    async deleteSite(siteId) {
        return apiFetch(`/sites/${siteId}`, {
            method: 'DELETE'
        });
    }
};

// Admin API
export const adminApi = {
    async promoteOperator(userId) {
        return apiFetch('/adminapi/promote', {
            method: 'POST',
            body: JSON.stringify({ userId })
        });
    },

    async getUsers() {
        return apiFetch('/adminapi/users');
    }
};
