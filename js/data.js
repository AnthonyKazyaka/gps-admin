/**
 * GPS Admin - Data Management
 * Handles data persistence, caching, and state management
 */

class DataManager {
    constructor() {
        this.storageKey = 'gpsAdminData';
        this.cacheExpiry = 15 * 60 * 1000; // 15 minutes in ms
    }

    /**
     * Load data from localStorage
     * @returns {Object} Loaded data or default structure
     */
    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                return data;
            }
        } catch (error) {
            console.error('Failed to load data from localStorage:', error);
        }
        
        return this.getDefaultData();
    }

    /**
     * Save data to localStorage
     * @param {Object} data - Data to save
     * @returns {boolean} Success status
     */
    saveData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save data to localStorage:', error);
            return false;
        }
    }

    /**
     * Get default data structure
     * @returns {Object} Default data structure
     */
    getDefaultData() {
        return {
            events: [],
            templates: [],
            availableCalendars: [],
            selectedCalendars: [], // Empty by default - let user choose which calendars to sync
            ignoredEventPatterns: [],
            settings: {
                thresholds: {
                    daily: {
                        comfortable: 6,
                        busy: 8,
                        high: 10,
                        burnout: 12
                    },
                    weekly: {
                        comfortable: 35,
                        busy: 45,
                        high: 55,
                        burnout: 65
                    },
                    monthly: {
                        comfortable: 140,
                        busy: 180,
                        high: 220,
                        burnout: 260
                    }
                },
                api: {
                    // Use injected config from deployment as default
                    calendarClientId: window.GPSConfig?.calendar?.clientId || '',
                    mapsApiKey: window.GPSConfig?.maps?.apiKey || ''
                },
                homeAddress: '',
                includeTravelTime: true,
                eventCacheExpiry: 15
            },
            lastEventSync: null
        };
    }

    /**
     * Check if cache is expired
     * @param {number} lastSync - Last sync timestamp
     * @param {number} expiryMinutes - Cache expiry in minutes
     * @returns {boolean} True if expired
     */
    isCacheExpired(lastSync, expiryMinutes = 15) {
        if (!lastSync) return true;
        const now = Date.now();
        const expiry = expiryMinutes * 60 * 1000;
        return (now - lastSync) > expiry;
    }

    /**
     * Clear all stored data
     */
    clearData() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Export data as JSON
     * @param {Object} data - Data to export
     * @returns {string} JSON string
     */
    exportData(data) {
        return JSON.stringify(data, null, 2);
    }

    /**
     * Import data from JSON
     * @param {string} jsonString - JSON string to import
     * @returns {Object|null} Parsed data or null on error
     */
    importData(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Failed to parse import data:', error);
            return null;
        }
    }

    /**
     * Get events for a specific date range
     * @param {Array} events - All events
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} Filtered events
     */
    getEventsInRange(events, startDate, endDate) {
        return events.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            return (eventStart >= startDate && eventStart <= endDate) ||
                   (eventEnd >= startDate && eventEnd <= endDate) ||
                   (eventStart <= startDate && eventEnd >= endDate);
        });
    }

    /**
     * Sort events by start time
     * @param {Array} events - Events to sort
     * @returns {Array} Sorted events
     */
    sortEventsByTime(events) {
        return [...events].sort((a, b) => a.start - b.start);
    }

    /**
     * Save events cache to localStorage
     * @param {Array} events - Events to cache
     * @param {Array} selectedCalendars - Selected calendar IDs
     * @returns {boolean} Success status
     */
    saveEventsCache(events, selectedCalendars) {
        try {
            const cacheData = {
                events: events,
                timestamp: new Date().toISOString(),
                selectedCalendars: selectedCalendars
            };
            localStorage.setItem('gps-admin-events-cache', JSON.stringify(cacheData));
            console.log(`💾 Cached ${events.length} events`);
            return true;
        } catch (error) {
            console.error('Error saving events cache:', error);
            return false;
        }
    }

    /**
     * Load events cache from localStorage
     * @returns {Object|null} Cache data or null if not available
     */
    loadEventsCache() {
        try {
            const cached = localStorage.getItem('gps-admin-events-cache');
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            return {
                events: cacheData.events || [],
                timestamp: new Date(cacheData.timestamp),
                selectedCalendars: cacheData.selectedCalendars || []
            };
        } catch (error) {
            console.error('Error loading events cache:', error);
            return null;
        }
    }

    /**
     * Check if events cache is valid (not stale)
     * @param {Array} currentSelectedCalendars - Current calendar selection
     * @param {number} expiryMinutes - Cache expiry in minutes
     * @returns {boolean} True if cache is fresh, false if stale or missing
     */
    isCacheValid(currentSelectedCalendars, expiryMinutes = 15) {
        const cache = this.loadEventsCache();
        if (!cache || !cache.timestamp) {
            return false;
        }

        const now = new Date();
        const cacheAge = (now - cache.timestamp) / 1000 / 60; // Minutes

        // Check if calendars have changed
        const calendarsChanged = JSON.stringify(cache.selectedCalendars) !==
                                JSON.stringify(currentSelectedCalendars);

        if (calendarsChanged) {
            console.log('📅 Calendar selection changed, cache invalidated');
            return false;
        }

        const isValid = cacheAge < expiryMinutes;
        if (!isValid) {
            console.log(`⏰ Cache is stale (${Math.round(cacheAge)} minutes old, max ${expiryMinutes})`);
        }

        return isValid;
    }

    /**
     * Clear events cache
     */
    clearEventsCache() {
        localStorage.removeItem('gps-admin-events-cache');
        console.log('🗑️ Events cache cleared');
    }

    /**
     * Get ignored events from localStorage
     * @returns {Array} Array of ignored event IDs
     */
    getIgnoredEvents() {
        const ignored = localStorage.getItem('gps-admin-ignored-events');
        return ignored ? JSON.parse(ignored) : [];
    }

    /**
     * Save ignored events to localStorage
     * @param {Array} ignoredEventIds - Array of event IDs to ignore
     */
    saveIgnoredEvents(ignoredEventIds) {
        localStorage.setItem('gps-admin-ignored-events', JSON.stringify(ignoredEventIds));
    }

    /**
     * Check if event should be ignored based on patterns
     * @param {Object} event - Event to check
     * @param {Array} ignoredPatterns - Array of patterns to match against
     * @returns {boolean} True if event should be ignored
     */
    isEventIgnoredByPattern(event, ignoredPatterns = []) {
        if (!ignoredPatterns || ignoredPatterns.length === 0) {
            return false;
        }

        const titleLower = (event.title || '').toLowerCase();
        return ignoredPatterns.some(pattern => {
            const patternLower = pattern.toLowerCase();
            return titleLower.includes(patternLower);
        });
    }

    /**
     * Toggle event ignored status
     * @param {Array} events - All events
     * @param {string} eventId - Event ID to toggle
     * @returns {Object} Updated event
     */
    toggleEventIgnored(events, eventId) {
        const ignoredEvents = this.getIgnoredEvents();
        const index = ignoredEvents.indexOf(eventId);

        if (index > -1) {
            ignoredEvents.splice(index, 1);
        } else {
            ignoredEvents.push(eventId);
        }

        this.saveIgnoredEvents(ignoredEvents);

        // Update the event in the array
        const event = events.find(e => e.id === eventId);
        if (event) {
            event.ignored = index === -1; // New state is opposite of what it was
        }

        return event;
    }
}
