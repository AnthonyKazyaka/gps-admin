/**
 * GPS Admin - Core Application
 * Main application controller coordinating all modules
 */

class GPSAdminApp {
    constructor() {
        // Initialize modules
        this.dataManager = new DataManager();
        this.eventProcessor = new EventProcessor();
        this.calculator = new WorkloadCalculator(this.eventProcessor);
        this.renderer = new RenderEngine(this.calculator, this.eventProcessor);
        this.eventListExporter = window.EventListExporter ? new EventListExporter(this.eventProcessor) : null;

        // Load data
        const savedData = this.dataManager.loadData();
        
        this.state = {
            currentView: 'dashboard',
            calendarView: 'month',
            currentDate: new Date(),
            isAuthenticated: false,
            useMockData: true,
            isManagingTemplates: false,
            ...savedData
        };

        // Ensure currentDate is always a Date object (in case it was saved as string)
        if (!(this.state.currentDate instanceof Date)) {
            this.state.currentDate = this.state.currentDate ? new Date(this.state.currentDate) : new Date();
        }

        // Initialize APIs if available
        const calendarClientId = window.GPSConfig?.calendar?.clientId;
        this.calendarApi = window.CalendarAPI && calendarClientId ? new CalendarAPI(calendarClientId) : null;
        this.mapsApi = window.MapsAPI ? new MapsAPI() : null;
        this.templatesManager = window.TemplatesManager ? new TemplatesManager() : null;

        this.selectedDate = null;
        
        this.initMockData();
    }

    /**
     * Initialize application
     */
    init() {
        this.setupEventListeners();
        this.loadSettings();
        this.switchView('dashboard');
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (app) app.style.display = 'grid';

        // Resolve 'primary' in selectedCalendars to the actual ID
        this.resolvePrimaryCalendarSelection();

        // Attempt automatic authentication if token exists
        this.attemptAutoAuthentication();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-view]').forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Menu toggle (mobile)
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Sidebar collapse toggle (desktop)
        const collapseToggle = document.getElementById('sidebar-collapse-toggle');
        const appContainer = document.querySelector('.app-container');
        if (collapseToggle && sidebar && appContainer) {
            // Load saved collapse state
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
                appContainer.classList.add('sidebar-collapsed');
                collapseToggle.setAttribute('title', 'Expand sidebar');
            }

            collapseToggle.addEventListener('click', () => {
                const willBeCollapsed = !sidebar.classList.contains('collapsed');
                
                sidebar.classList.toggle('collapsed');
                appContainer.classList.toggle('sidebar-collapsed');
                
                // Update button title
                collapseToggle.setAttribute('title', willBeCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
                
                // Save state to localStorage
                localStorage.setItem('sidebarCollapsed', willBeCollapsed);
            });
        }

