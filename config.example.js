/**
 * GPS Admin Configuration
 *
 * INSTRUCTIONS:
 * 1. Copy this file to 'config.local.js'
 * 2. Fill in your actual API credentials
 * 3. NEVER commit config.local.js to git (it's in .gitignore)
 *
 * For production deployment, use environment variables or your hosting platform's
 * secrets management instead of this file.
 */

window.GPSConfig = {
    // Google Calendar OAuth 2.0 Client ID
    // Get this from: https://console.cloud.google.com/apis/credentials
    // For client-side apps, you DON'T need the client secret
    calendar: {
        clientId: 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com',
        // NOTE: Client Secret is NOT needed for client-side OAuth
        // Only use it if you build a backend server component
    },

    // Google Maps API Key (optional, for travel time calculations)
    // Get this from: https://console.cloud.google.com/google/maps-apis/credentials
    maps: {
        apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    },

    // Application Settings
    app: {
        // Use mock data if APIs aren't configured
        useMockData: true,

        // Development mode
        debug: true,
    }
};
