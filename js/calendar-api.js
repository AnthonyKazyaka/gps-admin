/**
 * Google Calendar API Integration
 * Handles authentication and calendar data synchronization
 * Version: 2.0 - Fixed GIS initialization race condition
 */

class CalendarAPI {
    constructor(clientId) {
        this.clientId = clientId;
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.version = '2.1';
        this.tokenStorageKey = 'gpsAdmin_googleToken';
        
        // Load saved token from localStorage
        this.accessToken = this.loadToken();
        
        console.log(`📦 CalendarAPI v${this.version} constructed`);
        if (this.accessToken) {
            console.log('🔑 Found saved access token');
        }
    }

    /**
     * Save access token to localStorage
     * @param {string} token - Access token
     * @param {number} expiresIn - Token expiry in seconds (default 3600 = 1 hour)
     */
    saveToken(token, expiresIn = 3600) {
        const tokenData = {
            token: token,
            expiresAt: Date.now() + (expiresIn * 1000)
        };
        try {
            localStorage.setItem(this.tokenStorageKey, JSON.stringify(tokenData));
            console.log('💾 Access token saved to localStorage');
        } catch (error) {
            console.error('Failed to save token:', error);
        }
    }

    /**
     * Load access token from localStorage
     * @returns {string|null} Access token or null if expired/missing
     */
    loadToken() {
        try {
            const stored = localStorage.getItem(this.tokenStorageKey);
            if (!stored) return null;

            const tokenData = JSON.parse(stored);
            
            // Check if token is expired
            if (Date.now() > tokenData.expiresAt) {
                console.log('⚠️ Saved token expired, clearing...');
                this.clearToken();
                return null;
            }

            return tokenData.token;
        } catch (error) {
            console.error('Failed to load token:', error);
            return null;
        }
    }

    /**
     * Clear saved token from localStorage
     */
    clearToken() {
        try {
            localStorage.removeItem(this.tokenStorageKey);
            console.log('🗑️ Token cleared from localStorage');
        } catch (error) {
            console.error('Failed to clear token:', error);
        }
    }

    /**
     * Initialize Google API libraries
     */
    async init() {
        try {
            console.log('📦 Loading Google API libraries...');
            
            // Load Google API libraries
            await this.loadGoogleAPIs();
            console.log('✅ Google API scripts loaded');

            // Initialize GAPI client
            await this.initializeGapiClient();
            console.log('✅ GAPI client initialized');

            // Initialize Google Identity Services
            await this.initializeGIS();
            console.log('✅ Google Identity Services initialized');

            console.log('✅ Calendar API fully initialized');
            return true;
        } catch (error) {
            console.error('❌ Error initializing Calendar API:', error);
            return false;
        }
    }

