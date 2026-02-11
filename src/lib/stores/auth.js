import { auth } from '$lib/firebase';
import { logger } from '$lib/utils/logger';
import { onAuthStateChanged } from 'firebase/auth';
import { writable } from 'svelte/store';

export const user = writable(null);
export const authLoading = writable(true);

// Listen to Firebase auth state changes
onAuthStateChanged(auth, async (firebaseUser) => {
    logger.log('Auth state changed:', firebaseUser ? `Logged in as ${firebaseUser.email}` : 'Logged out');

    if (firebaseUser) {
        // User is signed in - fetch full profile from API
        try {
            const token = await firebaseUser.getIdToken();
            logger.log('Fetching user profile from /api/users/me...');

            const response = await fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            logger.log('API response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                logger.log('User profile loaded:', result.data);
                user.set(result.data);
            } else {
                const errorText = await response.text();
                logger.error('Failed to fetch user profile:', response.status, errorText);
                user.set(null);
            }
        } catch (error) {
            logger.error('Error fetching user profile:', error);
            user.set(null);
        }
    } else {
        // User is signed out
        user.set(null);
    }
    authLoading.set(false);
});

// Helper function to get current auth token
export async function getAuthToken() {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken();
}

// Helper function to manually refresh user profile
export async function refreshUserProfile() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
        user.set(null);
        return;
    }

    try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch('/api/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            logger.log('User profile refreshed:', result.data);
            user.set(result.data);
        }
    } catch (error) {
        logger.error('Error refreshing user profile:', error);
    }
}
