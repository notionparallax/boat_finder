import { auth } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { writable } from 'svelte/store';

export const user = writable(null);
export const authLoading = writable(true);

// Listen to Firebase auth state changes
onAuthStateChanged(auth, async (firebaseUser) => {
    console.log('Auth state changed:', firebaseUser ? `Logged in as ${firebaseUser.email}` : 'Logged out');

    if (firebaseUser) {
        // User is signed in - fetch full profile from API
        try {
            const token = await firebaseUser.getIdToken();
            console.log('Fetching user profile from /api/users/me...');

            const response = await fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('API response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('User profile loaded:', result.data);
                user.set(result.data);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch user profile:', response.status, errorText);
                user.set(null);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
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