    /**
     * Load Google API scripts
     */
    loadGoogleAPIs() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
                resolve();
                return;
            }

            // Load GAPI
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.onload = () => {
                // Load GIS
                const gisScript = document.createElement('script');
                gisScript.src = 'https://accounts.google.com/gsi/client';
                gisScript.onload = resolve;
                gisScript.onerror = reject;
                document.head.appendChild(gisScript);
            };
            gapiScript.onerror = reject;
            document.head.appendChild(gapiScript);
        });
    }

    /**
     * Initialize GAPI client
     */
    async initializeGapiClient() {
        await new Promise((resolve) => gapi.load('client', resolve));

        await gapi.client.init({
            // No API key needed for OAuth 2.0 authentication
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });

        this.gapiInited = true;
    }

    /**
     * Initialize Google Identity Services
     */
    initializeGIS() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max (50 * 100ms)
            
            // Wait for google.accounts to be available
            const checkGIS = () => {
                if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
                    try {
                        this.tokenClient = google.accounts.oauth2.initTokenClient({
                            client_id: this.clientId,
                            scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
                            callback: (response) => {
                                if (response.error !== undefined) {
                                    throw response;
                                }
                                this.accessToken = response.access_token;
                                console.log('✅ Authenticated with Google Calendar');
                            },
                        });

                        this.gisInited = true;
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        reject(new Error('Timeout waiting for Google Identity Services to load'));
                        return;
                    }
                    // Check again in 100ms
                    setTimeout(checkGIS, 100);
                }
            };
            
            checkGIS();
        });
    }

    /**
     * Authenticate user with Google
     */
    async authenticate() {
        console.log('🔐 Starting OAuth authentication...');
        console.log(`   Version: ${this.version}`);
        console.log(`   gapiInited: ${this.gapiInited}`);
        console.log(`   gisInited: ${this.gisInited}`);
        console.log(`   tokenClient: ${this.tokenClient ? 'initialized' : 'NULL'}`);
        
        return new Promise((resolve, reject) => {
            if (!this.gapiInited) {
                console.error('❌ GAPI client not initialized');
                reject(new Error('GAPI client not initialized'));
                return;
            }
            
            if (!this.gisInited) {
                console.error('❌ Google Identity Services not initialized');
                reject(new Error('Google Identity Services not initialized'));
                return;
            }
            
            if (!this.tokenClient) {
                console.error('❌ Token client not initialized');
                reject(new Error('Token client not initialized'));
                return;
            }

            this.tokenClient.callback = (response) => {
                if (response.error !== undefined) {
                    console.error('❌ OAuth error:', response);
                    reject(response);
                    return;
                }
                this.accessToken = response.access_token;
                // Save token with expiry
                this.saveToken(response.access_token, response.expires_in || 3600);
                console.log('✅ OAuth authentication successful');
                resolve(response);
            };

            // Check if we have a saved token
            if (this.accessToken) {
                console.log('🔑 Restoring saved token to GAPI...');
                gapi.client.setToken({ access_token: this.accessToken });
                console.log('✅ Using existing saved token');
                resolve({ access_token: this.accessToken });
            } else {
                console.log('🔑 Requesting new access token...');
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            }
        });
    }

    /**
     * Sign out
     */
    signOut() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }
        this.accessToken = null;
        this.clearToken();
        console.log('👋 Signed out and cleared saved token');
    }

    /**
     * Get list of calendars
     */
    async listCalendars() {
        try {
            const response = await gapi.client.calendar.calendarList.list({
                maxResults: 50,
                showHidden: false,
            });

            return response.result.items.map(calendar => ({
                id: calendar.id,
                name: calendar.summary,
                description: calendar.description,
                primary: calendar.primary || false,
                backgroundColor: calendar.backgroundColor,
                foregroundColor: calendar.foregroundColor,
                selected: calendar.selected,
            }));
        } catch (error) {
            console.error('Error fetching calendars:', error);
            throw error;
        }
    }

    /**
     * Fetch events from calendar
     * @param {string} calendarId - Calendar ID (default: 'primary')
     * @param {Date} timeMin - Start date/time
     * @param {Date} timeMax - End date/time
     * @param {string} calendarName - Calendar name for labeling
     * @returns {Array} Events
     */
    async fetchEvents(calendarId = 'primary', timeMin = null, timeMax = null, calendarName = null) {
        try {
            // Default to current month if no range specified
            if (!timeMin) {
                timeMin = new Date();
                timeMin.setDate(1);
                timeMin.setHours(0, 0, 0, 0);
            }

            if (!timeMax) {
                timeMax = new Date(timeMin);
                timeMax.setMonth(timeMax.getMonth() + 1);
            }

            const response = await gapi.client.calendar.events.list({
                calendarId: calendarId,
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                showDeleted: false,
                singleEvents: true,
                maxResults: 2500,
                orderBy: 'startTime',
            });

            return response.result.items.map(event =>
                this.parseEvent(event, calendarId, calendarName)
            );
        } catch (error) {
            console.error('Error fetching events:', error);
            throw error;
        }
    }

    /**
     * Parse Google Calendar event to our format
     * @param {Object} gcalEvent - Google Calendar event
     * @param {string} calendarId - Calendar ID
     * @param {string} calendarName - Calendar name
     */
    parseEvent(gcalEvent, calendarId = null, calendarName = null) {
        // Handle all-day events with proper timezone handling
        // All-day events use date (not dateTime) and should be treated as local midnight
        let start, end;
        const isAllDay = !gcalEvent.start.dateTime;

        if (isAllDay) {
            // For all-day events, parse the date in local timezone
            // Google Calendar sends date in YYYY-MM-DD format
            const startDateParts = gcalEvent.start.date.split('-');
            start = new Date(
                parseInt(startDateParts[0]),
                parseInt(startDateParts[1]) - 1, // Month is 0-indexed
                parseInt(startDateParts[2]),
                0, 0, 0, 0
            );

            const endDateParts = gcalEvent.end.date.split('-');
            end = new Date(
                parseInt(endDateParts[0]),
                parseInt(endDateParts[1]) - 1,
                parseInt(endDateParts[2]),
                0, 0, 0, 0
            );
        } else {
            // For timed events, use the provided dateTime
            start = new Date(gcalEvent.start.dateTime);
            end = new Date(gcalEvent.end.dateTime);
        }

        // Try to determine event type from title/description and time span
        const type = this.detectEventType(gcalEvent.summary, gcalEvent.description, start, end, isAllDay);

        return {
            id: gcalEvent.id,
            title: gcalEvent.summary || '(No title)',
            type: type,
            start: start,
            end: end,
            location: gcalEvent.location || '',
            description: gcalEvent.description || '',
            client: this.extractClientName(gcalEvent.summary),
            notes: gcalEvent.description || '',
            colorId: gcalEvent.colorId,
            status: gcalEvent.status,
            htmlLink: gcalEvent.htmlLink,
            calendarId: calendarId,
            calendarName: calendarName,
            isAllDay: isAllDay,
            recurringEventId: gcalEvent.recurringEventId || null,
            ignored: false, // Default to not ignored
        };
    }

    /**
     * Detect event type from title/description
     * @param {string} title - Event title
     * @param {string} description - Event description
     * @param {Date} startDate - Event start date
     * @param {Date} endDate - Event end date
     * @param {boolean} isAllDay - Whether event is all-day (required)
     * @returns {string} Event type
     */
    detectEventType(title, description, startDate, endDate, isAllDay) {
        // All-day events (birthdays, anniversaries) should never be 'overnight' work type
        if (isAllDay) {
            return 'other';
        }

        const text = `${title || ''} ${description || ''}`.toLowerCase();

        // Check for overnight/housesit patterns
        // Include common abbreviations and variations
        if (text.includes('overnight') || 
            text.includes('boarding') || 
            text.includes('housesit') || 
            text.includes('house sit') ||
            text.includes('house-sit') ||
            text.match(/\bhs\b/) ||  // "HS" as separate word (house sit abbreviation)
            text.includes('sitting')) {
            return 'overnight';
        }
        
        // Also detect based on time span - events spanning >12 hours or crossing midnight are likely overnight
        if (startDate && endDate) {
            const durationHours = (endDate - startDate) / (1000 * 60 * 60);
            const startDay = new Date(startDate).setHours(0, 0, 0, 0);
            const endDay = new Date(endDate).setHours(0, 0, 0, 0);
            const spansDays = startDay !== endDay;
            
            // If event spans multiple days or is >12 hours, likely overnight/housesit
            if (spansDays && durationHours >= 10) {
                return 'overnight';
            }
        }
        
        if (text.includes('walk') || text.includes('walking')) {
            return 'walk';
        } else if (text.includes('meet') || text.includes('greet') || text.includes('consultation')) {
            return 'meet-greet';
        } else if (text.includes('drop-in') || text.includes('drop in') || text.includes('visit')) {
            return 'dropin';
        }

        return 'other';
    }

    /**
     * Extract client name from title
     * Assumes format like "Bella - Morning Drop-in" or "Max & Cooper - Dog Walk"
     */
    extractClientName(title) {
        if (!title) return '';

        // Try to extract pet name (before dash or hyphen)
        const match = title.match(/^([^-–—]+)/);
        return match ? match[1].trim() : title;
    }

    /**
     * Create a new event
     * @param {string} calendarId - Calendar ID
     * @param {Object} eventData - Event data
     * @returns {Object} Created event
     */
    async createEvent(calendarId = 'primary', eventData) {
        try {
            const event = {
                summary: eventData.title,
                location: eventData.location,
                description: eventData.notes || eventData.description,
                start: {
                    dateTime: eventData.start.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                end: {
                    dateTime: eventData.end.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
            };

            const response = await gapi.client.calendar.events.insert({
                calendarId: calendarId,
                resource: event,
            });

            console.log('✅ Event created:', response.result.htmlLink);
            return this.parseEvent(response.result);
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }

    /**
     * Update an existing event
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @param {Object} eventData - Updated event data
     * @returns {Object} Updated event
     */
    async updateEvent(calendarId = 'primary', eventId, eventData) {
        try {
            const event = {
                summary: eventData.title,
                location: eventData.location,
                description: eventData.notes || eventData.description,
                start: {
                    dateTime: eventData.start.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                end: {
                    dateTime: eventData.end.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
            };

            const response = await gapi.client.calendar.events.update({
                calendarId: calendarId,
                eventId: eventId,
                resource: event,
            });

            console.log('✅ Event updated:', response.result.htmlLink);
            return this.parseEvent(response.result);
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    }

    /**
     * Delete an event
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     */
    async deleteEvent(calendarId = 'primary', eventId) {
        try {
            await gapi.client.calendar.events.delete({
                calendarId: calendarId,
                eventId: eventId,
            });

            console.log('✅ Event deleted');
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.accessToken !== null && gapi.client.getToken() !== null;
    }

    /**
     * Get events from a calendar within a date range
     * @param {string} calendarId - Calendar ID
     * @param {string} calendarName - Calendar name for labeling
     * @returns {Array} Events array
     */
    async getEvents(calendarId = 'primary', calendarName = null) {
        // Fetch events for a wider range to support calendar navigation
        // Previous: -7 days to +90 days
        // New: -6 months to +12 months
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 6);
        timeMin.setDate(1); // Start of month
        timeMin.setHours(0, 0, 0, 0);
        
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 12);
        timeMax.setDate(0); // End of month
        timeMax.setHours(23, 59, 59, 999);
        
        return this.fetchEvents(calendarId, timeMin, timeMax, calendarName);
    }

    /**
     * Load events from multiple selected calendars
     * @param {Array} selectedCalendarIds - Array of calendar IDs to fetch from
     * @returns {Array} Combined events from all calendars
     */
    async loadEventsFromCalendars(selectedCalendarIds = ['primary']) {
        try {
            console.log('📡 Fetching events from selected calendars...');
            const allEvents = [];

            // Get calendar list to map IDs to names
            const calendars = await this.listCalendars();
            const calendarMap = new Map(calendars.map(cal => [cal.id, cal.name]));

            // Fetch events from each selected calendar
            for (const calendarId of selectedCalendarIds) {
                const calendarName = calendarMap.get(calendarId) || calendarId;
                console.log(`   Fetching from: ${calendarName}`);

                try {
                    const events = await this.getEvents(calendarId, calendarName);
                    allEvents.push(...events);
                    console.log(`   ✅ Loaded ${events.length} events from ${calendarName}`);
                } catch (error) {
                    console.error(`   ❌ Error loading events from ${calendarName}:`, error);
                    // Continue with other calendars even if one fails
                }
            }

            console.log(`✅ Successfully loaded ${allEvents.length} total events`);
            return allEvents;

        } catch (error) {
            console.error('❌ Error loading calendar events:', error);
            throw error;
        }
    }
}

// Make available globally
window.CalendarAPI = CalendarAPI;
