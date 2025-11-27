/**
 * GPS Admin - Main Application
 * Smart scheduling and workload management for Genie's Pet Sitting
 */

class GPSAdminApp {
    // Class constants
    static DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    static DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    static MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];

    constructor() {
        this.state = {
            currentView: 'dashboard',
            calendarView: 'month',
            currentDate: new Date(),
            isAuthenticated: false,
            useMockData: true, // Toggle between mock and real data
            events: [],
            templates: [],
            availableCalendars: [], // List of calendars from Google
            selectedCalendars: ['primary'], // Calendar IDs to sync with
            ignoredEventPatterns: [], // Patterns for events to ignore (title matches)
            isManagingTemplates: false, // Track if in template management mode
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
                    calendarClientId: '',
                    mapsApiKey: ''
                },
                homeAddress: '',
                includeTravelTime: true, // Include travel time in workload calculations
                eventCacheExpiry: 15 // Minutes before cache is considered stale
            },
            lastEventSync: null // Timestamp of last event sync
        };

        // Initialize Modules
        this.eventProcessor = new EventProcessor();
        this.calculator = new WorkloadCalculator(this.eventProcessor);
        this.renderEngine = new RenderEngine(this.calculator, this.eventProcessor);

        // Initialize TemplatesManager
        if (window.TemplatesManager) {
            this.templatesManager = new TemplatesManager();
        }

        // Work event detection patterns
        this.workEventPatterns = {
            meetAndGreet: /\b(MG|M&G|Meet\s*&\s*Greet)\b/i,
            minutesSuffix: /\b(15|20|30|45|60)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i,
            houseSitSuffix: /\b(HS|Housesit)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i
        };

        this.initMockData();
        this.loadSettings();
        
        // Resolve 'primary' calendar selection to actual ID if available
        this.resolvePrimaryCalendarSelection();
    }

    // Event processing methods delegated to EventProcessor


    // Workload calculation methods delegated to WorkloadCalculator


    // Utility methods delegated to Utils


    /**
     * Initialize application
     */
    async init() {
        console.log('🐾 GPS Admin initializing...');

        // Simulate loading
        await this.simulateLoading();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize workload analyzer
        if (window.WorkloadAnalyzer) {
            this.workloadAnalyzer = new WorkloadAnalyzer(this.state.settings.thresholds);
        }

        // Don't initialize Calendar API in constructor - wait for user to connect
        // It will be initialized when user clicks "Connect to Google Calendar"

        // Initialize Maps API if available
        if (window.MapsAPI && this.state.settings.api.mapsApiKey) {
            await this.initMapsAPI();
        }

        // Load cached events if authenticated
        if (this.state.isAuthenticated && !this.state.useMockData) {
            await this.initializeCalendarEvents();
        }

        // Render initial view
        await this.renderDashboard();
        await this.updateWorkloadIndicator();

        // Update connect button state if already authenticated
        this.updateConnectButtonState();

        // Hide loading screen
        this.hideLoadingScreen();

        console.log('✅ GPS Admin ready!');
    }

    /**
     * Simulate initial loading
     */
    simulateLoading() {
        return new Promise(resolve => {
            setTimeout(resolve, 1500);
        });
    }

    /**
     * Hide loading screen and show app
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');

        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            app.style.display = 'grid';
            setTimeout(() => {
                app.style.opacity = '1';
            }, 50);
        }, 300);
    }

    /**
     * Initialize Google Maps API
     */
    async initMapsAPI() {
        try {
            if (this.state.settings.api.mapsApiKey) {
                this.mapsAPI = new MapsAPI(this.state.settings.api.mapsApiKey);
                await this.mapsAPI.init();
                console.log('✅ Maps API initialized');
            }
        } catch (error) {
            console.error('Error initializing Maps API:', error);
        }
    }

    /**
     * Calculate travel time between two locations
     * @param {string} origin - Starting location
     * @param {string} destination - Ending location
     * @param {Date} departureTime - Departure time
     * @returns {number} Travel time in minutes, or 0 if can't calculate
     */
    async calculateTravelTime(origin, destination, departureTime = null) {
        if (!this.mapsAPI || !origin || !destination) {
            return 0;
        }

        try {
            const result = await this.mapsAPI.calculateDriveTime(origin, destination, departureTime);
            return result.duration.minutes;
        } catch (error) {
            console.warn('Could not calculate travel time:', error);
            // Fallback: estimate based on typical city driving (30 mph average)
            // Assume 5 miles average between appointments = ~10 minutes
            return 10;
        }
    }

    /**
     * Get starting location for an event (home or previous appointment)
     * @param {Object} event - Current event
     * @param {Array} allEvents - All events sorted by start time
     * @returns {string} Starting location
     */
    getEventStartingLocation(event, allEvents) {
        const homeAddress = this.state.settings.homeAddress;
        if (!homeAddress) {
            return null;
        }

        // Find all events before this one on the same day
        const eventDate = new Date(event.start);
        eventDate.setHours(0, 0, 0, 0);

        const previousEvents = allEvents.filter(e => {
            const eDate = new Date(e.start);
            eDate.setHours(0, 0, 0, 0);
            return eDate.getTime() === eventDate.getTime() && e.start < event.start;
        }).sort((a, b) => a.start - b.start);

        // If there's a previous event with a location, use that as starting point
        if (previousEvents.length > 0) {
            const lastEvent = previousEvents[previousEvents.length - 1];
            if (lastEvent.location) {
                return lastEvent.location;
            }
        }

        // Otherwise, start from home
        return homeAddress;
    }

    /**
     * Calculate total travel time for a specific day
     * @param {Date} targetDate - The date to calculate travel for
     * @returns {number} Total travel time in minutes (or mock estimate if Maps API unavailable)
     */
    async calculateDailyTravelTime(targetDate) {
        // If travel time not enabled, return 0
        if (!this.state.settings.includeTravelTime) {
            return 0;
        }

        const homeAddress = this.state.settings.homeAddress;
        if (!homeAddress) {
            return 0;
        }

        const dateKey = new Date(targetDate);
        dateKey.setHours(0, 0, 0, 0);

        // Get all events for this day that aren't ignored or all-day
        const dayEvents = this.state.events.filter(event => {
            const eventDate = new Date(event.start);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() === dateKey.getTime() &&
                   !event.ignored &&
                   !event.isAllDay &&
                   event.location; // Only count events with locations
        }).sort((a, b) => a.start - b.start);

        if (dayEvents.length === 0) {
            return 0;
        }

        // If Maps API is not available, use mock estimates
        if (!this.mapsAPI || !this.mapsAPI.isLoaded) {
            // Estimate: 10 minutes per trip (home to first, between each, last to home)
            const tripCount = dayEvents.length + 1; // +1 for return home
            return tripCount * 10;
        }

        let totalTravelMinutes = 0;

        try {
            // Calculate travel from home to first appointment
            const travelToFirst = await this.calculateTravelTime(
                homeAddress,
                dayEvents[0].location,
                dayEvents[0].start
            );
            totalTravelMinutes += travelToFirst;

            // Calculate travel between consecutive appointments
            for (let i = 0; i < dayEvents.length - 1; i++) {
                const current = dayEvents[i];
                const next = dayEvents[i + 1];

                const travelBetween = await this.calculateTravelTime(
                    current.location,
                    next.location,
                    next.start
                );
                totalTravelMinutes += travelBetween;
            }

            // Calculate travel from last appointment back home
            const lastEvent = dayEvents[dayEvents.length - 1];
            const travelToHome = await this.calculateTravelTime(
                lastEvent.location,
                homeAddress,
                lastEvent.end
            );
            totalTravelMinutes += travelToHome;

        } catch (error) {
            console.error('Error calculating daily travel time:', error);
            // Fallback to estimate
            const tripCount = dayEvents.length + 1;
            return tripCount * 10;
        }

        return totalTravelMinutes;
    }

    /**
     * Initialize mock data for testing
     */
    initMockData() {
        if (this.state.useMockData && window.MockDataGenerator) {
            this.state.events = MockDataGenerator.generateMockEvents();
            
            // Also initialize templates if manager exists
            if (this.templatesManager) {
                const defaultTemplates = MockDataGenerator.generateDefaultTemplates();
                // We would sync these to the manager if needed
                // For now, just ensure they are available in state if used there
                this.state.templates = defaultTemplates;
            }
        }
    }
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        // First, load from config file if available
        if (window.GPSConfig) {
            if (window.GPSConfig.calendar?.clientId) {
                this.state.settings.api.calendarClientId = window.GPSConfig.calendar.clientId;
            }
            if (window.GPSConfig.maps?.apiKey) {
                this.state.settings.api.mapsApiKey = window.GPSConfig.maps.apiKey;
            }
            if (window.GPSConfig.app?.useMockData !== undefined) {
                this.state.useMockData = window.GPSConfig.app.useMockData;
            }
            console.log('✅ Loaded configuration from config file');
        }

        // Then, override with localStorage if available
        const saved = localStorage.getItem('gps-admin-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.state.settings = { ...this.state.settings, ...settings };

                // Load selected calendars if available
                if (settings.selectedCalendars) {
                    this.state.selectedCalendars = settings.selectedCalendars;
                }

                // Load authentication state
                if (settings.isAuthenticated) {
                    this.state.isAuthenticated = settings.isAuthenticated;
                    this.state.useMockData = false;
                }

                // Load available calendars
                if (settings.availableCalendars) {
                    this.state.availableCalendars = settings.availableCalendars;
                }

                // Load templates
                if (settings.templates) {
                    this.state.templates = settings.templates;
                }

                console.log('✅ Loaded settings from localStorage');
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        const settingsToSave = {
            ...this.state.settings,
            selectedCalendars: this.state.selectedCalendars,
            isAuthenticated: this.state.isAuthenticated,
            availableCalendars: this.state.availableCalendars,
            templates: this.state.templates
        };
        localStorage.setItem('gps-admin-settings', JSON.stringify(settingsToSave));
    }

    /**
     * Save events cache to localStorage
     */
    saveEventsCache() {
        try {
            const cacheData = {
                events: this.state.events,
                timestamp: new Date().toISOString(),
                selectedCalendars: this.state.selectedCalendars
            };
            localStorage.setItem('gps-admin-events-cache', JSON.stringify(cacheData));
            this.state.lastEventSync = new Date();
            console.log(`💾 Cached ${this.state.events.length} events`);
        } catch (error) {
            console.error('Error saving events cache:', error);
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
     * @returns {boolean} True if cache is fresh, false if stale or missing
     */
    isCacheValid() {
        const cache = this.loadEventsCache();
        if (!cache || !cache.timestamp) {
            return false;
        }

        const now = new Date();
        const cacheAge = (now - cache.timestamp) / 1000 / 60; // Minutes
        const expiryMinutes = this.state.settings.eventCacheExpiry || 15;

        // Check if calendars have changed
        const calendarsChanged = JSON.stringify(cache.selectedCalendars) !==
                                JSON.stringify(this.state.selectedCalendars);

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
        this.state.lastEventSync = null;
        console.log('🗑️ Events cache cleared');
    }

    /**
     * Mark events with work event flags and metadata
     * @param {Array} events - Array of events to mark
     */
    markWorkEvents(events) {
        events.forEach(event => {
            event.isWorkEvent = this.isWorkEvent(event.title);
            if (event.isWorkEvent) {
                event.serviceType = this.detectServiceType(event.title);
                event.extractedDuration = this.extractDurationFromTitle(event.title);
                event.sequenceMarker = this.extractSequenceMarker(event.title);
            }
        });
    }

    /**
     * Load calendar events from Google Calendar API
     * Fetches events from all selected calendars and updates state
     */
    async loadCalendarEvents() {
        if (!this.calendarAPI) {
            console.error('❌ Calendar API not initialized');
            throw new Error('Calendar API not initialized');
        }

        if (!this.state.isAuthenticated) {
            console.error('❌ User not authenticated');
            throw new Error('User not authenticated');
        }

        try {
            console.log('📡 Fetching events from selected calendars...');
            const allEvents = [];

            // Get calendar list to map IDs to names
            const calendars = await this.calendarAPI.listCalendars();
            const calendarMap = new Map(calendars.map(cal => [cal.id, cal.name]));

            // Fetch events from each selected calendar
            for (const calendarId of this.state.selectedCalendars) {
                const calendarName = calendarMap.get(calendarId) || calendarId;
                console.log(`   Fetching from: ${calendarName}`);

                try {
                    const events = await this.calendarAPI.getEvents(calendarId, calendarName);
                    allEvents.push(...events);
                    console.log(`   ✅ Loaded ${events.length} events from ${calendarName}`);
                } catch (error) {
                    console.error(`   ❌ Error loading events from ${calendarName}:`, error);
                    // Continue with other calendars even if one fails
                }
            }

            // Update state with fetched events
            this.state.events = allEvents;

            // Mark work events with metadata
            this.markWorkEvents(this.state.events);

            // Cache the events
            this.saveEventsCache();

            console.log(`✅ Successfully loaded ${this.state.events.length} total events`);
            return this.state.events;

        } catch (error) {
            console.error('❌ Error loading calendar events:', error);
            throw error;
        }
    }

    /**
     * Initialize calendar events on app startup
     * Loads from cache if valid, otherwise fetches from Google Calendar
     */
    async initializeCalendarEvents() {
        try {
            // Try loading from cache first
            const cache = this.loadEventsCache();

            if (this.isCacheValid() && cache) {
                // Use cached events
                this.state.events = cache.events.map(event => ({
                    ...event,
                    start: new Date(event.start),
                    end: new Date(event.end)
                }));

                // Mark work events (since this isn't stored in cache)
                this.markWorkEvents(this.state.events);

                this.state.lastEventSync = cache.timestamp;
                console.log(`✅ Loaded ${this.state.events.length} events from cache (${Math.round((new Date() - cache.timestamp) / 1000 / 60)} minutes old)`);
            } else {
                // Cache is stale or missing - initialize Calendar API and fetch
                console.log('📡 Initializing Calendar API and fetching events...');

                // Initialize Calendar API if not already done
                if (!this.calendarAPI && window.CalendarAPI) {
                    const clientId = this.state.settings.api.calendarClientId;
                    if (clientId) {
                        this.calendarAPI = new CalendarAPI(clientId);
                        await this.calendarAPI.init();

                        // Check if still authenticated after init
                        this.state.isAuthenticated = this.calendarAPI.isAuthenticated();

                        if (this.state.isAuthenticated) {
                            await this.loadCalendarEvents();
                        } else {
                            console.warn('⚠️ Calendar API initialized but user is not authenticated');
                            this.state.isAuthenticated = false;
                            this.saveSettings();
                        }
                    }
                } else if (this.calendarAPI) {
                    // Calendar API already initialized, just load events
                    await this.loadCalendarEvents();
                }
            }
        } catch (error) {
            console.error('Error initializing calendar events:', error);
            // Fall back to cached events if available, even if stale
            const cache = this.loadEventsCache();
            if (cache && cache.events && cache.events.length > 0) {
                console.log('⚠️ Using stale cache as fallback');
                this.state.events = cache.events.map(event => ({
                    ...event,
                    start: new Date(event.start),
                    end: new Date(event.end)
                }));

                // Mark work events
                this.markWorkEvents(this.state.events);
            }
        }
    }

    /**
     * Update the connect button state based on authentication status
     */
    updateConnectButtonState() {
        const btn = document.getElementById('connect-calendar-btn');
        const refreshBtn = document.getElementById('refresh-calendar-btn');
        if (!btn) return;

        if (this.state.isAuthenticated) {
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Connected
            `;
            btn.classList.add('btn-success');
            btn.classList.remove('btn-primary');

            // Show refresh button
            if (refreshBtn) {
                refreshBtn.style.display = 'block';
                this.updateRefreshButtonState();
            }
        } else {
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Connect Calendar
            `;
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-success');

            // Hide refresh button
            if (refreshBtn) {
                refreshBtn.style.display = 'none';
            }
        }
    }

    /**
     * Update refresh button text based on cache status
     */
    updateRefreshButtonState() {
        const refreshBtnText = document.getElementById('refresh-btn-text');
        if (!refreshBtnText) return;

        const cache = this.loadEventsCache();
        if (cache && cache.timestamp) {
            const minutesAgo = Math.round((new Date() - cache.timestamp) / 1000 / 60);
            if (minutesAgo < 1) {
                refreshBtnText.textContent = 'Refresh Events (just now)';
            } else if (minutesAgo === 1) {
                refreshBtnText.textContent = 'Refresh Events (1 min ago)';
            } else if (minutesAgo < 60) {
                refreshBtnText.textContent = `Refresh Events (${minutesAgo} mins ago)`;
            } else {
                const hoursAgo = Math.floor(minutesAgo / 60);
                refreshBtnText.textContent = `Refresh Events (${hoursAgo}h ago)`;
            }
        } else {
            refreshBtnText.textContent = 'Refresh Events';
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
            });
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        menuToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Connect calendar button
        document.getElementById('connect-calendar-btn')?.addEventListener('click', () => {
            console.log('🔘 Connect calendar button clicked');
            this.handleCalendarConnect();
        });

        // Refresh calendar button
        document.getElementById('refresh-calendar-btn')?.addEventListener('click', async () => {
            console.log('🔘 Refresh calendar button clicked');
            await this.handleCalendarRefresh();
        });

        // Calendar controls
        document.getElementById('calendar-prev')?.addEventListener('click', () => {
            this.navigateCalendar(-1);
        });

        document.getElementById('calendar-next')?.addEventListener('click', () => {
            this.navigateCalendar(1);
        });

        document.getElementById('calendar-today')?.addEventListener('click', () => {
            this.state.currentDate = new Date();
            this.renderCalendar();
        });

        // Calendar view toggle
        document.querySelectorAll('[data-calendar-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newView = e.target.dataset.calendarView;
                console.log(`📊 Calendar view changed: ${this.state.calendarView} → ${newView}`);
                document.querySelectorAll('[data-calendar-view]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.state.calendarView = newView;
                this.renderCalendar();
            });
        });

        // New appointment button
        document.getElementById('new-appointment-btn')?.addEventListener('click', () => {
            console.log('➕ New appointment button clicked');
            this.showAppointmentModal();
        });

        // Dashboard add appointment button
        document.getElementById('add-appointment-btn')?.addEventListener('click', () => {
            console.log('➕ Dashboard add appointment button clicked');
            this.showAppointmentModal();
        });

        // Settings form handlers
        document.getElementById('save-api-settings')?.addEventListener('click', () => {
            console.log('💾 Save API settings button clicked');
            this.saveApiSettings();
        });

        document.getElementById('save-workload-settings')?.addEventListener('click', () => {
            console.log('💾 Save workload settings button clicked');
            this.saveWorkloadSettings();
        });

        // Account management handlers
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            console.log('🚪 Logout button clicked');
            this.handleLogout();
        });

        document.getElementById('clear-calendar-data-btn')?.addEventListener('click', () => {
            console.log('🗑️  Clear calendar data button clicked');
            this.handleClearCalendarData();
        });

        // Modal close handlers
        document.querySelectorAll('.modal-close, .js-modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal?.classList.remove('active');
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal?.classList.remove('active');
            });
        });

        // View in List button in day details modal
        document.getElementById('view-in-list-btn')?.addEventListener('click', () => {
            this.viewDateInList();
        });

        // Template management
        document.getElementById('manage-templates-btn')?.addEventListener('click', () => {
            this.toggleManageTemplatesMode();
        });

        document.getElementById('new-template-btn')?.addEventListener('click', () => {
            this.showTemplateModal();
        });

        document.getElementById('save-template')?.addEventListener('click', () => {
            this.saveTemplate();
        });

        // Appointment form handlers
        document.getElementById('appointment-template')?.addEventListener('change', (e) => {
            this.handleTemplateSelection(e.target.value);
        });

        document.getElementById('save-appointment')?.addEventListener('click', () => {
            this.saveAppointment();
        });

        // Analytics time range selector
        document.getElementById('analytics-range')?.addEventListener('change', () => {
            this.renderAnalytics();
        });

        // Analytics comparison toggle
        document.getElementById('analytics-compare-toggle')?.addEventListener('change', () => {
            this.renderAnalytics();
        });

        // Analytics work events filter toggle
        document.getElementById('analytics-work-only-toggle')?.addEventListener('change', () => {
            this.renderAnalytics();
        });
    }

    /**
     * Switch between views
     */
    async switchView(viewName) {
        console.log(`🔀 Switching view: ${this.state.currentView} → ${viewName}`);
        
        // Reset manage templates mode when leaving templates view
        if (this.state.currentView === 'templates' && viewName !== 'templates' && this.state.isManagingTemplates) {
            console.log('   Resetting template management mode');
            this.state.isManagingTemplates = false;
            const btn = document.getElementById('manage-templates-btn');
            if (btn) {
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-secondary');
                btn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Manage Templates
                `;
            }
        }

        // Update state
        this.state.currentView = viewName;

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewName}`);
        });

        // Render view content
        switch (viewName) {
            case 'dashboard':
                await this.renderDashboard();
                break;
            case 'calendar':
                this.renderEngine.renderCalendar(this.state);
                break;
            case 'analytics':
                this.renderEngine.renderAnalytics(this.state, this.templatesManager);
                break;
            case 'templates':
                this.renderEngine.renderTemplates(this.state, this.templatesManager);
                break;
            case 'settings':
                this.renderEngine.renderSettings(this.state);
                break;
        }
    }

    /**
     * Render dashboard view
     */
    async renderDashboard() {
        console.log('📊 Rendering dashboard view');
        await this.renderEngine.renderDashboard(this.state);
        console.log('   Dashboard rendered');
    }

    /**
     * Render calendar view
     */
    renderCalendar() {
        this.renderEngine.renderCalendar(this.state);
    }

    /**
     * Render calendar selection in settings
     */
    renderCalendarSelection() {
        this.renderEngine.renderCalendarSelection(this.state);
    }

    /**
     * Update workload indicator in header
     */
    async updateWorkloadIndicator() {
        this.renderEngine.updateWorkloadIndicator(this.state);
    }

    /**
     * Show event details
     * @param {string} eventId - Event ID
     */
    showEventDetails(eventId) {
        this.renderEngine.showEventDetails(this.state, eventId);
    }

    // Helper methods delegated to EventProcessor and Utils


    // UI methods delegated to RenderEngine


    /**
     * Resolve 'primary' in selectedCalendars to the actual ID
     */
    resolvePrimaryCalendarSelection() {
        if (!this.state.availableCalendars || this.state.availableCalendars.length === 0) return;

        const primaryCal = this.state.availableCalendars.find(c => c.primary);
        if (!primaryCal) return;

        const index = this.state.selectedCalendars.indexOf('primary');
        if (index > -1) {
            console.log(`🔄 Resolving 'primary' calendar selection to ${primaryCal.id}`);
            this.state.selectedCalendars[index] = primaryCal.id;
            this.saveSettings();
        }
    }

    /**
     * Toggle calendar selection
     */
    toggleCalendarSelection(calendarId) {
        console.log(`📅 Toggle calendar selection: ${calendarId}`);
        
        const index = this.state.selectedCalendars.indexOf(calendarId);
        if (index > -1) {
            // Remove calendar
            this.state.selectedCalendars.splice(index, 1);
            console.log(`   Removed ${calendarId}`);
        } else {
            // Add calendar
            this.state.selectedCalendars.push(calendarId);
            console.log(`   Added ${calendarId}`);
        }

        // Save settings
        this.saveSettings();

        // Clear cache and reload events if authenticated
        if (this.state.isAuthenticated) {
            console.log('   Reloading events with new calendar selection...');
            this.clearEventsCache();
            this.loadCalendarEvents()
                .then(() => {
                    this.renderDashboard();
                    this.updateWorkloadIndicator();
                    if (this.state.currentView === 'calendar') {
                        this.renderCalendar();
                    }
                    this.showToast(`Calendar selection updated`, 'success');
                })
                .catch(error => {
                    console.error('Error reloading events:', error);
                    this.showToast('Failed to reload events', 'error');
                });
        }

        // Re-render calendar selection to update checkboxes
        this.renderCalendarSelection();
    }

    /**
     * Navigate calendar
     */
    navigateCalendar(direction) {
        const current = this.state.currentDate;
        const directionLabel = direction > 0 ? 'forward' : 'backward';
        console.log(`📅 Navigating calendar ${directionLabel} (${this.state.calendarView} view)`);

        switch (this.state.calendarView) {
            case 'month':
            case 'list':
                current.setMonth(current.getMonth() + direction);
                break;
            case 'week':
                current.setDate(current.getDate() + (7 * direction));
                break;
            case 'day':
                current.setDate(current.getDate() + direction);
                break;
        }

        console.log(`   New date: ${current.toLocaleDateString()}`);
        this.renderCalendar();
    }

    /**
     * Show template modal for creating/editing
     */
    showTemplateModal(templateId = null) {
        if (!this.templatesManager) return;

        const modal = document.getElementById('template-modal');
        const title = document.getElementById('template-modal-title');
        const form = document.getElementById('template-form');

        // Reset form
        form.reset();

        if (templateId) {
            // Edit mode
            const template = this.templatesManager.getTemplateById(templateId);
            if (!template) return;

            // Don't allow editing default templates
            if (template.isDefault) {
                this.showToast('Default templates cannot be edited. Use "Duplicate" to create a customized version.', 'info');
                return;
            }

            title.textContent = 'Edit Template';
            document.getElementById('template-name').value = template.name;
            document.getElementById('template-icon').value = template.icon;
            document.getElementById('template-type').value = template.type;
            document.getElementById('template-hours').value = Math.floor(template.duration / 60);
            document.getElementById('template-minutes').value = template.duration % 60;
            document.getElementById('template-include-travel').checked = template.includeTravel;

            // Store template ID for editing
            modal.dataset.editingId = templateId;
        } else {
            // Create mode
            title.textContent = 'Create Template';
            document.getElementById('template-hours').value = 0;
            document.getElementById('template-minutes').value = 30;
            document.getElementById('template-include-travel').checked = true;
            delete modal.dataset.editingId;
        }

        modal.classList.add('active');
    }

    /**
     * Save template (create or update)
     */
    saveTemplate() {
        if (!this.templatesManager) return;

        const modal = document.getElementById('template-modal');
        const editingId = modal.dataset.editingId;

        // Get form values
        const name = document.getElementById('template-name').value.trim();
        const icon = document.getElementById('template-icon').value.trim();
        const type = document.getElementById('template-type').value;
        const hours = parseInt(document.getElementById('template-hours').value) || 0;
        const minutes = parseInt(document.getElementById('template-minutes').value) || 0;
        const includeTravel = document.getElementById('template-include-travel').checked;

        const duration = (hours * 60) + minutes;

        // Validate using TemplatesManager
        const validation = this.templatesManager.validateTemplate({
            name,
            duration,
            travelBuffer: 0
        });

        if (!validation.valid) {
            alert(validation.errors.join('\n'));
            return;
        }

        try {
            if (editingId) {
                // Update existing template
                this.templatesManager.updateTemplate(editingId, {
                    name,
                    icon: icon || '📋',
                    type,
                    duration,
                    includeTravel
                });
                this.showToast('Template updated!', 'success');
            } else {
                // Create new template
                this.templatesManager.createTemplate({
                    name,
                    icon: icon || '📋',
                    type,
                    duration,
                    includeTravel
                });
                this.showToast('Template created!', 'success');
            }

            // Close modal and re-render
            modal.classList.remove('active');
            this.renderEngine.renderTemplates(this.state, this.templatesManager);

        } catch (error) {
            console.error('Error saving template:', error);
            this.showToast(error.message, 'error');
        }
    }

    /**
     * Delete template
     */
    deleteTemplate(templateId) {
        if (!this.templatesManager) return;

        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            this.templatesManager.deleteTemplate(templateId);
            this.renderEngine.renderTemplates(this.state, this.templatesManager);
            this.showToast('Template deleted', 'success');
        } catch (error) {
            console.error('Error deleting template:', error);
            this.showToast(error.message, 'error');
        }
    }

    /**
     * Use template to create appointment
     */
    /**
     * Use template to create appointment
     * @param {string} templateId - Optional template ID to pre-fill form
     * @param {Date} date - Optional date to pre-fill
     */
    showAppointmentModal(templateId = null, date = null) {
        const modal = document.getElementById('appointment-modal');

        // Populate template dropdown
        this.populateTemplateDropdown();

        // Reset form
        document.getElementById('appointment-form')?.reset();

        // Set default date and time
        const defaultDate = date || new Date();
        document.getElementById('appointment-date').value = defaultDate.toISOString().split('T')[0];
        document.getElementById('appointment-time').value = '09:00';

        // If template ID provided, select it and auto-fill
        if (templateId) {
            document.getElementById('appointment-template').value = templateId;
            this.handleTemplateSelection(templateId);
        }

        modal?.classList.add('active');
    }

    /**
     * Populate template dropdown in appointment modal
     */
    populateTemplateDropdown() {
        this.renderEngine.populateTemplateDropdown(this.templatesManager);
    }

    /**
     * Handle template selection to auto-fill appointment form
     */
    handleTemplateSelection(templateId) {
        this.renderEngine.handleTemplateSelection(templateId, this.templatesManager);
    }

    /**
     * Save appointment from modal form
     */
    async saveAppointment() {
        const form = document.getElementById('appointment-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Get form values
        const title = document.getElementById('appointment-title').value.trim();
        const dateStr = document.getElementById('appointment-date').value;
        const timeStr = document.getElementById('appointment-time').value;
        const duration = parseInt(document.getElementById('appointment-duration').value);
        const location = document.getElementById('appointment-location').value.trim();
        const includeTravel = document.getElementById('appointment-travel').checked;
        const notes = document.getElementById('appointment-notes').value.trim();
        const templateId = document.getElementById('appointment-template').value;

        if (!title || !dateStr || !timeStr) {
            alert('Please fill in all required fields');
            return;
        }

        // Parse date and time
        const start = new Date(dateStr + ' ' + timeStr);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + duration);

        // Create event object
        const newEvent = {
            id: `local_${Date.now()}`,
            title: title,
            start: start,
            end: end,
            location: location,
            notes: notes,
            templateId: templateId || null,
            includeTravel: includeTravel,
            isLocal: true, // Mark as locally created (not from Google Calendar)
            ignored: false
        };

        // If template was used, get additional info
        if (templateId && this.templatesManager) {
            const template = this.templatesManager.getTemplateById(templateId);
            if (template) {
                newEvent.type = template.type;
                newEvent.color = template.color;
            }
        }

        // Add to events
        this.state.events.push(newEvent);

        // Save to localStorage
        this.saveSettings();

        // Close modal
        document.getElementById('appointment-modal').classList.remove('active');

        // Re-render current view
        switch (this.state.currentView) {
            case 'dashboard':
                await this.renderDashboard();
                await this.updateWorkloadIndicator();
                break;
            case 'calendar':
                this.renderCalendar();
                break;
        }

        this.showToast(`✅ Appointment "${title}" created!`, 'success');
    }

    /**
     * Get ignored events from localStorage
     */
    getIgnoredEvents() {
        const ignored = localStorage.getItem('gps-admin-ignored-events');
        return ignored ? JSON.parse(ignored) : [];
    }

    /**
     * Save ignored events to localStorage
     */
    saveIgnoredEvents(ignoredEventIds) {
        localStorage.setItem('gps-admin-ignored-events', JSON.stringify(ignoredEventIds));
    }

    /**
     * Check if event should be ignored based on patterns
     */
    isEventIgnoredByPattern(event) {
        if (!this.state.ignoredEventPatterns || this.state.ignoredEventPatterns.length === 0) {
            return false;
        }

        const titleLower = (event.title || '').toLowerCase();
        return this.state.ignoredEventPatterns.some(pattern => {
            const patternLower = pattern.toLowerCase();
            return titleLower.includes(patternLower);
        });
    }

    /**
     * Toggle event ignored status
     */
    toggleEventIgnored(eventId) {
        const ignoredEvents = this.getIgnoredEvents();
        const index = ignoredEvents.indexOf(eventId);

        if (index > -1) {
            ignoredEvents.splice(index, 1);
        } else {
            ignoredEvents.push(eventId);
        }

        this.saveIgnoredEvents(ignoredEvents);

        // Update the event in state
        const event = this.state.events.find(e => e.id === eventId);
        if (event) {
            event.ignored = index === -1; // New state is opposite of what it was
        }

        // Re-render views
        this.renderDashboard();
        this.updateWorkloadIndicator();
        if (this.state.currentView === 'calendar') {
            this.renderCalendar();
        }
    }

    /**
     * Handle logout from Google Calendar
     */
    async handleLogout() {
        if (!this.state.isAuthenticated) {
            alert('You are not currently connected to Google Calendar.');
            return;
        }

        const confirmed = confirm(
            'Are you sure you want to logout from Google Calendar?\n\n' +
            'This will:\n' +
            '• Disconnect your Google account\n' +
            '• Revoke access tokens\n' +
            '• Switch back to mock data\n\n' +
            'Your locally stored calendar events will be preserved unless you clear them separately.'
        );

        if (!confirmed) return;

        try {
            // Sign out from Google Calendar API
            if (this.calendarAPI) {
                this.calendarAPI.signOut();
            }

            // Clear authentication state
            this.state.isAuthenticated = false;
            this.state.useMockData = true;
            this.state.availableCalendars = [];

            // Save settings
            this.saveSettings();

            // Update button state
            this.updateConnectButtonState();

            // Reinitialize mock data
            this.initMockData();

            // Re-render views
            await this.renderDashboard();
            await this.updateWorkloadIndicator();

            // Update calendar selection in settings if viewing settings
            if (this.state.currentView === 'settings') {
                this.renderCalendarSelection();
            }

            alert('✅ Successfully logged out from Google Calendar.\n\nYou are now using mock data.');
            console.log('✅ Logged out from Google Calendar');
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Handle calendar connection - initiate OAuth flow
     */
    async handleCalendarConnect() {
        try {
            // Get Client ID from settings or config
            const clientId = this.state.settings.api.calendarClientId || 
                           window.GPSConfig?.calendar?.clientId;

            // Validate Client ID is configured
            if (!clientId || clientId === 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com') {
                alert(
                    '⚠️ Calendar Client ID not configured.\n\n' +
                    'Please configure your Google OAuth Client ID in Settings before connecting.'
                );
                this.switchView('settings');
                return;
            }

            // Show connecting message
            this.showToast('Connecting to Google Calendar...', 'info');

            // Initialize Calendar API if needed
            if (!this.calendarAPI || !this.calendarAPI.gapiInited) {
                console.log('📦 Initializing Calendar API...');
                this.calendarAPI = new CalendarAPI(clientId);
                await this.calendarAPI.init();
            }

            // Authenticate user (triggers OAuth flow)
            console.log('🔐 Starting OAuth authentication...');
            await this.calendarAPI.authenticate();

            // Mark as authenticated
            this.state.isAuthenticated = true;
            this.state.useMockData = false;

            // Get available calendars
            console.log('📅 Fetching calendar list...');
            const calendars = await this.calendarAPI.listCalendars();
            this.state.availableCalendars = calendars;

            // Select primary calendar by default if none selected
            if (this.state.selectedCalendars.length === 0) {
                this.state.selectedCalendars = ['primary'];
            }

            // Resolve 'primary' to actual ID
            this.resolvePrimaryCalendarSelection();

            // Save authentication state and settings
            this.saveSettings();

            // Load calendar events
            console.log('📡 Loading calendar events...');
            await this.loadCalendarEvents();

            // Update UI
            this.updateConnectButtonState();
            await this.renderDashboard();
            await this.updateWorkloadIndicator();

            // Update calendar selection in settings if viewing settings
            if (this.state.currentView === 'settings') {
                this.renderCalendarSelection();
            }

            this.showToast('✅ Successfully connected to Google Calendar!', 'success');
            console.log('✅ Calendar connection successful');

        } catch (error) {
            console.error('Calendar connection error:', error);
            
            // Handle specific error cases
            let errorMessage = 'Failed to connect to Google Calendar.';
            
            if (error.error === 'popup_closed_by_user') {
                errorMessage = 'Authentication cancelled. Please try again.';
            } else if (error.error === 'access_denied') {
                errorMessage = 'Access denied. Please grant calendar permissions.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showToast(errorMessage, 'error');
            
            // Reset authentication state on error
            this.state.isAuthenticated = false;
            this.updateConnectButtonState();
        }
    }

    /**
     * Handle manual calendar refresh
     */
    async handleCalendarRefresh() {
        if (!this.state.isAuthenticated) {
            this.showToast('⚠️ Please connect to Google Calendar first', 'warning');
            return;
        }

        try {
            // Show refreshing message
            this.showToast('Refreshing calendar events...', 'info');

            // Clear existing cache to force fresh fetch
            this.clearEventsCache();

            // Reload events from Google Calendar
            console.log('🔄 Refreshing calendar events...');
            await this.loadCalendarEvents();

            // Update all views
            await this.renderDashboard();
            await this.updateWorkloadIndicator();
            
            if (this.state.currentView === 'calendar') {
                this.renderCalendar();
            } else if (this.state.currentView === 'analytics') {
                this.renderAnalytics();
            }

            // Update refresh button timestamp
            this.updateRefreshButtonState();

            this.showToast(`✅ Refreshed ${this.state.events.length} events`, 'success');
            console.log(`✅ Calendar refresh successful (${this.state.events.length} events)`);

        } catch (error) {
            console.error('Calendar refresh error:', error);
            this.showToast('Failed to refresh calendar: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    /**
     * Handle clearing calendar data
     */
    async handleClearCalendarData() {
        const confirmed = confirm(
            'Are you sure you want to clear all calendar data?\n\n' +
            'This will:\n' +
            '• Clear all locally stored events\n' +
            '• Clear calendar selections\n' +
            '• Reset to mock data\n\n' +
            'This action cannot be undone.'
        );

        if (!confirmed) return;

        try {
            // Clear events
            this.state.events = [];

            // Clear calendar selections
            this.state.selectedCalendars = ['primary'];
            
            // Resolve 'primary' to actual ID if available
            this.resolvePrimaryCalendarSelection();

            // Reinitialize mock data
            this.initMockData();

            // Save settings
            this.saveSettings();

            // Re-render views
            await this.renderDashboard();
            await this.updateWorkloadIndicator();

            // Update calendar selection in settings
            if (this.state.currentView === 'settings') {
                this.renderCalendarSelection();
            }

            alert('✅ Calendar data has been cleared.\n\nYou are now using mock data.');
            console.log('✅ Cleared calendar data');
        } catch (error) {
            console.error('Clear data error:', error);
            alert('Error clearing data: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        Utils.showToast(message, type);
    }


    /**
     * Show day details modal
     */
    showDayDetails(date) {
        this.selectedDate = new Date(date);
        this.renderEngine.showDayDetails(this.state, date);
    }

    /**
     * View selected date in list view
     */
    viewDateInList() {
        if (!this.selectedDate) return;

        // Set the current date to the selected date's month
        this.state.currentDate = new Date(this.selectedDate);

        // Switch to list view
        this.state.calendarView = 'list';

        // Update view toggle buttons
        document.querySelectorAll('[data-calendar-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.calendarView === 'list');
        });

        // Switch to calendar view
        this.switchView('calendar');

        // Close the modal
        Utils.hideModal('day-details-modal');

        // Small delay to ensure DOM is rendered, then scroll to the date
        setTimeout(() => {
            const dateKey = this.selectedDate.toISOString().split('T')[0];
            const dayElements = document.querySelectorAll('.calendar-list-day');

            dayElements.forEach(dayElement => {
                const header = dayElement.querySelector('.calendar-list-day-header');
                if (header && header.textContent.includes(this.selectedDate.getDate())) {
                    dayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Highlight the day briefly
                    dayElement.style.transition = 'box-shadow 0.3s ease';
                    dayElement.style.boxShadow = '0 0 0 3px var(--primary-300)';
                    setTimeout(() => {
                        dayElement.style.boxShadow = '';
                    }, 2000);
                }
            });
        }, 100);
    }
}
