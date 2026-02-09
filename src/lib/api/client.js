const API_BASE = '/api';

/**
 * Generic API fetch wrapper
 * @param {string} endpoint 
 * @param {object} options 
 * @returns {Promise<any>}
 */
async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
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

    async getMyDates() {
        return apiFetch('/availability/my-dates');
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