        // Connect calendar button
        const connectBtn = document.getElementById('connect-calendar-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                console.log('🔘 Connect calendar button clicked');
                this.handleCalendarConnect();
            });
        }

        // Refresh calendar button
        const refreshBtn = document.getElementById('refresh-calendar-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                console.log('🔘 Refresh calendar button clicked');
                await this.handleCalendarRefresh();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                console.log('🚪 Logout button clicked');
                this.handleLogout();
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close, .js-modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) Utils.hideModal(modal.id);
            });
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    Utils.hideModal(modal.id);
                }
            });
        });

        // Template management buttons
        const manageTemplatesBtn = document.getElementById('manage-templates-btn');
        if (manageTemplatesBtn) {
            manageTemplatesBtn.addEventListener('click', () => {
                this.toggleManageTemplatesMode();
            });
        }

        const newTemplateBtn = document.getElementById('new-template-btn');
        if (newTemplateBtn) {
            newTemplateBtn.addEventListener('click', () => {
                this.showTemplateModal();
            });
        }

        const saveTemplateBtn = document.getElementById('save-template');
        if (saveTemplateBtn) {
            saveTemplateBtn.addEventListener('click', () => {
                this.saveTemplate();
            });
        }

        // Appointment buttons
        const newAppointmentBtn = document.getElementById('new-appointment-btn');
        if (newAppointmentBtn) {
            newAppointmentBtn.addEventListener('click', () => {
                this.showAppointmentModal();
            });
        }

        const addAppointmentBtn = document.getElementById('add-appointment-btn');
        if (addAppointmentBtn) {
            addAppointmentBtn.addEventListener('click', () => {
                this.showAppointmentModal();
            });
        }

        const saveAppointmentBtn = document.getElementById('save-appointment');
        if (saveAppointmentBtn) {
            saveAppointmentBtn.addEventListener('click', () => {
                this.saveAppointment();
            });
        }

        const appointmentTemplateSelect = document.getElementById('appointment-template');
        if (appointmentTemplateSelect) {
            appointmentTemplateSelect.addEventListener('change', (e) => {
                this.renderer.handleTemplateSelection(e.target.value, this.templatesManager);
            });
        }

        // Settings buttons
        const saveApiSettingsBtn = document.getElementById('save-api-settings');
        if (saveApiSettingsBtn) {
            saveApiSettingsBtn.addEventListener('click', () => {
                this.saveApiSettings();
            });
        }

        const saveWorkloadSettingsBtn = document.getElementById('save-workload-settings');
        if (saveWorkloadSettingsBtn) {
            saveWorkloadSettingsBtn.addEventListener('click', () => {
                this.saveWorkloadSettings();
            });
        }

        // View in List button (from day details modal)
        const viewInListBtn = document.getElementById('view-in-list-btn');
        if (viewInListBtn) {
            viewInListBtn.addEventListener('click', () => {
                this.viewDateInList();
            });
        }

        // Clear calendar data button
        const clearDataBtn = document.getElementById('clear-calendar-data-btn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                console.log('🗑️ Clear calendar data button clicked');
                this.handleClearCalendarData();
            });
        }

        // Export event list button
        const exportEventListBtn = document.getElementById('export-event-list-btn');
        if (exportEventListBtn) {
            exportEventListBtn.addEventListener('click', () => {
                console.log('📤 Export event list button clicked');
                this.showExportEventListModal();
            });
        }

        // Export preview button
        const exportGeneratePreviewBtn = document.getElementById('export-generate-preview');
        if (exportGeneratePreviewBtn) {
            exportGeneratePreviewBtn.addEventListener('click', () => {
                this.generateExportPreview();
            });
        }

        // Export copy to clipboard button
        const exportCopyBtn = document.getElementById('export-copy-to-clipboard');
        if (exportCopyBtn) {
            exportCopyBtn.addEventListener('click', async () => {
                await this.copyExportToClipboard();
            });
        }

        // Export download file button
        const exportDownloadBtn = document.getElementById('export-download-file');
        if (exportDownloadBtn) {
            exportDownloadBtn.addEventListener('click', () => {
                this.downloadExportFile();
            });
        }

        // Setup calendar controls (only once)
        this.setupCalendarControls();
    }

    /**
     * Switch application view
     * @param {string} view - View name
     */
    switchView(view) {
        this.state.currentView = view;

        // Update navigation
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Hide all views
        document.querySelectorAll('.view').forEach(container => {
            container.classList.remove('active');
        });

        // Show selected view
        const viewContainer = document.getElementById(`view-${view}`);
        if (viewContainer) {
            viewContainer.classList.add('active');
        }

        // Render view content
        this.renderCurrentView();
    }

    /**
     * Render current view
     */
    async renderCurrentView() {
        switch (this.state.currentView) {
            case 'dashboard':
                await this.renderer.renderDashboard(this.state);
                break;
            case 'calendar':
                this.renderCalendar();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    }

    /**
     * Load settings from state
     */
    loadSettings() {
        // Initialize settings if needed
        if (!this.state.settings) {
            this.state.settings = this.dataManager.getDefaultData().settings;
        }
        
        // Set home address for calculator
        if (this.state.settings.homeAddress) {
            this.calculator.setHomeAddress(this.state.settings.homeAddress);
        }
    }

    /**
     * Save settings
     */
    saveSettings() {
        this.dataManager.saveData(this.getPersistentState());
        Utils.showToast('Settings saved successfully', 'success');
    }

    /**
     * Get state that should be persisted (excludes transient UI state)
     * @returns {Object} State to persist
     */
    getPersistentState() {
        const { currentDate, currentView, calendarView, isManagingTemplates, ...persistentState } = this.state;
        return persistentState;
    }

    /**
     * Initialize mock data for testing
     */
    initMockData() {
        if (this.state.useMockData && this.state.events.length === 0) {
            // Add some mock events
            const today = new Date();
            this.state.events = [
                {
                    id: Utils.generateId(),
                    title: 'Fluffy - 30',
                    start: Utils.createDateAtTime(today, 9, 0),
                    end: Utils.createDateAtTime(today, 9, 30),
                    location: '123 Main St',
                    isAllDay: false,
                    ignored: false
                },
                {
                    id: Utils.generateId(),
                    title: 'Max - 45',
                    start: Utils.createDateAtTime(today, 11, 0),
                    end: Utils.createDateAtTime(today, 11, 45),
                    location: '456 Oak Ave',
                    isAllDay: false,
                    ignored: false
                },
                {
                    id: Utils.generateId(),
                    title: 'Bella - Housesit Start',
                    start: Utils.createDateAtTime(today, 18, 0),
                    end: Utils.createDateAtTime(Utils.addDays(today, 1), 18, 0),
                    location: '789 Pine Rd',
                    isAllDay: false,
                    ignored: false
                }
            ];
        }
    }

    /**
     * Render calendar view
     */
    renderCalendar() {
        this.renderer.renderCalendar(this.state);
    }

    /**
     * Render analytics view
     */
    renderAnalytics() {
        this.renderer.renderAnalytics(this.state, this.templatesManager);
    }

    /**
     * Render settings view
     */
    renderSettings() {
        this.renderer.renderSettings(this.state);
    }

    /**
     * Show day details modal
     * @param {Date|string} date - Date to show details for
     */
    showDayDetails(date) {
        // Convert string to Date if needed
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        // Store selected date for later use (e.g., View in List button)
        this.selectedDate = dateObj;
        
        // Delegate to renderer
        this.renderer.showDayDetails(this.state, dateObj);
    }

    /**
     * View selected date in calendar list view
     */
    viewDateInList() {
        if (!this.selectedDate) {
            console.warn('No date selected');
            return;
        }

        console.log('📋 Viewing date in list:', this.selectedDate);

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

            console.log('🔍 Looking for date:', dateKey, 'in', dayElements.length, 'day elements');

            dayElements.forEach(dayElement => {
                const header = dayElement.querySelector('.calendar-list-day-header');
                if (header && header.textContent.includes(this.selectedDate.getDate())) {
                    console.log('✅ Found matching day, scrolling...');
                    dayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Highlight the day briefly
                    dayElement.style.transition = 'box-shadow 0.3s ease';
                    dayElement.style.boxShadow = '0 0 0 3px var(--primary-300)';
                    setTimeout(() => {
                        dayElement.style.boxShadow = '';
                    }, 2000);
                }
            });
        }, 300);
    }

    /**
     * Setup calendar navigation controls
     */
    setupCalendarControls() {
        // Calendar view buttons
        document.querySelectorAll('[data-calendar-view]').forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.calendarView;
                this.state.calendarView = view;
                
                // Update button states
                document.querySelectorAll('[data-calendar-view]').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
                
                // Re-render calendar
                this.renderCalendar();
            });
        });

        // Previous month
        const prevBtn = document.getElementById('calendar-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.state.currentDate.setMonth(this.state.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        }

        // Next month
        const nextBtn = document.getElementById('calendar-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.state.currentDate.setMonth(this.state.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        }

        // Today button
        const todayBtn = document.getElementById('calendar-today');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.state.currentDate = new Date();
                this.renderCalendar();
            });
        }
    }

    /**
     * Attempt automatic authentication if valid token exists
     */
    async attemptAutoAuthentication() {
        try {
            // Get Client ID from state or config
            // Use saved setting if it's not empty, otherwise fall back to injected config
            const savedClientId = this.state.settings?.api?.calendarClientId?.trim();
            const clientId = savedClientId || window.GPSConfig?.calendar?.clientId;

            // Skip if no client ID configured
            if (!clientId || clientId === 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com') {
                console.log('⏭️ Skipping auto-authentication: Client ID not configured');
                return;
            }

            // Initialize Calendar API if needed
            if (!this.calendarApi || !this.calendarApi.gapiInited) {
                console.log('📦 Initializing Calendar API for auto-authentication...');
                this.calendarApi = new CalendarAPI(clientId);
                await this.calendarApi.init();
            }

            // Check if we have a saved token
            if (!this.calendarApi.accessToken) {
                console.log('⏭️ No saved token found, skipping auto-authentication');
                return;
            }

            console.log('🔄 Attempting automatic authentication with saved token...');

            // Try to authenticate silently with saved token
            await this.calendarApi.authenticate();

            // If we get here, authentication succeeded
            this.state.isAuthenticated = true;
            this.state.useMockData = false;

            // Get available calendars
            console.log('📅 Fetching calendar list...');
            const calendars = await this.calendarApi.listCalendars();
            this.state.availableCalendars = calendars;

            // Initialize selectedCalendars if not already set
            if (!this.state.selectedCalendars || this.state.selectedCalendars.length === 0) {
                this.state.selectedCalendars = ['primary'];
            }

            // Resolve 'primary' to actual ID
            this.resolvePrimaryCalendarSelection();

            // Save authentication state
            this.dataManager.saveData(this.getPersistentState());

            // Try to load from cache first for instant rendering
            const cache = this.dataManager.loadEventsCache();
            const cacheValid = this.dataManager.isCacheValid(this.state.selectedCalendars, 15);
            
            if (cacheValid && cache && cache.events.length > 0) {
                console.log('⚡ Loading from cache for instant display...');
                this.state.events = cache.events;
                this.eventProcessor.markWorkEvents(this.state.events);
                
                // Update UI with cached data immediately
                this.updateConnectButtonState();
                await this.renderCurrentView();
                this.renderer.updateWorkloadIndicator(this.state);
                
                console.log('✅ Auto-authentication successful (using cached data)');
                Utils.showToast('✅ Connected using cached data', 'success');
                
                // Fetch fresh data in background
                console.log('🔄 Fetching fresh events in background...');
                this.loadCalendarEvents()
                    .then(async () => {
                        console.log('✅ Background refresh complete');
                        await this.renderCurrentView();
                        this.renderer.updateWorkloadIndicator(this.state);
                    })
                    .catch(err => console.warn('Background refresh failed:', err));
            } else {
                // No valid cache, fetch fresh data
                console.log('📡 Loading calendar events...');
                await this.loadCalendarEvents();

                // Update UI
                this.updateConnectButtonState();
                await this.renderCurrentView();
                this.renderer.updateWorkloadIndicator(this.state);

                console.log('✅ Auto-authentication successful');
                Utils.showToast('✅ Automatically connected to Google Calendar', 'success');
            }

        } catch (error) {
            console.log('⏭️ Auto-authentication failed (will require manual login):', error.message);
            // Silently fail - user will need to click Connect manually
            // Don't show error toast as this is automatic/background
        }
    }

    /**
     * Handle calendar connection - initiate OAuth flow
     */
    async handleCalendarConnect() {
        try {
            // Get Client ID from state or config
            const clientId = this.state.settings?.api?.calendarClientId || 
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
            Utils.showToast('Connecting to Google Calendar...', 'info');

            // Initialize Calendar API if needed
            if (!this.calendarApi || !this.calendarApi.gapiInited) {
                console.log('📦 Initializing Calendar API...');
                this.calendarApi = new CalendarAPI(clientId);
                await this.calendarApi.init();
            }

            // Authenticate user (triggers OAuth flow)
            console.log('🔐 Starting OAuth authentication...');
            await this.calendarApi.authenticate();

            // Mark as authenticated
            this.state.isAuthenticated = true;
            this.state.useMockData = false;

            // Get available calendars
            console.log('📅 Fetching calendar list...');
            const calendars = await this.calendarApi.listCalendars();
            this.state.availableCalendars = calendars;
            
            console.log('📋 Available calendars:', calendars.map(c => ({ id: c.id, name: c.name, primary: c.primary })));

            // Initialize selectedCalendars if not already set
            if (!this.state.selectedCalendars) {
                this.state.selectedCalendars = [];
            }
            
            console.log('✅ Currently selected calendars:', this.state.selectedCalendars);
            
            // Select primary calendar by default if none selected
            if (this.state.selectedCalendars.length === 0) {
                this.state.selectedCalendars = ['primary'];
            }

            // Resolve 'primary' to actual ID
            this.resolvePrimaryCalendarSelection();

            // Save authentication state
            this.dataManager.saveData(this.getPersistentState());

            // Load calendar events
            console.log('📡 Loading calendar events...');
            await this.loadCalendarEvents();

            // Update UI
            this.updateConnectButtonState();
            await this.renderCurrentView();
            this.renderer.updateWorkloadIndicator(this.state);

            // Update calendar selection in settings if viewing settings
            if (this.state.currentView === 'settings') {
                this.renderer.renderCalendarSelection(this.state);
            }

            Utils.showToast('✅ Successfully connected to Google Calendar!', 'success');
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
            
            Utils.showToast(errorMessage, 'error');
            
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
            Utils.showToast('⚠️ Please connect to Google Calendar first', 'warning');
            return;
        }

        try {
            // Show refreshing message
            Utils.showToast('Refreshing calendar events...', 'info');

            // Reload events from Google Calendar (force refresh to bypass cache)
            console.log('🔄 Refreshing calendar events...');
            await this.loadCalendarEvents(true);

            // Update all views
            await this.renderCurrentView();
            this.renderer.updateWorkloadIndicator(this.state);

            // Update refresh button timestamp
            this.updateRefreshButtonState();

            Utils.showToast(`✅ Refreshed ${this.state.events.length} events`, 'success');
            console.log(`✅ Calendar refresh successful (${this.state.events.length} events)`);

        } catch (error) {
            console.error('Calendar refresh error:', error);
            Utils.showToast('Failed to refresh calendar: ' + (error.message || 'Unknown error'), 'error');
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
            if (this.calendarApi) {
                this.calendarApi.signOut();
            }

            // Clear authentication state
            this.state.isAuthenticated = false;
            this.state.useMockData = true;
            this.state.availableCalendars = [];

            // Save settings
            this.dataManager.saveData(this.getPersistentState());

            // Update button state
            this.updateConnectButtonState();

            // Reinitialize mock data
            this.initMockData();

            // Re-render views
            await this.renderCurrentView();
            this.renderer.updateWorkloadIndicator(this.state);

            // Update calendar selection in settings if viewing settings
            if (this.state.currentView === 'settings') {
                this.renderer.renderCalendarSelection(this.state);
            }

            alert('✅ Successfully logged out from Google Calendar.\n\nYou are now using mock data.');
            console.log('✅ Logged out from Google Calendar');
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Load calendar events from Google Calendar API
     */
    async loadCalendarEvents(forceRefresh = false) {
        if (!this.calendarApi) {
            console.error('❌ Calendar API not initialized');
            throw new Error('Calendar API not initialized');
        }

        // Check if GAPI is fully initialized
        if (!this.calendarApi.gapiInited || !this.calendarApi.gisInited) {
            console.error('❌ Google API libraries not fully initialized');
            throw new Error('Google API libraries not fully initialized. Please reconnect to Google Calendar.');
        }

        if (!this.state.isAuthenticated) {
            console.error('❌ User not authenticated');
            throw new Error('User not authenticated');
        }

        // Check if any calendars are selected
        if (!this.state.selectedCalendars || this.state.selectedCalendars.length === 0) {
            console.warn('⚠️ No calendars selected, clearing events');
            this.state.events = [];
            return this.state.events;
        }

        // Check if we can use cached events (unless force refresh)
        if (!forceRefresh) {
            const cache = this.dataManager.loadEventsCache();
            const cacheValid = this.dataManager.isCacheValid(this.state.selectedCalendars, 15);
            
            if (cacheValid && cache && cache.events.length > 0) {
                console.log('⚡ Using cached events (fresh)');
                this.state.events = cache.events;
                this.eventProcessor.markWorkEvents(this.state.events);
                return this.state.events;
            }
        }

        try {
            console.log('🔄 Fetching fresh events from Google Calendar...');
            
            // Fetch events from all selected calendars
            const allEvents = await this.calendarApi.loadEventsFromCalendars(this.state.selectedCalendars);

            // Update state with fetched events
            this.state.events = allEvents;

            // Mark work events with metadata
            this.eventProcessor.markWorkEvents(this.state.events);

            // Cache the events
            this.dataManager.saveEventsCache(this.state.events, this.state.selectedCalendars);

            return this.state.events;

        } catch (error) {
            console.error('❌ Error loading calendar events:', error);
            throw error;
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
                <span class="btn-text">Connected</span>
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
                <span class="btn-text">Connect Calendar</span>
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

        const cache = this.dataManager.loadEventsCache();
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
     * Show template modal for creating or editing a template
     * @param {string|null} templateId - Template ID for editing, null for creating
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
                Utils.showToast('Default templates cannot be edited. Use "Duplicate" to create a customized version.', 'info');
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

        Utils.showModal('template-modal');
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
                Utils.showToast('Template updated!', 'success');
            } else {
                // Create new template
                this.templatesManager.createTemplate({
                    name,
                    icon: icon || '📋',
                    type,
                    duration,
                    includeTravel
                });
                Utils.showToast('Template created!', 'success');
            }

            // Close modal and re-render
            Utils.hideModal('template-modal');
            this.renderer.renderTemplates(this.state, this.templatesManager);

        } catch (error) {
            console.error('Error saving template:', error);
            Utils.showToast(error.message, 'error');
        }
    }

    /**
     * Delete template
     * @param {string} templateId - Template ID to delete
     */
    deleteTemplate(templateId) {
        if (!this.templatesManager) return;

        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            this.templatesManager.deleteTemplate(templateId);
            this.renderer.renderTemplates(this.state, this.templatesManager);
            Utils.showToast('Template deleted', 'success');
        } catch (error) {
            console.error('Error deleting template:', error);
            Utils.showToast(error.message, 'error');
        }
    }

    /**
     * Toggle template management mode
     */
    toggleManageTemplatesMode() {
        this.state.isManagingTemplates = !this.state.isManagingTemplates;
        
        const btn = document.getElementById('manage-templates-btn');
        if (btn) {
            if (this.state.isManagingTemplates) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-danger');
                btn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Done Managing
                `;
            } else {
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
        
        // Re-render templates view
        this.renderer.renderTemplates(this.state, this.templatesManager);
    }

    /**
     * Show appointment modal for creating a new appointment
     * @param {string|null} templateId - Optional template ID to pre-fill form
     * @param {Date|null} date - Optional date to pre-fill
     */
    showAppointmentModal(templateId = null, date = null) {
        const modal = document.getElementById('appointment-modal');

        // Populate template dropdown
        this.renderer.populateTemplateDropdown(this.templatesManager);

        // Reset form
        document.getElementById('appointment-form')?.reset();

        // Set default date and time
        const defaultDate = date || new Date();
        const dateInput = document.getElementById('appointment-date');
        const timeInput = document.getElementById('appointment-time');
        
        if (dateInput) dateInput.value = defaultDate.toISOString().split('T')[0];
        if (timeInput) timeInput.value = '09:00';

        // If template ID provided, select it and auto-fill
        if (templateId) {
            const templateSelect = document.getElementById('appointment-template');
            if (templateSelect) {
                templateSelect.value = templateId;
                this.renderer.handleTemplateSelection(templateId, this.templatesManager);
            }
        }

        Utils.showModal('appointment-modal');
    }

    /**
     * Save appointment from modal form
     */
    async saveAppointment() {
        const form = document.getElementById('appointment-form');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
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

        // Save to storage
        this.dataManager.saveData(this.getPersistentState());

        // Close modal
        Utils.hideModal('appointment-modal');

        // Re-render current view
        await this.renderCurrentView();
        this.renderer.updateWorkloadIndicator(this.state);

        Utils.showToast(`✅ Appointment "${title}" created!`, 'success');
    }

    /**
     * Save API settings from settings form
     */
    saveApiSettings() {
        const clientIdInput = document.getElementById('calendar-client-id');
        const mapsApiKeyInput = document.getElementById('maps-api-key');
        const homeAddressInput = document.getElementById('home-address');
        const includeTravelCheckbox = document.getElementById('include-travel-time');

        // Update settings in state
        if (clientIdInput) {
            this.state.settings.api.calendarClientId = clientIdInput.value.trim();
        }
        if (mapsApiKeyInput) {
            this.state.settings.api.mapsApiKey = mapsApiKeyInput.value.trim();
        }
        if (homeAddressInput) {
            this.state.settings.homeAddress = homeAddressInput.value.trim();
            // Update calculator with new home address
            this.calculator.setHomeAddress(this.state.settings.homeAddress);
        }
        if (includeTravelCheckbox) {
            this.state.settings.includeTravelTime = includeTravelCheckbox.checked;
        }

        // Save to storage
        this.dataManager.saveData(this.getPersistentState());
        
        Utils.showToast('API settings saved successfully', 'success');
        console.log('✅ API settings saved');
    }

    /**
     * Save workload threshold settings from settings form
     */
    saveWorkloadSettings() {
        // Get all threshold inputs
        const thresholds = {
            daily: {
                comfortable: parseFloat(document.getElementById('threshold-daily-comfortable')?.value) || 6,
                busy: parseFloat(document.getElementById('threshold-daily-busy')?.value) || 8,
                high: parseFloat(document.getElementById('threshold-daily-overload')?.value) || 10,
                burnout: parseFloat(document.getElementById('threshold-daily-burnout')?.value) || 12
            },
            weekly: {
                comfortable: parseFloat(document.getElementById('threshold-weekly-comfortable')?.value) || 30,
                busy: parseFloat(document.getElementById('threshold-weekly-busy')?.value) || 40,
                high: parseFloat(document.getElementById('threshold-weekly-overload')?.value) || 50,
                burnout: parseFloat(document.getElementById('threshold-weekly-burnout')?.value) || 60
            },
            monthly: {
                comfortable: parseFloat(document.getElementById('threshold-monthly-comfortable')?.value) || 120,
                busy: parseFloat(document.getElementById('threshold-monthly-busy')?.value) || 160,
                high: parseFloat(document.getElementById('threshold-monthly-overload')?.value) || 200,
                burnout: parseFloat(document.getElementById('threshold-monthly-burnout')?.value) || 240
            }
        };

        // Validate that thresholds are in ascending order
        const validateThresholds = (category) => {
            const t = thresholds[category];
            if (t.comfortable >= t.busy || t.busy >= t.high || t.high >= t.burnout) {
                return false;
            }
            return true;
        };

        if (!validateThresholds('daily') || !validateThresholds('weekly') || !validateThresholds('monthly')) {
            alert('⚠️ Thresholds must be in ascending order:\nComfortable < Busy < Overload < Burnout');
            return;
        }

        // Update settings in state
        this.state.settings.thresholds = thresholds;

        // Save to storage
        this.dataManager.saveData(this.getPersistentState());
        
        Utils.showToast('Workload settings saved successfully', 'success');
        console.log('✅ Workload thresholds saved');
    }

    /**
     * Toggle calendar selection in settings
     * @param {string} calendarId - Calendar ID to toggle
     */
    async toggleCalendarSelection(calendarId) {
        const index = this.state.selectedCalendars.indexOf(calendarId);
        
        if (index > -1) {
            // Remove from selection
            this.state.selectedCalendars.splice(index, 1);
        } else {
            // Add to selection
            this.state.selectedCalendars.push(calendarId);
        }

        // Save settings
        this.dataManager.saveData(this.getPersistentState());
        
        // Re-render calendar selection
        this.renderer.renderCalendarSelection(this.state);
        
        console.log('📅 Calendar selection updated:', this.state.selectedCalendars);

        // Reload events from newly selected calendars
        if (this.state.isAuthenticated && this.state.selectedCalendars.length > 0) {
            // Check if API is ready
            if (!this.calendarApi || !this.calendarApi.gapiInited || !this.calendarApi.gisInited) {
                Utils.showToast('⚠️ Calendar API not ready. Please reconnect to Google Calendar.', 'warning');
                return;
            }

            Utils.showToast('Refreshing events from selected calendars...', 'info');
            
            try {
                // Clear cache to force refresh
                this.dataManager.clearEventsCache();
                
                // Reload events
                await this.loadCalendarEvents();
                
                // Update all views
                await this.renderCurrentView();
                this.renderer.updateWorkloadIndicator(this.state);
                
                Utils.showToast(`✅ Loaded ${this.state.events.length} events from selected calendars`, 'success');
            } catch (error) {
                console.error('Error reloading events:', error);
                
                // Provide specific error messages
                let errorMsg = 'Failed to reload events';
                if (error.message.includes('not fully initialized')) {
                    errorMsg = '⚠️ Calendar API not ready. Please use the "Refresh Events" button in the header.';
                } else if (error.message) {
                    errorMsg = error.message;
                }
                
                Utils.showToast(errorMsg, 'error');
            }
        } else if (this.state.selectedCalendars.length === 0) {
            // Clear events when no calendars selected
            this.state.events = [];
            await this.renderCurrentView();
            this.renderer.updateWorkloadIndicator(this.state);
            Utils.showToast('No calendars selected - events cleared', 'info');
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
            this.dataManager.saveData(this.getPersistentState());

            // Re-render views
            await this.renderCurrentView();
            this.renderer.updateWorkloadIndicator(this.state);

            // Update calendar selection in settings
            if (this.state.currentView === 'settings') {
                this.renderer.renderCalendarSelection(this.state);
            }

            alert('✅ Calendar data has been cleared.\n\nYou are now using mock data.');
            console.log('✅ Cleared calendar data');
        } catch (error) {
            console.error('Clear data error:', error);
            alert('Error clearing data: ' + (error.message || 'Unknown error'));
        }
    }

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
            this.dataManager.saveData(this.getPersistentState());
        }
    }

    /**
     * Show export event list modal
     */
    showExportEventListModal() {
        if (!this.eventListExporter) {
            alert('Event list exporter is not available.');
            return;
        }

        // Set default date range to current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Format dates for input fields (YYYY-MM-DD)
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        document.getElementById('export-start-date').value = formatDate(startOfMonth);
        document.getElementById('export-end-date').value = formatDate(endOfMonth);

        // Reset preview section
        document.getElementById('export-preview-section').style.display = 'none';
        document.getElementById('export-copy-to-clipboard').style.display = 'none';
        document.getElementById('export-download-file').style.display = 'none';

        Utils.showModal('export-event-list-modal');
    }

    /**
     * Generate export preview
     */
    generateExportPreview() {
        if (!this.eventListExporter) return;

        try {
            // Get form values
            const startDateInput = document.getElementById('export-start-date').value;
            const endDateInput = document.getElementById('export-end-date').value;
            const includeTime = document.getElementById('export-include-time').checked;
            const groupBy = document.getElementById('export-group-by').value;
            const format = document.getElementById('export-format').value;

            // Parse dates
            const startDate = startDateInput ? new Date(startDateInput + 'T00:00:00') : null;
            const endDate = endDateInput ? new Date(endDateInput + 'T23:59:59') : null;

            // Generate preview based on format
            let preview;
            if (format === 'csv') {
                preview = this.eventListExporter.generateCSV(this.state.events, {
                    startDate,
                    endDate
                });
            } else {
                preview = this.eventListExporter.generateTextList(this.state.events, {
                    startDate,
                    endDate,
                    includeTime,
                    groupBy
                });
            }

            // Count work events
            const workEvents = this.state.events.filter(event => {
                if (!this.eventProcessor.isWorkEvent(event)) return false;

                const eventDate = new Date(event.start);
                if (startDate && eventDate < startDate) return false;
                if (endDate && eventDate > endDate) return false;

                return true;
            });

            // Display preview
            document.getElementById('export-preview').textContent = preview;
            document.getElementById('export-event-count').textContent = `${workEvents.length} event${workEvents.length !== 1 ? 's' : ''}`;
            document.getElementById('export-preview-section').style.display = 'block';
            document.getElementById('export-copy-to-clipboard').style.display = 'inline-flex';
            document.getElementById('export-download-file').style.display = 'inline-flex';

            // Store preview for later use
            this.exportPreview = preview;
            this.exportFormat = format;

        } catch (error) {
            console.error('Error generating export preview:', error);
            alert('Error generating preview: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Copy export to clipboard
     */
    async copyExportToClipboard() {
        if (!this.eventListExporter || !this.exportPreview) return;

        try {
            const success = await this.eventListExporter.copyToClipboard(this.exportPreview);

            if (success) {
                // Visual feedback
                const btn = document.getElementById('export-copy-to-clipboard');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
                btn.disabled = true;

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
            } else {
                alert('Failed to copy to clipboard. Please try again.');
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            alert('Error copying to clipboard: ' + (error.message || 'Unknown error'));
        }
    }

    /**
     * Download export file
     */
    downloadExportFile() {
        if (!this.eventListExporter || !this.exportPreview) return;

        try {
            // Generate filename
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const extension = this.exportFormat === 'csv' ? 'csv' : 'txt';
            const mimeType = this.exportFormat === 'csv' ? 'text/csv' : 'text/plain';
            const filename = `work-events-${dateStr}.${extension}`;

            // Download file
            this.eventListExporter.downloadAsFile(this.exportPreview, filename, mimeType);

            // Visual feedback
            const btn = document.getElementById('export-download-file');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Downloaded!';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Error downloading file: ' + (error.message || 'Unknown error'));
        }
    }
}
