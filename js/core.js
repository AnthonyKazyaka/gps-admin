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
        
        // Multi-event scheduling state
        this.multiEventCurrentStep = 1;
        this.pendingMultiEvents = null;

        // Export helpers
        this.exportSearchTimeout = null;
        this.exportPreview = null;
        this.exportFormat = 'text';
        
        this.initMockData();
    }

    /**
     * Initialize application
     */
    init() {
        this.setupEventListeners();
        this.loadSettings();
        
        // Check hash and load appropriate view
        const initialView = this.getViewFromHash() || 'dashboard';
        this.switchView(initialView);
        
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
        // Hash change listener for browser back/forward
        window.addEventListener('hashchange', () => {
            const view = this.getViewFromHash() || 'dashboard';
            this.switchView(view, false); // false = don't update hash (already changed)
        });

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

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                // Check if sidebar is open
                if (!sidebar.classList.contains('open')) return;
                
                // Check if click is outside sidebar and menu toggle button
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
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

        // Duration dropdown change handler - syncs with custom field
        const durationSelect = document.getElementById('appointment-duration');
        const customDurationControls = document.getElementById('template-duration-controls');
        const customDurationInput = document.getElementById('template-duration-input');
        
        if (durationSelect && customDurationControls && customDurationInput) {
            durationSelect.addEventListener('change', () => {
                const value = durationSelect.value;
                
                if (value === 'custom') {
                    // Show custom controls and keep current value
                    customDurationControls.style.display = 'block';
                    // If custom input is empty or default, set a reasonable value
                    if (!customDurationInput.value || customDurationInput.value === '30') {
                        customDurationInput.value = '120'; // Default to 2 hours for custom
                    }
                } else {
                    // Hide custom controls and sync the value
                    customDurationControls.style.display = 'none';
                    customDurationInput.value = value;
                }
            });
        }

        // Template duration adjustment buttons
        const durationDecrease = document.getElementById('duration-decrease');
        const durationIncrease = document.getElementById('duration-increase');
        const durationInput = document.getElementById('template-duration-input');
        
        if (durationDecrease && durationInput) {
            durationDecrease.addEventListener('click', () => {
                const currentValue = parseInt(durationInput.value) || 30;
                const newValue = Math.max(5, currentValue - 5);
                durationInput.value = newValue;
                
                // Update the main duration dropdown if there's a matching option
                const durationSelect = document.getElementById('appointment-duration');
                const matchingOption = Array.from(durationSelect.options).find(opt => opt.value === newValue.toString());
                if (matchingOption) {
                    durationSelect.value = newValue.toString();
                } else {
                    durationSelect.value = 'custom';
                }
            });
        }
        
        if (durationIncrease && durationInput) {
            durationIncrease.addEventListener('click', () => {
                const currentValue = parseInt(durationInput.value) || 30;
                const newValue = Math.min(1440, currentValue + 5);
                durationInput.value = newValue;
                
                // Update the main duration dropdown if there's a matching option
                const durationSelect = document.getElementById('appointment-duration');
                const matchingOption = Array.from(durationSelect.options).find(opt => opt.value === newValue.toString());
                if (matchingOption) {
                    durationSelect.value = newValue.toString();
                } else {
                    durationSelect.value = 'custom';
                }
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

        // Add event listeners to all threshold inputs to update preview
        this.setupThresholdPreviewListeners();

        // Analytics time range selector
        const analyticsRange = document.getElementById('analytics-range');
        if (analyticsRange) {
            analyticsRange.addEventListener('change', () => {
                this.renderAnalytics();
            });
        }

        // Analytics comparison toggle
        const analyticsCompareToggle = document.getElementById('analytics-compare-toggle');
        if (analyticsCompareToggle) {
            analyticsCompareToggle.addEventListener('change', () => {
                this.renderAnalytics();
            });
        }

        // Analytics work events filter toggle
        const analyticsWorkOnlyToggle = document.getElementById('analytics-work-only-toggle');
        if (analyticsWorkOnlyToggle) {
            analyticsWorkOnlyToggle.addEventListener('change', () => {
                this.renderAnalytics();
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

        // Download events JSON button
        const downloadEventsBtn = document.getElementById('download-events-btn');
        if (downloadEventsBtn) {
            downloadEventsBtn.addEventListener('click', () => {
                console.log('💾 Download events JSON button clicked');
                this.downloadEventsJSON();
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

        // Export group level management
        const addGroupLevelBtn = document.getElementById('add-group-level');
        if (addGroupLevelBtn) {
            addGroupLevelBtn.addEventListener('click', () => {
                this.addGroupLevel();
            });
        }

        // Setup remove buttons for group levels (delegated event)
        const groupLevelsContainer = document.getElementById('group-levels-container');
        if (groupLevelsContainer) {
            groupLevelsContainer.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.remove-group-level');
                if (removeBtn) {
                    const level = parseInt(removeBtn.dataset.level);
                    this.removeGroupLevel(level);
                    return;
                }
                
                const moveUpBtn = e.target.closest('.move-group-up');
                if (moveUpBtn) {
                    const level = parseInt(moveUpBtn.dataset.level);
                    this.reorderGroupLevel(level, 'up');
                    return;
                }
                
                const moveDownBtn = e.target.closest('.move-group-down');
                if (moveDownBtn) {
                    const level = parseInt(moveDownBtn.dataset.level);
                    this.reorderGroupLevel(level, 'down');
                    return;
                }
            });
        }

        // Export sort level management
        const addSortLevelBtn = document.getElementById('add-sort-level');
        if (addSortLevelBtn) {
            addSortLevelBtn.addEventListener('click', () => {
                this.addSortLevel();
            });
        }

        // Setup remove buttons for sort levels (delegated event)
        const sortLevelsContainer = document.getElementById('sort-levels-container');
        if (sortLevelsContainer) {
            sortLevelsContainer.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.remove-sort-level');
                if (removeBtn) {
                    const level = parseInt(removeBtn.dataset.level);
                    this.removeSortLevel(level);
                    return;
                }
                
                const moveUpBtn = e.target.closest('.move-level-up');
                if (moveUpBtn) {
                    const level = parseInt(moveUpBtn.dataset.level);
                    this.reorderSortLevel(level, 'up');
                    return;
                }
                
                const moveDownBtn = e.target.closest('.move-level-down');
                if (moveDownBtn) {
                    const level = parseInt(moveDownBtn.dataset.level);
                    this.reorderSortLevel(level, 'down');
                    return;
                }
            });
        }

        // Export preview button
        const exportGeneratePreviewBtn = document.getElementById('export-generate-preview');
        if (exportGeneratePreviewBtn) {
            exportGeneratePreviewBtn.addEventListener('click', () => {
                this.generateExportPreview();
            });
        }

        const exportSearchInput = document.getElementById('export-search-term');
        if (exportSearchInput) {
            exportSearchInput.addEventListener('input', () => {
                if (this.exportSearchTimeout) {
                    clearTimeout(this.exportSearchTimeout);
                }
                this.exportSearchTimeout = setTimeout(() => this.generateExportPreview(), 250);
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

        const exportTable = document.querySelector('.export-table');
        if (exportTable) {
            exportTable.addEventListener('click', (e) => {
                const header = e.target.closest('th[data-sort]');
                if (!header) return;
                this.handleExportTableSort(header.dataset.sort);
            });
        }

        // Multi-event scheduling button
        const multiEventBtn = document.getElementById('multi-event-btn');
        if (multiEventBtn) {
            multiEventBtn.addEventListener('click', () => {
                this.showMultiEventModal();
            });
        }

        // Multi-event modal controls
        this.setupMultiEventModalControls();

        // Setup calendar controls (only once)
        this.setupCalendarControls();
    }

    /**
     * Switch application view
     * @param {string} view - View name
     */
    /**
     * Get view name from URL hash
     * @returns {string|null} View name or null
     */
    getViewFromHash() {
        const hash = window.location.hash.slice(1); // Remove '#'
        const validViews = ['dashboard', 'calendar', 'templates', 'analytics', 'settings'];
        return validViews.includes(hash) ? hash : null;
    }

    /**
     * Switch to a different view
     * @param {string} view - View name
     * @param {boolean} updateHash - Whether to update URL hash (default: true)
     */
    switchView(view, updateHash = true) {
        this.state.currentView = view;

        // Update URL hash
        if (updateHash && window.location.hash !== `#${view}`) {
            window.location.hash = view;
        }

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
            case 'templates':
                this.renderer.renderTemplates(this.state, this.templatesManager);
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
            // Use the MockDataGenerator for comprehensive test data
            if (typeof MockDataGenerator !== 'undefined') {
                this.state.events = MockDataGenerator.generateMockEvents();
            } else {
                // Fallback: Add some basic mock events
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

        // Previous period (month/week/day depending on view)
        const prevBtn = document.getElementById('calendar-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                switch (this.state.calendarView) {
                    case 'day':
                        this.state.currentDate.setDate(this.state.currentDate.getDate() - 1);
                        break;
                    case 'week':
                        this.state.currentDate.setDate(this.state.currentDate.getDate() - 7);
                        break;
                    case 'month':
                    default:
                        this.state.currentDate.setMonth(this.state.currentDate.getMonth() - 1);
                        break;
                }
                this.renderCalendar();
            });
        }

        // Next period (month/week/day depending on view)
        const nextBtn = document.getElementById('calendar-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                switch (this.state.calendarView) {
                    case 'day':
                        this.state.currentDate.setDate(this.state.currentDate.getDate() + 1);
                        break;
                    case 'week':
                        this.state.currentDate.setDate(this.state.currentDate.getDate() + 7);
                        break;
                    case 'month':
                    default:
                        this.state.currentDate.setMonth(this.state.currentDate.getMonth() + 1);
                        break;
                }
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
            
            // Set start/end times if they exist
            if (template.defaultStartTime) {
                document.getElementById('template-start-time').value = template.defaultStartTime;
            }
            if (template.defaultEndTime) {
                document.getElementById('template-end-time').value = template.defaultEndTime;
            }

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
        const defaultStartTime = document.getElementById('template-start-time').value || null;
        const defaultEndTime = document.getElementById('template-end-time').value || null;

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
                    defaultStartTime,
                    defaultEndTime,
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
                    defaultStartTime,
                    defaultEndTime,
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
     * Use template - applies template to appointment form
     * @param {string} templateId - Template ID to use
     */
    useTemplate(templateId) {
        if (!this.templatesManager) return;
        // Open appointment modal with template pre-selected
        this.showAppointmentModal(templateId);
    }

    /**
     * Duplicate template - creates a copy of an existing template
     * @param {string} templateId - Template ID to duplicate
     */
    duplicateTemplate(templateId) {
        if (!this.templatesManager) return;

        try {
            const duplicate = this.templatesManager.duplicateTemplate(templateId);
            console.log('✅ Template duplicated:', duplicate.name);
            
            // Re-render templates view
            this.renderer.renderTemplates(this.state, this.templatesManager);
            
            // Show success message
            Utils.showToast(`Template "${duplicate.name}" created successfully!`, 'success');
        } catch (error) {
            console.error('❌ Error duplicating template:', error);
            Utils.showToast('Failed to duplicate template: ' + error.message, 'error');
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

        // Initialize duration fields - sync custom input with dropdown default
        const durationSelect = document.getElementById('appointment-duration');
        const customDurationInput = document.getElementById('template-duration-input');
        const customDurationControls = document.getElementById('template-duration-controls');
        
        if (durationSelect && customDurationInput) {
            // Set custom input to match dropdown default (30 minutes)
            customDurationInput.value = durationSelect.value;
            // Hide custom controls by default
            if (customDurationControls) {
                customDurationControls.style.display = 'none';
            }
        }

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
        
        // Always use custom duration input as it's synced with dropdown
        const customDurationInput = document.getElementById('template-duration-input');
        const durationSelect = document.getElementById('appointment-duration');
        let duration;
        
        // Use custom input if it has a value, otherwise fall back to dropdown
        if (customDurationInput && customDurationInput.value) {
            duration = parseInt(customDurationInput.value);
        } else {
            duration = parseInt(durationSelect.value);
        }
        
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

    // =========================================================================
    // Multi-Event Scheduling
    // =========================================================================

    /**
     * Setup event listeners for multi-event modal
     */
    setupMultiEventModalControls() {
        // Date change handlers to update summary
        const startDateInput = document.getElementById('multi-start-date');
        const endDateInput = document.getElementById('multi-end-date');
        
        if (startDateInput) {
            startDateInput.addEventListener('change', () => this.updateMultiEventDateSummary());
        }
        if (endDateInput) {
            endDateInput.addEventListener('change', () => this.updateMultiEventDateSummary());
        }

        // Booking type change handler
        document.querySelectorAll('input[name="booking-type"]').forEach(radio => {
            radio.addEventListener('change', () => this.handleBookingTypeChange());
        });

        // Next/Previous/Create buttons
        const nextBtn = document.getElementById('multi-event-next');
        const prevBtn = document.getElementById('multi-event-prev');
        const createBtn = document.getElementById('multi-event-create');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.multiEventNextStep());
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.multiEventPrevStep());
        }
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createMultiEvents());
        }

        // Add visit slot buttons
        const addVisitBtn = document.getElementById('add-visit-slot');
        const addOvernightDropinBtn = document.getElementById('add-overnight-dropin-slot');

        if (addVisitBtn) {
            addVisitBtn.addEventListener('click', () => this.addVisitSlot('visit-slots-container'));
        }
        if (addOvernightDropinBtn) {
            addOvernightDropinBtn.addEventListener('click', () => this.addVisitSlot('overnight-dropin-slots-container'));
        }

        // Add weekend visit slot button
        const addWeekendVisitBtn = document.getElementById('add-weekend-visit-slot');
        if (addWeekendVisitBtn) {
            addWeekendVisitBtn.addEventListener('click', () => this.addVisitSlot('weekend-visit-slots-container'));
        }

        // Weekend schedule toggle
        const separateWeekendToggle = document.getElementById('multi-separate-weekend');
        if (separateWeekendToggle) {
            separateWeekendToggle.addEventListener('change', (e) => {
                const weekendConfig = document.getElementById('weekend-visits-config');
                if (weekendConfig) {
                    weekendConfig.style.display = e.target.checked ? 'block' : 'none';
                    
                    // If showing for the first time and empty, add a slot
                    if (e.target.checked && document.getElementById('weekend-visit-slots-container').children.length === 0) {
                        this.addVisitSlot('weekend-visit-slots-container');
                    }
                }
            });
        }

        // Enable/disable dropins checkbox
        const enableDropins = document.getElementById('multi-enable-dropins');
        if (enableDropins) {
            enableDropins.addEventListener('change', (e) => {
                const dropinConfig = document.getElementById('overnight-dropins-config');
                if (dropinConfig) {
                    dropinConfig.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        // Preview toggle for non-work events
        const previewShowAll = document.getElementById('multi-preview-show-all');
        if (previewShowAll) {
            previewShowAll.addEventListener('change', () => {
                this.renderMultiEventTimeline();
            });
        }

        // Overnight template selection handler
        const overnightTemplateSelect = document.getElementById('multi-overnight-template');
        if (overnightTemplateSelect) {
            overnightTemplateSelect.addEventListener('change', (e) => {
                const templateId = e.target.value;
                if (templateId && this.templatesManager) {
                    const template = this.templatesManager.getTemplateById(templateId);
                    if (template && template.defaultStartTime && template.defaultEndTime) {
                        // Update arrival and departure times from template
                        const arrivalInput = document.getElementById('multi-overnight-start');
                        const departureInput = document.getElementById('multi-overnight-end');
                        if (arrivalInput) arrivalInput.value = template.defaultStartTime;
                        if (departureInput) departureInput.value = template.defaultEndTime;
                    }
                }
            });
        }
    }

    /**
     * Show multi-event scheduling modal
     */
    showMultiEventModal() {
        // Reset wizard to step 1
        this.multiEventCurrentStep = 1;
        this.updateMultiEventWizardUI();

        // Reset form
        document.getElementById('multi-client-name').value = '';
        document.getElementById('multi-location').value = '';
        
        // Set default dates (today and tomorrow)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        document.getElementById('multi-start-date').value = today.toISOString().split('T')[0];
        document.getElementById('multi-end-date').value = tomorrow.toISOString().split('T')[0];

        // Reset booking type to daily visits
        const dailyVisitsRadio = document.querySelector('input[name="booking-type"][value="daily-visits"]');
        if (dailyVisitsRadio) {
            dailyVisitsRadio.checked = true;
        }

        // Populate template dropdowns
        this.populateMultiEventTemplates();

        // Initialize with one default visit slot
        this.resetVisitSlots('visit-slots-container');
        this.resetVisitSlots('overnight-dropin-slots-container');
        this.resetVisitSlots('weekend-visit-slots-container');

        // Reset weekend toggle
        const separateWeekendToggle = document.getElementById('multi-separate-weekend');
        if (separateWeekendToggle) {
            separateWeekendToggle.checked = false;
            const weekendConfig = document.getElementById('weekend-visits-config');
            if (weekendConfig) weekendConfig.style.display = 'none';
        }

        // Update date summary
        this.updateMultiEventDateSummary();

        // Show daily visits config by default
        this.handleBookingTypeChange();

        Utils.showModal('multi-event-modal');
    }

    /**
     * Populate template dropdowns in multi-event modal
     */
    populateMultiEventTemplates() {
        if (!this.templatesManager) return;

        const templates = this.templatesManager.getAllTemplates();
        
        // Populate overnight template dropdown
        const overnightSelect = document.getElementById('multi-overnight-template');
        if (overnightSelect) {
            overnightSelect.innerHTML = '<option value="">-- Select Template --</option>';
            templates.filter(t => t.type === 'overnight').forEach(t => {
                const timeInfo = t.defaultStartTime && t.defaultEndTime 
                    ? ` (${t.defaultStartTime} - ${t.defaultEndTime})` 
                    : ` (${t.duration / 60}h)`;
                overnightSelect.innerHTML += `<option value="${t.id}">${t.icon} ${t.name}${timeInfo}</option>`;
            });
        }
    }

    /**
     * Get template options HTML for visit slot dropdowns
     */
    getTemplateOptionsHTML() {
        if (!this.templatesManager) return '<option value="">No template</option>';

        const templates = this.templatesManager.getAllTemplates();
        let html = '<option value="">-- Select --</option>';
        
        // Group by type
        const dropins = templates.filter(t => t.type === 'dropin');
        const walks = templates.filter(t => t.type === 'walk');
        const others = templates.filter(t => !['dropin', 'walk', 'overnight'].includes(t.type));

        if (dropins.length > 0) {
            html += '<optgroup label="Drop-in Visits">';
            dropins.forEach(t => {
                html += `<option value="${t.id}" data-duration="${t.duration}">${t.icon} ${t.name} (${t.duration}min)</option>`;
            });
            html += '</optgroup>';
        }

        if (walks.length > 0) {
            html += '<optgroup label="Dog Walks">';
            walks.forEach(t => {
                html += `<option value="${t.id}" data-duration="${t.duration}">${t.icon} ${t.name} (${t.duration}min)</option>`;
            });
            html += '</optgroup>';
        }

        if (others.length > 0) {
            html += '<optgroup label="Other">';
            others.forEach(t => {
                html += `<option value="${t.id}" data-duration="${t.duration}">${t.icon} ${t.name} (${t.duration}min)</option>`;
            });
            html += '</optgroup>';
        }

        return html;
    }

    /**
     * Reset visit slots container with one default slot
     */
    resetVisitSlots(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        this.addVisitSlot(containerId);
    }

    /**
     * Add a visit time slot
     */
    addVisitSlot(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const slotCount = container.querySelectorAll('.visit-slot').length;
        const slotNumber = slotCount + 1;

        const slotHTML = `
            <div class="visit-slot" data-slot-id="${slotNumber}">
                <div class="visit-slot-number">${slotNumber}</div>
                <div class="visit-slot-template">
                    <select class="select slot-template-select">
                        ${this.getTemplateOptionsHTML()}
                    </select>
                </div>
                <div class="visit-slot-time">
                    <input type="time" class="input slot-time-input" value="12:00">
                </div>
                <div class="visit-slot-duration">
                    <select class="select slot-duration-select">
                        <option value="15">15 min</option>
                        <option value="20">20 min</option>
                        <option value="30" selected>30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                    </select>
                </div>
                <button type="button" class="visit-slot-remove" onclick="window.gpsApp.removeVisitSlot(this)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', slotHTML);

        // Add template change handler to update duration
        const newSlot = container.lastElementChild;
        const templateSelect = newSlot.querySelector('.slot-template-select');
        const durationSelect = newSlot.querySelector('.slot-duration-select');

        templateSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.selectedOptions[0];
            if (selectedOption && selectedOption.dataset.duration) {
                const duration = selectedOption.dataset.duration;
                // Try to match duration in dropdown
                const matchingOption = Array.from(durationSelect.options).find(opt => opt.value === duration);
                if (matchingOption) {
                    durationSelect.value = duration;
                }
            }
        });
    }

    /**
     * Remove a visit time slot
     */
    removeVisitSlot(button) {
        const slot = button.closest('.visit-slot');
        const container = slot.parentElement;
        
        // Don't remove if it's the last slot
        if (container.querySelectorAll('.visit-slot').length <= 1) {
            Utils.showToast('At least one visit is required', 'warning');
            return;
        }

        slot.remove();

        // Renumber remaining slots
        container.querySelectorAll('.visit-slot').forEach((slot, index) => {
            const numberEl = slot.querySelector('.visit-slot-number');
            if (numberEl) {
                numberEl.textContent = index + 1;
            }
        });
    }

    /**
     * Update date summary display
     */
    updateMultiEventDateSummary() {
        const startDate = document.getElementById('multi-start-date').value;
        const endDate = document.getElementById('multi-end-date').value;
        const summaryEl = document.getElementById('multi-date-summary');
        const daysCountEl = document.getElementById('multi-days-count');

        if (!startDate || !endDate) {
            summaryEl.style.display = 'none';
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end < start) {
            summaryEl.style.display = 'none';
            return;
        }

        const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        daysCountEl.textContent = `${dayCount} day${dayCount !== 1 ? 's' : ''}`;
        summaryEl.style.display = 'inline-flex';
    }

    /**
     * Handle booking type change
     */
    handleBookingTypeChange() {
        const bookingType = document.querySelector('input[name="booking-type"]:checked')?.value || 'daily-visits';
        
        const dailyConfig = document.getElementById('daily-visits-config');
        const overnightConfig = document.getElementById('overnight-stay-config');

        if (bookingType === 'daily-visits') {
            dailyConfig.style.display = 'block';
            overnightConfig.style.display = 'none';
        } else {
            dailyConfig.style.display = 'none';
            overnightConfig.style.display = 'block';
        }
    }

    /**
     * Navigate to next step in wizard
     */
    multiEventNextStep() {
        // Validate current step
        if (!this.validateMultiEventStep(this.multiEventCurrentStep)) {
            return;
        }

        this.multiEventCurrentStep++;
        
        // If moving to review step, generate preview
        if (this.multiEventCurrentStep === 3) {
            this.generateMultiEventPreview();
        }

        this.updateMultiEventWizardUI();
    }

    /**
     * Navigate to previous step in wizard
     */
    multiEventPrevStep() {
        if (this.multiEventCurrentStep > 1) {
            this.multiEventCurrentStep--;
            this.updateMultiEventWizardUI();
        }
    }

    /**
     * Update wizard UI based on current step
     */
    updateMultiEventWizardUI() {
        // Update step indicators
        document.querySelectorAll('.wizard-step').forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNum === this.multiEventCurrentStep) {
                step.classList.add('active');
            } else if (stepNum < this.multiEventCurrentStep) {
                step.classList.add('completed');
            }
        });

        // Show/hide content panels
        document.querySelectorAll('.wizard-content').forEach((content, index) => {
            content.classList.toggle('active', index + 1 === this.multiEventCurrentStep);
        });

        // Update button visibility
        const prevBtn = document.getElementById('multi-event-prev');
        const nextBtn = document.getElementById('multi-event-next');
        const createBtn = document.getElementById('multi-event-create');

        prevBtn.style.display = this.multiEventCurrentStep > 1 ? 'inline-flex' : 'none';
        nextBtn.style.display = this.multiEventCurrentStep < 3 ? 'inline-flex' : 'none';
        createBtn.style.display = this.multiEventCurrentStep === 3 ? 'inline-flex' : 'none';
    }

    /**
     * Validate current wizard step
     */
    validateMultiEventStep(step) {
        if (step === 1) {
            const clientName = document.getElementById('multi-client-name').value.trim();
            const startDate = document.getElementById('multi-start-date').value;
            const endDate = document.getElementById('multi-end-date').value;

            if (!clientName) {
                Utils.showToast('Please enter a client/pet name', 'warning');
                return false;
            }
            if (!startDate || !endDate) {
                Utils.showToast('Please select start and end dates', 'warning');
                return false;
            }
            if (new Date(endDate) < new Date(startDate)) {
                Utils.showToast('End date must be after start date', 'warning');
                return false;
            }
        }

        if (step === 2) {
            const bookingType = document.querySelector('input[name="booking-type"]:checked')?.value;
            
            if (bookingType === 'daily-visits') {
                const container = document.getElementById('visit-slots-container');
                if (!container || container.querySelectorAll('.visit-slot').length === 0) {
                    Utils.showToast('Please add at least one visit', 'warning');
                    return false;
                }

                const separateWeekend = document.getElementById('multi-separate-weekend').checked;
                if (separateWeekend) {
                    const weekendContainer = document.getElementById('weekend-visit-slots-container');
                    if (!weekendContainer || weekendContainer.querySelectorAll('.visit-slot').length === 0) {
                        Utils.showToast('Please add at least one weekend visit', 'warning');
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Get visit slots data from container
     */
    getVisitSlotsData(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];

        const slots = [];
        container.querySelectorAll('.visit-slot').forEach(slot => {
            const templateSelect = slot.querySelector('.slot-template-select');
            const timeInput = slot.querySelector('.slot-time-input');
            const durationSelect = slot.querySelector('.slot-duration-select');

            slots.push({
                templateId: templateSelect?.value || null,
                time: timeInput?.value || '12:00',
                duration: parseInt(durationSelect?.value || '30', 10),
            });
        });

        return slots;
    }

    /**
     * Check for conflicts between new events and existing events
     */
    checkMultiEventConflicts(newEvents) {
        const conflicts = [];
        const existingEvents = this.state.events.filter(e => !e.ignored);

        newEvents.forEach(newEvent => {
            const hasConflict = existingEvents.some(existingEvent => {
                // Skip if same ID (shouldn't happen for new events but good practice)
                if (existingEvent.id === newEvent.id) return false;

                // Check for overlap
                // Event A overlaps Event B if: StartA < EndB && EndA > StartB
                const startA = new Date(newEvent.start);
                const endA = new Date(newEvent.end);
                const startB = new Date(existingEvent.start);
                const endB = new Date(existingEvent.end);

                return startA < endB && endA > startB;
            });

            if (hasConflict) {
                conflicts.push(newEvent);
            }
        });

        return conflicts;
    }

    /**
     * Generate preview of events to be created
     */
    generateMultiEventPreview() {
        if (!this.templatesManager) return;

        const config = this.getMultiEventConfig();
        const events = this.templatesManager.generateMultiDayEvents(config);

        // Store for later creation
        this.pendingMultiEvents = events;
        
        this.renderMultiEventTimeline();
    }

    /**
     * Render the interactive timeline for multi-event preview
     */
    renderMultiEventTimeline() {
        const events = this.pendingMultiEvents;
        if (!events) return;

        // Check for conflicts
        const conflicts = this.checkMultiEventConflicts(events);
        
        // Update conflict alert
        const conflictAlert = document.getElementById('multi-event-conflicts');
        if (conflictAlert) {
            if (conflicts.length > 0) {
                conflictAlert.style.display = 'block';
                conflictAlert.innerHTML = `
                    <strong>⚠️ Schedule Conflicts Detected</strong>
                    <p>${conflicts.length} event${conflicts.length !== 1 ? 's' : ''} overlap with existing appointments.</p>
                `;
            } else {
                conflictAlert.style.display = 'none';
            }
        }

        // Update summary stats
        const totalEvents = events.length;
        const totalMinutes = events.reduce((sum, e) => sum + ((e.end - e.start) / (1000 * 60)), 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMins = Math.round(totalMinutes % 60);

        document.getElementById('summary-total-events').textContent = totalEvents;
        document.getElementById('summary-total-hours').textContent = `${totalHours}h ${remainingMins}m`;
        
        if (events.length > 0) {
            // Find min/max date
            const sortedEvents = [...events].sort((a, b) => a.start - b.start);
            const start = sortedEvents[0].start;
            const end = sortedEvents[sortedEvents.length - 1].end;
            const dateRangeText = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            document.getElementById('summary-date-range').textContent = dateRangeText;
        }

        const previewContainer = document.getElementById('multi-event-preview');
        const eventsByDay = {};

        // Group by day - also add overnight events to their end day for morning continuation display
        events.forEach((event, index) => {
            const dayKey = event.start.toDateString();
            if (!eventsByDay[dayKey]) {
                eventsByDay[dayKey] = [];
            }
            // Store index for reference
            event._index = index;
            eventsByDay[dayKey].push(event);
            
            // For overnight events that cross midnight, also add to the end day
            if (event.type === 'overnight') {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                const startDay = new Date(eventStart);
                startDay.setHours(0, 0, 0, 0);
                const endDay = new Date(eventEnd);
                endDay.setHours(0, 0, 0, 0);
                
                if (endDay > startDay) {
                    const endDayKey = eventEnd.toDateString();
                    if (!eventsByDay[endDayKey]) {
                        eventsByDay[endDayKey] = [];
                    }
                    // Create a clone marked as morning continuation
                    const morningEvent = {
                        ...event,
                        _index: index,
                        _isMorningContinuation: true,
                    };
                    eventsByDay[endDayKey].push(morningEvent);
                }
            }
        });

        // Add existing events to the view
        const uniqueDays = Object.keys(eventsByDay);
        const showNonWorkEvents = document.getElementById('multi-preview-show-all')?.checked ?? true;
        
        uniqueDays.forEach(dayKey => {
            const dayDate = new Date(dayKey);
            const dayStart = new Date(dayDate); dayStart.setHours(0,0,0,0);
            const dayEnd = new Date(dayDate); dayEnd.setHours(23,59,59,999);
            
            const existingOnDay = this.state.events.filter(e => {
                if (e.ignored) return false;
                
                // Filter non-work events if toggle is off
                if (!showNonWorkEvents && !this.eventProcessor.isWorkEvent(e)) {
                    return false;
                }

                const eStart = new Date(e.start);
                return eStart >= dayStart && eStart <= dayEnd;
            });
            
            existingOnDay.forEach(e => {
                // Clone and mark as existing
                const existingEvent = { ...e, isExisting: true };
                // Ensure start/end are Date objects
                existingEvent.start = new Date(existingEvent.start);
                existingEvent.end = new Date(existingEvent.end);
                eventsByDay[dayKey].push(existingEvent);
            });
        });

        let html = '';
        const startHour = 5; // 5 AM
        const endHour = 23; // 11 PM
        const timelineDurationHours = endHour - startHour;

        // Sort days chronologically for proper overnight connection display
        const sortedDays = Object.entries(eventsByDay).sort((a, b) => new Date(a[0]) - new Date(b[0]));

        sortedDays.forEach(([dayKey, dayEvents], dayIndex) => {
            const date = new Date(dayKey);
            const dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            
            // Check if there's an overnight event continuing from previous day (morning continuation)
            const hasMorningContinuation = dayEvents.some(e => e._isMorningContinuation);
            
            // Check if there's an overnight event continuing to next day  
            const hasEveningContinuation = dayEvents.some(e => {
                if (!e.type || e.type !== 'overnight' || e._isMorningContinuation) return false;
                const eventEnd = new Date(e.end);
                const eventEndDay = new Date(eventEnd);
                eventEndDay.setHours(0, 0, 0, 0);
                const currentDay = new Date(date);
                currentDay.setHours(0, 0, 0, 0);
                return eventEndDay > currentDay;
            });
            
            // Count only new events for the header (exclude morning continuations to avoid double counting)
            const newEventsCount = dayEvents.filter(e => !e.isExisting && !e._isMorningContinuation).length;
            
            html += `
                <div class="timeline-day-container${hasMorningContinuation ? ' has-morning-continuation' : ''}${hasEveningContinuation ? ' has-evening-continuation' : ''}">
                    <div class="timeline-header">
                        <span>${hasMorningContinuation ? '<span class="continuation-indicator continuation-morning" title="Overnight continues from previous day">◀ 🌙</span> ' : ''}${dateLabel}${hasEveningContinuation ? ' <span class="continuation-indicator continuation-evening" title="Overnight continues to next day">🌙 ▶</span>' : ''}</span>
                        <span class="preview-day-count">${newEventsCount} new event${newEventsCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="timeline-track-wrapper" data-date="${dayKey}">
                        <div class="timeline-grid">
            `;

            // Grid lines
            for (let i = 0; i < timelineDurationHours; i++) {
                const hour = startHour + i;
                const label = hour > 12 ? `${hour-12}p` : (hour === 12 ? '12p' : `${hour}a`);
                html += `
                    <div class="timeline-hour">
                        <span class="timeline-hour-label">${label}</span>
                    </div>
                `;
            }

            html += `</div>`; // End grid

            // Events - split overnight events that cross midnight for display
            dayEvents.forEach(event => {
                const isOvernight = event.type === 'overnight';
                const isMorningContinuation = event._isMorningContinuation;
                
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                
                const hasConflict = !event.isExisting && conflicts.includes(event);
                const conflictClass = hasConflict ? 'has-conflict' : '';
                const isExisting = event.isExisting;
                const overnightClass = isOvernight ? 'overnight-event' : '';
                const extraClass = `${isExisting ? 'existing-event' : ''} ${overnightClass}`.trim();
                
                const icon = isOvernight ? '🌙' : '🏃';
                
                // Check if overnight event crosses midnight - split into two blocks for display
                const eventStartDay = new Date(eventStart);
                eventStartDay.setHours(0, 0, 0, 0);
                const eventEndDay = new Date(eventEnd);
                eventEndDay.setHours(0, 0, 0, 0);
                
                const crossesMidnight = isOvernight && eventEndDay > eventStartDay && !isMorningContinuation;
                
                if (isMorningContinuation) {
                    // This is the morning portion of an overnight event (added to end day)
                    // Show from left edge of timeline to the end time
                    const morningEndPercent = this.timeToPercent(eventEnd, startHour, timelineDurationHours);
                    const morningWidthPercent = Math.max(morningEndPercent, 5); // Minimum 5% width
                    
                    const morningTimeLabel = `← prev day - ${this.formatTime(eventEnd)}`;
                    
                    html += `
                        <div class="timeline-event-block ${conflictClass} ${extraClass} overnight-continues-prev" 
                             style="left: 0%; width: ${morningWidthPercent}%;"
                             data-index="${isExisting ? '' : event._index}"
                             title="${event.title} (continues from previous day, ends ${this.formatTime(eventEnd)})">
                            <span class="overnight-arrow overnight-arrow-left">◀</span>
                            <span class="timeline-event-content">${icon} ${event.title}</span>
                            <div class="timeline-tooltip">${morningTimeLabel}</div>
                        </div>
                    `;
                } else if (crossesMidnight) {
                    // Evening portion (start to 11:59 PM) - show on current day
                    const eveningEnd = new Date(eventStart);
                    eveningEnd.setHours(23, 59, 59, 999);
                    
                    const eveningStartPercent = this.timeToPercent(eventStart, startHour, timelineDurationHours);
                    const eveningEndPercent = 100; // End of timeline
                    const eveningWidthPercent = Math.max(eveningEndPercent - eveningStartPercent, 2);
                    
                    const eveningTimeLabel = `${this.formatTime(eventStart)} → next day`;
                    const fullTimeLabel = `${this.formatTime(eventStart)} - ${this.formatTime(eventEnd)} (next day)`;
                    
                    html += `
                        <div class="timeline-event-block ${conflictClass} ${extraClass} overnight-continues-next" 
                             style="left: ${eveningStartPercent}%; width: ${eveningWidthPercent}%;"
                             data-index="${isExisting ? '' : event._index}"
                             title="${event.title} (${fullTimeLabel})">
                            ${!isExisting ? '<div class="timeline-handle timeline-handle-w" data-action="resize-left"></div>' : ''}
                            <span class="timeline-event-content">${icon} ${event.title}</span>
                            <span class="overnight-arrow overnight-arrow-right">▶</span>
                            <div class="timeline-tooltip">${eveningTimeLabel}</div>
                            ${!isExisting ? '<div class="timeline-handle timeline-handle-e" data-action="resize-right"></div>' : ''}
                            ${!isExisting ? `<button class="timeline-event-delete" data-delete-index="${event._index}" title="Remove this event">×</button>` : ''}
                        </div>
                    `;
                } else {
                    // Single block for same-day events
                    const startPercent = this.timeToPercent(eventStart, startHour, timelineDurationHours);
                    const endPercent = this.timeToPercent(eventEnd, startHour, timelineDurationHours);
                    const widthPercent = Math.max(endPercent - startPercent, 2);
                    
                    const timeLabel = `${this.formatTime(eventStart)} - ${this.formatTime(eventEnd)}`;

                    html += `
                        <div class="timeline-event-block ${conflictClass} ${extraClass}" 
                             style="left: ${startPercent}%; width: ${widthPercent}%;"
                             data-index="${isExisting ? '' : event._index}"
                             title="${event.title} (${timeLabel})">
                            ${!isExisting ? '<div class="timeline-handle timeline-handle-w" data-action="resize-left"></div>' : ''}
                            <span class="timeline-event-content">${icon} ${event.title}</span>
                            <div class="timeline-tooltip">${timeLabel}</div>
                            ${!isExisting ? '<div class="timeline-handle timeline-handle-e" data-action="resize-right"></div>' : ''}
                            ${!isExisting ? `<button class="timeline-event-delete" data-delete-index="${event._index}" title="Remove this event">×</button>` : ''}
                        </div>
                    `;
                }
            });

            html += `</div></div>`;
        });

        previewContainer.innerHTML = html;
        
        // Setup interactions
        this.setupTimelineInteractions();
    }

    /**
     * Convert date to percentage on timeline
     */
    timeToPercent(date, startHour, totalHours) {
        const h = date.getHours();
        const m = date.getMinutes();
        
        // Calculate minutes from start of timeline
        let minutesFromStart = (h - startHour) * 60 + m;
        const totalMinutes = totalHours * 60;
        
        // Clamp
        if (minutesFromStart < 0) minutesFromStart = 0;
        if (minutesFromStart > totalMinutes) minutesFromStart = totalMinutes;
        
        return (minutesFromStart / totalMinutes) * 100;
    }

    /**
     * Convert percentage to time string (HH:MM)
     */
    percentToTime(percent, startHour, totalHours) {
        const totalMinutes = totalHours * 60;
        const minutesFromStart = (percent / 100) * totalMinutes;
        
        let h = Math.floor(minutesFromStart / 60) + startHour;
        let m = Math.round(minutesFromStart % 60);
        
        // Round to nearest 15 mins
        m = Math.round(m / 15) * 15;
        if (m === 60) {
            m = 0;
            h += 1;
        }
        
        return { h, m };
    }

    /**
     * Format time for display
     */
    formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    /**
     * Setup drag and drop interactions for timeline
     */
    setupTimelineInteractions() {
        const container = document.getElementById('multi-event-preview');
        if (!container) return;

        let activeDrag = null;

        // Delete button handler
        container.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.timeline-event-delete');
            if (!deleteBtn) return;

            e.stopPropagation();
            const index = parseInt(deleteBtn.dataset.deleteIndex);
            this.deleteMultiEventFromPreview(index);
        });

        const startDrag = (e) => {
            // Handle both mouse and touch events
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            
            const handle = e.target.closest('.timeline-handle');
            const block = e.target.closest('.timeline-event-block');
            
            if (!block) return;
            if (block.classList.contains('existing-event')) return;

            e.preventDefault(); // Prevent text selection

            const index = parseInt(block.dataset.index);
            const event = this.pendingMultiEvents[index];
            const track = block.closest('.timeline-track-wrapper');
            const trackRect = track.getBoundingClientRect();
            
            let action = 'move';
            if (handle) {
                action = handle.dataset.action;
            }

            activeDrag = {
                element: block,
                event: event,
                index: index,
                action: action,
                startX: clientX,
                startLeft: parseFloat(block.style.left),
                startWidth: parseFloat(block.style.width),
                trackWidth: trackRect.width,
                startHour: 5, // Matches render config
                totalHours: 18 // Matches render config
            };

            block.style.zIndex = 100;
        };

        container.addEventListener('mousedown', startDrag);
        container.addEventListener('touchstart', startDrag, { passive: false });

        const moveDrag = (e) => {
            if (!activeDrag) return;

            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const deltaX = clientX - activeDrag.startX;
            const deltaPercent = (deltaX / activeDrag.trackWidth) * 100;

            let newLeft = activeDrag.startLeft;
            let newWidth = activeDrag.startWidth;

            if (activeDrag.action === 'move') {
                newLeft = activeDrag.startLeft + deltaPercent;
                // Clamp
                newLeft = Math.max(0, Math.min(100 - newWidth, newLeft));
                
                activeDrag.element.style.left = `${newLeft}%`;
            } else if (activeDrag.action === 'resize-left') {
                newLeft = activeDrag.startLeft + deltaPercent;
                newWidth = activeDrag.startWidth - deltaPercent;
                
                // Min width check (approx 15 mins)
                if (newWidth < 2) {
                    newLeft = activeDrag.startLeft + activeDrag.startWidth - 2;
                    newWidth = 2;
                }
                // Clamp left
                if (newLeft < 0) {
                    newWidth += newLeft;
                    newLeft = 0;
                }

                activeDrag.element.style.left = `${newLeft}%`;
                activeDrag.element.style.width = `${newWidth}%`;
            } else if (activeDrag.action === 'resize-right') {
                newWidth = activeDrag.startWidth + deltaPercent;
                
                // Min width check
                if (newWidth < 2) newWidth = 2;
                // Clamp right
                if (activeDrag.startLeft + newWidth > 100) {
                    newWidth = 100 - activeDrag.startLeft;
                }

                activeDrag.element.style.width = `${newWidth}%`;
            }

            // Update tooltip with live time
            const startPercent = newLeft;
            const endPercent = newLeft + newWidth;
            
            const startTime = this.percentToTime(startPercent, activeDrag.startHour, activeDrag.totalHours);
            const endTime = this.percentToTime(endPercent, activeDrag.startHour, activeDrag.totalHours);
            
            const format = (t) => {
                const d = new Date();
                d.setHours(t.h, t.m);
                return this.formatTime(d);
            };

            const tooltip = activeDrag.element.querySelector('.timeline-tooltip');
            if (tooltip) {
                tooltip.textContent = `${format(startTime)} - ${format(endTime)}`;
            }
        };

        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('touchmove', moveDrag, { passive: false });

        const endDrag = (e) => {
            if (!activeDrag) return;

            // Apply changes
            const style = activeDrag.element.style;
            const finalLeft = parseFloat(style.left);
            const finalWidth = parseFloat(style.width);
            
            const startPercent = finalLeft;
            const endPercent = finalLeft + finalWidth;
            
            const startTime = this.percentToTime(startPercent, activeDrag.startHour, activeDrag.totalHours);
            const endTime = this.percentToTime(endPercent, activeDrag.startHour, activeDrag.totalHours);

            // Update event object
            const event = activeDrag.event;
            
            // Keep original date, update time
            const newStart = new Date(event.start);
            newStart.setHours(startTime.h, startTime.m);
            
            const newEnd = new Date(event.end);
            // Handle day rollover if needed, but for now assume same day for daily visits
            // If end time is less than start time, it might be next day? 
            // But our timeline is 5am-11pm same day.
            newEnd.setFullYear(newStart.getFullYear(), newStart.getMonth(), newStart.getDate());
            newEnd.setHours(endTime.h, endTime.m);

            event.start = newStart;
            event.end = newEnd;

            // Re-render to snap to grid and update conflicts
            this.renderMultiEventTimeline();

            activeDrag = null;
        };

        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    }

    /**
     * Delete an event from the preview
     * @param {number} index - Index of event to delete
     */
    deleteMultiEventFromPreview(index) {
        if (!this.pendingMultiEvents || index < 0 || index >= this.pendingMultiEvents.length) {
            return;
        }

        const event = this.pendingMultiEvents[index];
        const eventTitle = event.title;

        // Confirm deletion
        const confirmed = confirm(`Remove "${eventTitle}" from the schedule?`);
        if (!confirmed) return;

        // Remove from array
        this.pendingMultiEvents.splice(index, 1);

        // Re-render timeline
        this.renderMultiEventTimeline();

        Utils.showToast(`Removed "${eventTitle}" from schedule`, 'success');
    }

    /**
     * Get multi-event configuration from form
     */
    getMultiEventConfig() {
        const bookingType = document.querySelector('input[name="booking-type"]:checked')?.value || 'daily-visits';

        const config = {
            clientName: document.getElementById('multi-client-name').value.trim(),
            location: document.getElementById('multi-location').value.trim(),
            startDate: document.getElementById('multi-start-date').value,
            endDate: document.getElementById('multi-end-date').value,
            bookingType: bookingType,
        };

        if (bookingType === 'daily-visits') {
            config.visits = this.getVisitSlotsData('visit-slots-container');
            
            const separateWeekend = document.getElementById('multi-separate-weekend').checked;
            if (separateWeekend) {
                config.weekendVisits = this.getVisitSlotsData('weekend-visit-slots-container');
            }
        } else {
            config.overnightConfig = {
                templateId: document.getElementById('multi-overnight-template').value || null,
                arrivalTime: document.getElementById('multi-overnight-start').value || '20:00',
                departureTime: document.getElementById('multi-overnight-end').value || '08:00',
            };

            const enableDropins = document.getElementById('multi-enable-dropins').checked;
            config.dropinConfig = {
                enabled: enableDropins,
                visits: enableDropins ? this.getVisitSlotsData('overnight-dropin-slots-container') : [],
                skipFirstDay: document.getElementById('multi-skip-first-day').checked,
                skipLastDay: document.getElementById('multi-skip-last-day').checked,
            };
        }

        return config;
    }

    /**
     * Create all pending multi-events
     */
    async createMultiEvents() {
        if (!this.pendingMultiEvents || this.pendingMultiEvents.length === 0) {
            Utils.showToast('No events to create', 'warning');
            return;
        }

        // Add all events to state
        this.state.events.push(...this.pendingMultiEvents);

        // Save to storage
        this.dataManager.saveData(this.getPersistentState());

        // Close modal
        Utils.hideModal('multi-event-modal');

        // Re-render current view
        await this.renderCurrentView();
        this.renderer.updateWorkloadIndicator(this.state);

        const count = this.pendingMultiEvents.length;
        Utils.showToast(`✅ Created ${count} event${count !== 1 ? 's' : ''}!`, 'success');

        // Clear pending events
        this.pendingMultiEvents = null;
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
     * Setup event listeners for threshold inputs to update preview in real-time
     */
    setupThresholdPreviewListeners() {
        // Get all threshold input fields
        const thresholdInputIds = [
            'threshold-daily-comfortable', 'threshold-daily-busy', 'threshold-daily-overload',
            'threshold-weekly-comfortable', 'threshold-weekly-busy', 'threshold-weekly-overload',
            'threshold-monthly-comfortable', 'threshold-monthly-busy', 'threshold-monthly-overload'
        ];

        // Add input event listener to each field
        thresholdInputIds.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    this.updateThresholdPreviews();
                });
            }
        });

        // Initial preview update
        this.updateThresholdPreviews();
    }

    /**
     * Update the threshold preview boxes with current input values
     */
    updateThresholdPreviews() {
        // Daily thresholds
        const dailyComf = parseFloat(document.getElementById('threshold-daily-comfortable')?.value) || 0;
        const dailyBusy = parseFloat(document.getElementById('threshold-daily-busy')?.value) || 0;
        const dailyHigh = parseFloat(document.getElementById('threshold-daily-overload')?.value) || 0;

        // Update daily preview
        this.updatePreviewElement('preview-daily-comfortable', dailyComf);
        this.updatePreviewElement('preview-daily-busy-start', dailyComf);
        this.updatePreviewElement('preview-daily-busy', dailyBusy);
        this.updatePreviewElement('preview-daily-high-start', dailyBusy);
        this.updatePreviewElement('preview-daily-high', dailyHigh);
        this.updatePreviewElement('preview-daily-burnout-start', dailyHigh);

        // Weekly thresholds
        const weeklyComf = parseFloat(document.getElementById('threshold-weekly-comfortable')?.value) || 0;
        const weeklyBusy = parseFloat(document.getElementById('threshold-weekly-busy')?.value) || 0;
        const weeklyHigh = parseFloat(document.getElementById('threshold-weekly-overload')?.value) || 0;

        // Update weekly preview
        this.updatePreviewElement('preview-weekly-comfortable', weeklyComf);
        this.updatePreviewElement('preview-weekly-busy-start', weeklyComf);
        this.updatePreviewElement('preview-weekly-busy', weeklyBusy);
        this.updatePreviewElement('preview-weekly-high-start', weeklyBusy);
        this.updatePreviewElement('preview-weekly-high', weeklyHigh);
        this.updatePreviewElement('preview-weekly-burnout-start', weeklyHigh);

        // Monthly thresholds
        const monthlyComf = parseFloat(document.getElementById('threshold-monthly-comfortable')?.value) || 0;
        const monthlyBusy = parseFloat(document.getElementById('threshold-monthly-busy')?.value) || 0;
        const monthlyHigh = parseFloat(document.getElementById('threshold-monthly-overload')?.value) || 0;

        // Update monthly preview
        this.updatePreviewElement('preview-monthly-comfortable', monthlyComf);
        this.updatePreviewElement('preview-monthly-busy-start', monthlyComf);
        this.updatePreviewElement('preview-monthly-busy', monthlyBusy);
        this.updatePreviewElement('preview-monthly-high-start', monthlyBusy);
        this.updatePreviewElement('preview-monthly-high', monthlyHigh);
        this.updatePreviewElement('preview-monthly-burnout-start', monthlyHigh);
    }

    /**
     * Update a single preview element with a value
     * @param {string} elementId - ID of the element to update
     * @param {number} value - Value to display
     */
    updatePreviewElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
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
     * Download events as JSON file for debugging
     */
    downloadEventsJSON() {
        try {
            // Get current events
            const events = this.state.events || [];
            
            // Create JSON with metadata
            const data = {
                exportDate: new Date().toISOString(),
                eventCount: events.length,
                selectedCalendars: this.state.selectedCalendars || [],
                events: events
            };
            
            // Convert to JSON with pretty formatting
            const jsonStr = JSON.stringify(data, null, 2);
            
            // Create blob and download
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `calendar-events-${timestamp}.json`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`📥 Downloaded ${events.length} events as JSON`);
            Utils.showToast(`Downloaded ${events.length} events as JSON`, 'success');
        } catch (error) {
            console.error('❌ Error downloading events JSON:', error);
            Utils.showToast('Error downloading events JSON', 'error');
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

        // Reset form to defaults
        document.getElementById('export-work-events-only').checked = true;
        this.resetGroupLevels();
        this.resetSortLevels();
        
        document.getElementById('export-include-time').checked = true;
        document.getElementById('export-include-location').checked = false;
        document.getElementById('export-format').value = 'text';

        // Reset preview section
        document.getElementById('export-preview-section').style.display = 'none';
        document.getElementById('export-loading').style.display = 'none';
        document.getElementById('export-copy-to-clipboard').style.display = 'none';
        document.getElementById('export-download-file').style.display = 'none';

        Utils.showModal('export-event-list-modal');
        
        // Ensure grouping options are updated after modal is shown
        this.updateGroupingOptions();
    }

    /**
     * Reset group levels to default (single level with "date")
     */
    resetGroupLevels() {
        const container = document.getElementById('group-levels-container');
        if (!container) return;

        // Clear existing levels
        container.innerHTML = '';

        // Add first level
        const levelDiv = document.createElement('div');
        levelDiv.className = 'group-level';
        levelDiv.dataset.level = '1';
        levelDiv.innerHTML = `
            <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
                <span class="group-level-label" style="min-width: 20px;">1.</span>
                <select class="select group-level-select" data-level="1" style="flex: 1;">
                    <option value="none">No grouping (flat list)</option>
                    <option value="date" selected>Date</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="client">Client/Pet</option>
                    <option value="service">Service Type</option>
                </select>
                <button type="button" class="btn-icon remove-group-level" data-level="1" style="display: none;" title="Remove this grouping level">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        container.appendChild(levelDiv);

        // Add change listener to update available options
        const select = levelDiv.querySelector('.group-level-select');
        select.addEventListener('change', () => {
            this.updateGroupingOptions();
        });

        this.updateGroupLevelButtons();
        this.updateGroupingOptions();
    }

    /**
     * Add a new grouping level
     */
    addGroupLevel() {
        const container = document.getElementById('group-levels-container');
        if (!container) return;

        const currentLevels = container.querySelectorAll('.group-level').length;
        const newLevel = currentLevels + 1;

        // Maximum 4 levels to keep it manageable
        if (newLevel > 4) {
            alert('Maximum 4 grouping levels allowed');
            return;
        }

        // Get currently selected values to determine a good default
        const existingSelects = container.querySelectorAll('.group-level-select');
        const selectedValues = Array.from(existingSelects).map(s => s.value);
        
        // Choose first available option that's not already selected (exclude 'none' for additional levels)
        const availableOptions = ['date', 'week', 'month', 'client', 'service'];
        const defaultValue = availableOptions.find(opt => !selectedValues.includes(opt)) || 'date';

        const levelDiv = document.createElement('div');
        levelDiv.className = 'group-level';
        levelDiv.dataset.level = newLevel;
        levelDiv.innerHTML = `
            <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <button type="button" class="btn-icon btn-reorder move-group-up" data-level="${newLevel}" style="padding: 2px; width: 20px; height: 14px; display: none;" title="Move up">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button type="button" class="btn-icon btn-reorder move-group-down" data-level="${newLevel}" style="padding: 2px; width: 20px; height: 14px; display: none;" title="Move down">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <span class="group-level-label" style="min-width: 20px;">${newLevel}.</span>
                <select class="select group-level-select" data-level="${newLevel}" style="flex: 1;">
                    <option value="date"${defaultValue === 'date' ? ' selected' : ''}>Date</option>
                    <option value="week"${defaultValue === 'week' ? ' selected' : ''}>Week</option>
                    <option value="month"${defaultValue === 'month' ? ' selected' : ''}>Month</option>
                    <option value="client"${defaultValue === 'client' ? ' selected' : ''}>Client/Pet</option>
                    <option value="service"${defaultValue === 'service' ? ' selected' : ''}>Service Type</option>
                </select>
                <button type="button" class="btn-icon remove-group-level" data-level="${newLevel}" title="Remove this grouping level">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        container.appendChild(levelDiv);

        // Add change listener to update available options
        const select = levelDiv.querySelector('.group-level-select');
        select.addEventListener('change', () => {
            this.updateGroupingOptions();
        });

        this.updateGroupLevelButtons();
        this.updateGroupingOptions();
    }

    /**
     * Remove a grouping level
     */
    removeGroupLevel(level) {
        const container = document.getElementById('group-levels-container');
        if (!container) return;

        const levels = container.querySelectorAll('.group-level');
        
        // Don't allow removing if only one level
        if (levels.length <= 1) {
            return;
        }

        // Remove the specified level
        const levelToRemove = container.querySelector(`.group-level[data-level="${level}"]`);
        if (levelToRemove) {
            levelToRemove.remove();
        }

        // Renumber remaining levels
        const remainingLevels = container.querySelectorAll('.group-level');
        remainingLevels.forEach((levelDiv, index) => {
            const newLevel = index + 1;
            levelDiv.dataset.level = newLevel;
            levelDiv.querySelector('.group-level-label').textContent = `${newLevel}.`;
            levelDiv.querySelector('.group-level-select').dataset.level = newLevel;
            levelDiv.querySelector('.group-level-sort').dataset.level = newLevel;
            const removeBtn = levelDiv.querySelector('.remove-group-level');
            if (removeBtn) {
                removeBtn.dataset.level = newLevel;
            }
        });

        this.updateGroupLevelButtons();
        this.updateGroupingOptions();
    }

    /**
     * Reorder a grouping level
     * @param {number} level - The level to move
     * @param {string} direction - 'up' or 'down'
     */
    reorderGroupLevel(level, direction) {
        const container = document.getElementById('group-levels-container');
        if (!container) return;

        const levels = Array.from(container.querySelectorAll('.group-level'));
        const currentIndex = levels.findIndex(div => parseInt(div.dataset.level) === level);
        
        if (currentIndex === -1) return;
        
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        
        // Check bounds
        if (targetIndex < 0 || targetIndex >= levels.length) return;
        
        // Swap the elements in the DOM
        const currentElement = levels[currentIndex];
        const targetElement = levels[targetIndex];
        
        if (direction === 'up') {
            container.insertBefore(currentElement, targetElement);
        } else {
            container.insertBefore(targetElement, currentElement);
        }
        
        // Renumber all levels
        const allLevels = container.querySelectorAll('.group-level');
        allLevels.forEach((levelDiv, index) => {
            const newLevel = index + 1;
            levelDiv.dataset.level = newLevel;
            levelDiv.querySelector('.group-level-label').textContent = `${newLevel}.`;
            levelDiv.querySelector('.group-level-select').dataset.level = newLevel;
            const removeBtn = levelDiv.querySelector('.remove-group-level');
            if (removeBtn) {
                removeBtn.dataset.level = newLevel;
            }
            const moveUpBtn = levelDiv.querySelector('.move-group-up');
            if (moveUpBtn) {
                moveUpBtn.dataset.level = newLevel;
            }
            const moveDownBtn = levelDiv.querySelector('.move-group-down');
            if (moveDownBtn) {
                moveDownBtn.dataset.level = newLevel;
            }
        });
        
        this.updateGroupLevelButtons();
        this.updateGroupingOptions();
    }

    /**
     * Update visibility of remove buttons based on number of levels
     */
    updateGroupLevelButtons() {
        const container = document.getElementById('group-levels-container');
        if (!container) return;

        const levels = container.querySelectorAll('.group-level');
        const showRemoveButtons = levels.length > 1;
        const showReorderButtons = levels.length > 1;

        levels.forEach((levelDiv, index) => {
            const removeBtn = levelDiv.querySelector('.remove-group-level');
            if (removeBtn) {
                removeBtn.style.display = showRemoveButtons ? 'inline-flex' : 'none';
            }
            
            // Update reorder buttons visibility and disabled state
            const moveUpBtn = levelDiv.querySelector('.move-group-up');
            const moveDownBtn = levelDiv.querySelector('.move-group-down');
            
            if (moveUpBtn) {
                moveUpBtn.style.display = showReorderButtons ? 'inline-flex' : 'none';
                moveUpBtn.disabled = index === 0;  // Disable up button for first item
            }
            
            if (moveDownBtn) {
                moveDownBtn.style.display = showReorderButtons ? 'inline-flex' : 'none';
                moveDownBtn.disabled = index === levels.length - 1;  // Disable down button for last item
            }
        });

        // Disable add button if at max levels
        const addBtn = document.getElementById('add-group-level');
        if (addBtn) {
            addBtn.disabled = levels.length >= 4;
        }
    }

    /**
     * Update grouping options to disable already-selected values in earlier levels
     * (allows reusing options that appear later in the chain)
     */
    updateGroupingOptions() {
        const container = document.getElementById('group-levels-container');
        if (!container) return;

        const selects = Array.from(container.querySelectorAll('.group-level-select'));
        
        // Update each select
        selects.forEach((select, currentIndex) => {
            const currentValue = select.value;
            const options = select.querySelectorAll('option');

            // Get values selected in EARLIER levels only
            const earlierSelectedValues = selects
                .slice(0, currentIndex)  // Only look at earlier selects
                .map(s => s.value)
                .filter(val => val !== 'none');

            options.forEach(option => {
                // Don't disable 'none' option
                if (option.value === 'none') {
                    option.disabled = false;
                    return;
                }

                // Disable if selected in an EARLIER level and not the current value
                option.disabled = earlierSelectedValues.includes(option.value) && option.value !== currentValue;
            });
            
            // If current value is now disabled, select the first non-disabled option
            const currentOption = select.querySelector(`option[value="${currentValue}"]`);
            if (currentOption && currentOption.disabled) {
                const firstEnabled = select.querySelector('option:not([disabled])');
                if (firstEnabled) {
                    select.value = firstEnabled.value;
                    // Trigger change event to update sort options
                    const levelDiv = select.closest('.group-level');
                    if (levelDiv) {
                        this.updateGroupingOptions();
                    }
                }
            }
        });
    }

    /**
     * Reset sort levels to default (single level with "time-asc")
     */
    resetSortLevels() {
        const container = document.getElementById('sort-levels-container');
        if (!container) return;

        // Clear existing levels
        container.innerHTML = '';

        // Add first level
        const levelDiv = document.createElement('div');
        levelDiv.className = 'sort-level';
        levelDiv.dataset.level = '1';
        levelDiv.innerHTML = `
            <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
                <span class="sort-level-label" style="min-width: 20px;">1.</span>
                <select class="select sort-level-select" data-level="1" style="flex: 1;">
                    <option value="time-asc" selected>Time (Early → Late)</option>
                    <option value="time-desc">Time (Late → Early)</option>
                    <option value="date-asc">Date (Old → New)</option>
                    <option value="date-desc">Date (New → Old)</option>
                    <option value="client-asc">Client (A → Z)</option>
                    <option value="client-desc">Client (Z → A)</option>
                    <option value="service-asc">Service (A → Z)</option>
                    <option value="service-desc">Service (Z → A)</option>
                </select>
                <button type="button" class="btn-icon remove-sort-level" data-level="1" style="display: none;" title="Remove this sort level">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        container.appendChild(levelDiv);

        this.updateSortLevelButtons();
    }

    /**
     * Add a new sort level
     */
    addSortLevel() {
        const container = document.getElementById('sort-levels-container');
        if (!container) return;

        const currentLevels = container.querySelectorAll('.sort-level').length;
        const newLevel = currentLevels + 1;

        // Maximum 3 levels for sorting
        if (newLevel > 3) {
            return;
        }

        // Get currently selected values to determine a good default
        const existingSelects = container.querySelectorAll('.sort-level-select');
        const selectedValues = Array.from(existingSelects).map(s => s.value.split('-')[0]);
        
        // Choose first available option that's not already selected
        const availableOptions = ['time', 'date', 'client', 'service'];
        const defaultField = availableOptions.find(opt => !selectedValues.includes(opt)) || 'date';
        const defaultValue = `${defaultField}-asc`;

        const levelDiv = document.createElement('div');
        levelDiv.className = 'sort-level';
        levelDiv.dataset.level = newLevel;
        levelDiv.innerHTML = `
            <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
                <div style="display: flex; gap: 2px;">
                    <button type="button" class="btn-icon-mini move-level-up" data-level="${newLevel}" title="Move up" disabled>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <button type="button" class="btn-icon-mini move-level-down" data-level="${newLevel}" title="Move down" disabled>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
                <span class="sort-level-label" style="min-width: 20px;">${newLevel}.</span>
                <select class="select sort-level-select" data-level="${newLevel}" style="flex: 1;">
                    <option value="time-asc"${defaultValue === 'time-asc' ? ' selected' : ''}>Time (Early → Late)</option>
                    <option value="time-desc"${defaultValue === 'time-desc' ? ' selected' : ''}>Time (Late → Early)</option>
                    <option value="date-asc"${defaultValue === 'date-asc' ? ' selected' : ''}>Date (Old → New)</option>
                    <option value="date-desc"${defaultValue === 'date-desc' ? ' selected' : ''}>Date (New → Old)</option>
                    <option value="client-asc"${defaultValue === 'client-asc' ? ' selected' : ''}>Client (A → Z)</option>
                    <option value="client-desc"${defaultValue === 'client-desc' ? ' selected' : ''}>Client (Z → A)</option>
                    <option value="service-asc"${defaultValue === 'service-asc' ? ' selected' : ''}>Service (A → Z)</option>
                    <option value="service-desc"${defaultValue === 'service-desc' ? ' selected' : ''}>Service (Z → A)</option>
                </select>
                <button type="button" class="btn-icon remove-sort-level" data-level="${newLevel}" title="Remove this sort level">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        container.appendChild(levelDiv);

        this.updateSortLevelButtons();
    }

    /**
     * Remove a sort level
     */
    removeSortLevel(level) {
        const container = document.getElementById('sort-levels-container');
        if (!container) return;

        const levels = container.querySelectorAll('.sort-level');
        
        // Don't allow removing if only one level
        if (levels.length <= 1) {
            return;
        }

        // Remove the specified level
        const levelToRemove = container.querySelector(`.sort-level[data-level="${level}"]`);
        if (levelToRemove) {
            levelToRemove.remove();
        }

        // Renumber remaining levels
        const remainingLevels = container.querySelectorAll('.sort-level');
        remainingLevels.forEach((levelDiv, index) => {
            const newLevel = index + 1;
            levelDiv.dataset.level = newLevel;
            levelDiv.querySelector('.sort-level-label').textContent = `${newLevel}.`;
            levelDiv.querySelector('.sort-level-select').dataset.level = newLevel;
            const removeBtn = levelDiv.querySelector('.remove-sort-level');
            if (removeBtn) {
                removeBtn.dataset.level = newLevel;
            }
        });

        this.updateSortLevelButtons();
    }

    /**
     * Reorder a sort level
     * @param {number} level - The level to move
     * @param {string} direction - 'up' or 'down'
     */
    reorderSortLevel(level, direction) {
        const container = document.getElementById('sort-levels-container');
        if (!container) return;

        const levels = Array.from(container.querySelectorAll('.sort-level'));
        const currentIndex = levels.findIndex(div => parseInt(div.dataset.level) === level);
        
        if (currentIndex === -1) return;
        
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        
        // Check bounds
        if (targetIndex < 0 || targetIndex >= levels.length) return;
        
        // Swap the elements in the DOM
        const currentElement = levels[currentIndex];
        const targetElement = levels[targetIndex];
        
        if (direction === 'up') {
            container.insertBefore(currentElement, targetElement);
        } else {
            container.insertBefore(targetElement, currentElement);
        }
        
        // Renumber all levels
        const allLevels = container.querySelectorAll('.sort-level');
        allLevels.forEach((levelDiv, index) => {
            const newLevel = index + 1;
            levelDiv.dataset.level = newLevel;
            levelDiv.querySelector('.sort-level-label').textContent = `${newLevel}.`;
            levelDiv.querySelector('.sort-level-select').dataset.level = newLevel;
            const removeBtn = levelDiv.querySelector('.remove-sort-level');
            if (removeBtn) {
                removeBtn.dataset.level = newLevel;
            }
            const moveUpBtn = levelDiv.querySelector('.move-level-up');
            if (moveUpBtn) {
                moveUpBtn.dataset.level = newLevel;
            }
            const moveDownBtn = levelDiv.querySelector('.move-level-down');
            if (moveDownBtn) {
                moveDownBtn.dataset.level = newLevel;
            }
        });
        
        this.updateSortLevelButtons();
    }

    /**
     * Update visibility of remove buttons based on number of sort levels
     */
    updateSortLevelButtons() {
        const container = document.getElementById('sort-levels-container');
        if (!container) return;

        const levels = container.querySelectorAll('.sort-level');
        const showRemoveButtons = levels.length > 1;
        const showReorderButtons = levels.length > 1;

        levels.forEach((levelDiv, index) => {
            const removeBtn = levelDiv.querySelector('.remove-sort-level');
            if (removeBtn) {
                removeBtn.style.display = showRemoveButtons ? 'inline-flex' : 'none';
            }
            
            // Update reorder buttons visibility and disabled state
            const moveUpBtn = levelDiv.querySelector('.move-level-up');
            const moveDownBtn = levelDiv.querySelector('.move-level-down');
            
            if (moveUpBtn) {
                moveUpBtn.style.display = showReorderButtons ? 'inline-flex' : 'none';
                moveUpBtn.disabled = index === 0;  // Disable up button for first item
            }
            
            if (moveDownBtn) {
                moveDownBtn.style.display = showReorderButtons ? 'inline-flex' : 'none';
                moveDownBtn.disabled = index === levels.length - 1;  // Disable down button for last item
            }
        });

        // Disable add button if at max levels
        const addBtn = document.getElementById('add-sort-level');
        if (addBtn) {
            addBtn.disabled = levels.length >= 3;
        }
    }

    /**
     * Get the grouping configuration from the UI
     * @returns {Array<string>} Array of grouping field names
     */
    getGroupLevels() {
        const container = document.getElementById('group-levels-container');
        if (!container) return ['date'];

        const levelDivs = container.querySelectorAll('.group-level');
        const levels = [];
        
        levelDivs.forEach(div => {
            const fieldSelect = div.querySelector('.group-level-select');
            const field = fieldSelect ? fieldSelect.value : 'none';
            
            // Only add non-'none' values
            if (field !== 'none') {
                levels.push(field);
            }
        });
        
        return levels;
    }

    /**
     * Get the sort configuration from the UI
     * @returns {Array<{sortBy: string, sortOrder: string}>} Array of sort configurations
     */
    getSortLevels() {
        const container = document.getElementById('sort-levels-container');
        if (!container) return [{ sortBy: 'time', sortOrder: 'asc' }];

        const levelDivs = container.querySelectorAll('.sort-level');
        const levels = [];
        
        levelDivs.forEach(div => {
            const sortSelect = div.querySelector('.sort-level-select');
            if (sortSelect) {
                const [sortBy, sortOrder] = sortSelect.value.split('-');
                levels.push({ sortBy, sortOrder });
            }
        });
        
        return levels.length > 0 ? levels : [{ sortBy: 'time', sortOrder: 'asc' }];
    }

    /**
     * Get the sort configuration from the UI (legacy format for compatibility)
     * @returns {{groupSort: {sortBy: string, sortOrder: string}, eventSort: Array}}
     */
    getSortConfig() {
        // Group sort is derived from the first sort level or defaults to chronological
        const sortLevels = this.getSortLevels();
        
        // For groups, we use chronological sorting by default
        // The sort levels apply to events within groups
        return {
            groupSort: { sortBy: 'date', sortOrder: 'asc' },
            eventSort: sortLevels
        };
    }

    /**
     * Generate export preview - fetches events for the date range then generates preview
     */
    async generateExportPreview() {
        if (!this.eventListExporter) return;

        try {
            // Get form values
            const startDateInput = document.getElementById('export-start-date').value;
            const endDateInput = document.getElementById('export-end-date').value;
            
            if (!startDateInput || !endDateInput) {
                alert('Please specify both start and end dates.');
                return;
            }

            const includeTime = document.getElementById('export-include-time').checked;
            const includeLocation = document.getElementById('export-include-location').checked;
            const groupLevels = this.getGroupLevels();
            const sortConfig = this.getSortConfig();
            const format = document.getElementById('export-format').value;
            const workEventsOnly = document.getElementById('export-work-events-only').checked;
            const searchTerm = document.getElementById('export-search-term').value;

            // Build groupBy string from levels (e.g., "client-service-date") or 'none' if empty
            const groupBy = groupLevels.length > 0 ? groupLevels.join('-') : 'none';
            
            // Extract sort configuration from the dedicated sort controls
            const { groupSort, eventSort } = sortConfig;

            // Parse dates
            const startDate = new Date(startDateInput + 'T00:00:00');
            const endDate = new Date(endDateInput + 'T23:59:59');

            // Show loading indicator
            document.getElementById('export-loading').style.display = 'block';
            document.getElementById('export-preview-section').style.display = 'none';
            document.getElementById('export-generate-preview').disabled = true;

            // Fetch events for the date range from the calendar API
            let eventsToExport = [];
            
            try {
                // Check if the date range is already covered by loaded events
                const needsNewFetch = this.needsEventFetch(startDate, endDate);
                
                if (needsNewFetch && this.calendarApi && this.calendarApi.isSignedIn) {
                    // Fetch events from calendar API for the specified range
                    const fetchedEvents = await this.calendarApi.fetchAllCalendarEvents(startDate, endDate);
                    eventsToExport = fetchedEvents;
                } else {
                    // Use already loaded events
                    eventsToExport = this.state.events;
                }
            } catch (fetchError) {
                console.warn('Could not fetch events from calendar, using cached events:', fetchError);
                eventsToExport = this.state.events;
            }

            // Generate preview based on format
            const exportOptions = {
                startDate,
                endDate,
                includeTime,
                includeLocation,
                groupBy,
                groupSort,
                eventSort,
                workEventsOnly,
                searchTerm
            };

            const preview = this.eventListExporter.buildPreview(eventsToExport, exportOptions);

            // Hide loading, show preview
            document.getElementById('export-loading').style.display = 'none';
            document.getElementById('export-generate-preview').disabled = false;

            // Display preview
            const previewBody = format === 'csv' ? preview.csv : preview.text;
            document.getElementById('export-preview').textContent = previewBody;
            this.renderExportGroups(preview.groups);
            this.renderExportTable(preview.rows, includeTime, includeLocation);

            document.getElementById('export-event-count').textContent = `${preview.count} event${preview.count !== 1 ? 's' : ''}`;
            document.getElementById('export-preview-section').style.display = 'block';
            document.getElementById('export-copy-to-clipboard').style.display = 'inline-flex';
            document.getElementById('export-download-file').style.display = 'inline-flex';

            // Store preview for later use
            this.exportPreview = preview;
            this.exportFormat = format;

        } catch (error) {
            console.error('Error generating export preview:', error);
            document.getElementById('export-loading').style.display = 'none';
            document.getElementById('export-generate-preview').disabled = false;
            alert('Error generating preview: ' + (error.message || 'Unknown error'));
        }
    }

    renderExportGroups(groups = []) {
        const container = document.getElementById('export-group-summary');
        if (!container) return;

        if (!groups.length) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = groups.map(group => {
            return `<span class="badge">${group.label} (${group.count})</span>`;
        }).join('');
    }

    renderExportTable(rows = [], includeTime = false, includeLocation = false) {
        const tbody = document.getElementById('export-preview-table-body');
        if (!tbody) return;

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-muted">No events match this filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(row => {
            return `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${row.dateLabel}</div>
                        ${row.groupPath && row.groupPath.length ? `<div class="text-muted" style="font-size: 0.8rem;">${row.groupPath.join(' / ')}</div>` : ''}
                    </td>
                    <td>${row.client}</td>
                    <td>${row.service}</td>
                    <td>${row.durationMinutes}m</td>
                    <td>${includeTime ? row.timeLabel || '—' : '—'}</td>
                    <td>${includeLocation ? (row.location || '—') : '—'}</td>
                </tr>
            `;
        }).join('');
    }

    handleExportTableSort(field) {
        const sortableFields = ['date', 'client', 'service', 'time'];
        if (!sortableFields.includes(field)) return;

        const primarySort = document.querySelector('.sort-level-select');
        if (!primarySort) return;

        const current = primarySort.value || '';
        const isSameField = current.startsWith(field);
        const nextDirection = isSameField && current.endsWith('asc') ? 'desc' : 'asc';
        const candidate = `${field}-${nextDirection}`;

        // Update select value if option exists
        const hasOption = Array.from(primarySort.options).some(opt => opt.value === candidate);
        if (!hasOption) return;

        primarySort.value = candidate;
        primarySort.dispatchEvent(new Event('change'));
        this.generateExportPreview();
    }

    /**
     * Check if we need to fetch events for a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {boolean} True if fetch is needed
     */
    needsEventFetch(startDate, endDate) {
        if (!this.state.events || this.state.events.length === 0) {
            return true;
        }

        // Check if the date range is significantly outside currently loaded events
        const loadedEvents = this.state.events.filter(e => !e.ignored);
        if (loadedEvents.length === 0) return true;

        const sortedEvents = [...loadedEvents].sort((a, b) => new Date(a.start) - new Date(b.start));
        const earliestLoaded = new Date(sortedEvents[0].start);
        const latestLoaded = new Date(sortedEvents[sortedEvents.length - 1].start);

        // Need fetch if requested range is significantly outside loaded range
        const bufferDays = 7;
        const bufferMs = bufferDays * 24 * 60 * 60 * 1000;

        return startDate < new Date(earliestLoaded.getTime() - bufferMs) ||
               endDate > new Date(latestLoaded.getTime() + bufferMs);
    }

    /**
     * Copy export to clipboard
     */
    async copyExportToClipboard() {
        if (!this.eventListExporter || !this.exportPreview) return;

        try {
            const content = this.exportFormat === 'csv' ? this.exportPreview.csv : this.exportPreview.text;
            const success = content ? await this.eventListExporter.copyToClipboard(content) : false;

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
            const content = this.exportFormat === 'csv' ? this.exportPreview.csv : this.exportPreview.text;
            if (!content) return;

            // Generate filename
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const extension = this.exportFormat === 'csv' ? 'csv' : 'txt';
            const mimeType = this.exportFormat === 'csv' ? 'text/csv' : 'text/plain';
            const filename = `work-events-${dateStr}.${extension}`;

            // Download file
            this.eventListExporter.downloadAsFile(content, filename, mimeType);

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
