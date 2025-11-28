/**
 * GPS Admin - Rendering Engine
 * Handles all UI rendering and DOM manipulation
 */

class RenderEngine {
    constructor(calculator, eventProcessor) {
        this.calculator = calculator;
        this.eventProcessor = eventProcessor;
    }

    /**
     * Render dashboard view
     * @param {Object} state - Application state
     */
    async renderDashboard(state) {
        await this.renderQuickStats(state);
        this.renderUpcomingAppointments(state);
        this.renderWeekComparison(state);
        this.renderWeekOverviewEnhanced(state);
        this.renderWeeklyInsights(state);
        this.renderRecommendations(state);
    }

    /**
     * Render quick stats cards
     * @param {Object} state - Application state
     */
    async renderQuickStats(state) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayEvents = this.eventProcessor.getEventsForDate(state.events, today);
        const metrics = this.calculator.calculateWorkloadMetrics(todayEvents, today, {
            includeTravel: state.settings.includeTravelTime
        });

        // Calculate travel time
        const travelMinutes = metrics.travelMinutes;

        // Update stats
        document.getElementById('stat-today').textContent = todayEvents.length;
        document.getElementById('stat-hours').textContent = Utils.formatDuration(metrics.workMinutes + travelMinutes);
        document.getElementById('stat-drive').textContent = Utils.formatDuration(travelMinutes);
        document.getElementById('stat-workload').textContent = metrics.label;
    }

    /**
     * Render week overview
     * @param {Object} state - Application state
     */
    renderWeekOverview(state) {
        const weekOverview = document.getElementById('week-overview');
        if (!weekOverview) return;

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        let html = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            date.setHours(0, 0, 0, 0);

            const dayEvents = this.eventProcessor.getEventsForDate(state.events, date);
            const metrics = this.calculator.calculateWorkloadMetrics(dayEvents, date, { includeTravel: true });
            
            const hours = Utils.formatHours(metrics.totalHours);
            const workloadLevel = metrics.level;

            const dateStr = date.toISOString();

            html += `
                <div class="week-day ${workloadLevel}" data-date="${dateStr}" style="cursor: pointer;">
                    <div class="week-day-name">${Utils.DAY_NAMES_SHORT[i]}</div>
                    <div class="week-day-date">${date.getDate()}</div>
                    <div class="week-day-hours">${hours}</div>
                </div>
            `;
        }

        weekOverview.innerHTML = html;

        // Add click handlers
        weekOverview.querySelectorAll('.week-day').forEach(dayElement => {
            dayElement.addEventListener('click', () => {
                const dateStr = dayElement.dataset.date;
                this.showDayDetails(state, new Date(dateStr));
            });
        });
    }

    /**
     * Render week comparison badge
     * @param {Object} state - Application state
     */
    renderWeekComparison(state) {
        const container = document.getElementById('week-comparison');
        if (!container) return;

        const comparison = this.calculator.getWeekComparison(state.events, new Date());
        const arrow = comparison.trend === 'positive' ? '↗️' : comparison.trend === 'negative' ? '↘️' : '→';
        const sign = comparison.diff >= 0 ? '+' : '';

        container.className = 'comparison-badge ' + comparison.trend;
        container.innerHTML = '<span class="trend-arrow">' + arrow + '</span> ' +
                              sign + Utils.formatHours(Math.abs(comparison.diff)) + ' vs last week';
    }

    /**
     * Show day details modal
     * @param {Object} state - Application state
     * @param {Date} date - Date to show
     */
    showDayDetails(state, date) {
        const dateKey = new Date(date);
        dateKey.setHours(0, 0, 0, 0);

        const dayEvents = this.eventProcessor.getEventsForDate(state.events, dateKey);
        const sortedEvents = dayEvents.sort((a, b) => a.start - b.start);
        
        const metrics = this.calculator.calculateWorkloadMetrics(sortedEvents, dateKey, { includeTravel: true });
        
        // Count only work events (excluding ending housesits)
        const workEvents = sortedEvents.filter(event => {
            const isWork = event.isWorkEvent || this.eventProcessor.isWorkEvent(event);
            if (!isWork) return false;
            
            // Exclude overnight events that are ending
            if (this.eventProcessor.isOvernightEvent(event)) {
                return !this.eventProcessor.isOvernightEndDate(event, dateKey);
            }
            return true;
        });
        const workEventCount = workEvents.length;
        
        // Check housesit status
        const hasHousesitEnding = metrics.housesits.some(h => h.isEndDate);
        const hasActiveHousesit = metrics.housesits.some(h => !h.isEndDate);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = dateKey.getTime() === today.getTime();

        const titleElement = document.getElementById('day-details-title');
        const subtitleElement = document.getElementById('day-details-subtitle');

        titleElement.textContent = `${Utils.DAY_NAMES_LONG[dateKey.getDay()]}, ${Utils.MONTH_NAMES[dateKey.getMonth()]} ${dateKey.getDate()}`;
        if (isToday) {
            titleElement.textContent += ' (Today)';
        }
        
        const workHours = Utils.formatHours(metrics.workHours);
        const travelHours = Utils.formatHours(metrics.travelHours);
        const totalHours = Utils.formatHours(metrics.totalHours);
        
        let housesitLabel = '';
        if (hasActiveHousesit) {
            housesitLabel = '<span class="day-details-housesit active"><span class="housesit-icon-inline">🏠</span>+ housesit</span>';
        } else if (hasHousesitEnding) {
            housesitLabel = '<span class="day-details-housesit ending"><span class="housesit-icon-inline">🏠</span>housesit ends</span>';
        }

        subtitleElement.innerHTML = `
            <div class="day-details-stats">
                <span class="day-details-stat">📅 ${workEventCount} appointment${workEventCount !== 1 ? 's' : ''}</span>
                <span class="day-details-stat">⏱️ ${workHours} work</span>
                <span class="day-details-stat">🚗 ${travelHours} travel</span>
                <span class="day-details-stat total">📊 ${totalHours} total</span>
            </div>
            <div class="day-details-badges">
                ${housesitLabel ? housesitLabel : ''}
                <span class="workload-badge ${metrics.level}">${metrics.label}</span>
            </div>
        `;

        this.renderDayDetailsEvents(sortedEvents, dateKey);
        Utils.showModal('day-details-modal');
    }

    /**
     * Render events in day details modal
     * @param {Array} events - Events to render
     * @param {Date} targetDate - The date being displayed
     */
    renderDayDetailsEvents(events, targetDate) {
        const container = document.getElementById('day-details-content');

        if (events.length === 0) {
            container.innerHTML = `
                <div class="day-details-empty">
                    <div class="day-details-empty-icon">📅</div>
                    <div>No appointments scheduled for this day</div>
                </div>
            `;
            return;
        }

        let html = '<div class="day-details-events">';

        events.forEach(event => {
            const startTime = event.isAllDay ? 'All Day' : Utils.formatTime(event.start);
            const duration = event.isAllDay ? 'All Day' : `${Math.round((event.end - event.start) / (1000 * 60))} min`;
            const icon = this.eventProcessor.getEventTypeIcon(event.type);
            const isWorkEvent = event.isWorkEvent || this.eventProcessor.isWorkEvent(event.title);
            
            // Check if this is an overnight event ending on this day
            const isOvernightEnding = this.eventProcessor.isOvernightEndDate(event, targetDate);
            
            // Work event badge with housesit ending indicator
            let workBadge = '';
            if (isWorkEvent) {
                if (isOvernightEnding) {
                    workBadge = '<span class="work-event-badge" style="background-color: #A78BFA;">🏠 Housesit Ends</span>';
                } else {
                    workBadge = '<span class="work-event-badge">💼 Work</span>';
                }
            }
            const workClass = isWorkEvent ? 'work-event' : 'personal-event';

            html += `
                <div class="day-details-event ${event.ignored ? 'event-ignored' : ''} ${workClass}">
                    <div class="day-details-event-time">
                        <div>${icon} ${startTime}</div>
                        <div class="day-details-event-duration">${duration}</div>
                    </div>
                    <div class="day-details-event-info">
                        <div class="day-details-event-title">
                            ${event.title}
                            ${workBadge}
                        </div>
                        ${event.location ? `<div class="day-details-event-location">📍 ${event.location}</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Render upcoming appointments
     * @param {Object} state - Application state
     */
    renderUpcomingAppointments(state) {
        const container = document.getElementById('upcoming-appointments');
        if (!container) return;

        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        // Get today's appointments, sorted by time
        const todayAppointments = state.events
            .filter(event => {
                if (event.ignored || event.isAllDay) return false;
                const eventStart = new Date(event.start);
                return eventStart >= today && eventStart <= todayEnd;
            })
            .sort((a, b) => a.start - b.start)
            .slice(0, 5); // Show next 5 appointments

        if (todayAppointments.length === 0) {
            container.innerHTML = '<div class="upcoming-empty">📅 No appointments scheduled for today<br><small>Enjoy your free day!</small></div>';
            return;
        }

        const html = todayAppointments.map(event => {
            const startTime = new Date(event.start);
            const endTime = new Date(event.end);
            const isPast = now > endTime;
            const duration = Math.round((endTime - startTime) / (1000 * 60));

            return '<div class="appointment-item' + (isPast ? ' past' : '') + '" onclick="window.gpsApp.showEventDetails(\'' + event.id + '\')">' +
                '<div class="appointment-time">' +
                    '<div class="appointment-time-hour">' + startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }) + '</div>' +
                '</div>' +
                '<div class="appointment-details">' +
                    '<div class="appointment-title">' + event.title + '</div>' +
                    '<div class="appointment-meta">' +
                        '<span class="appointment-meta-item">⏱️ ' + duration + ' min</span>' +
                        (event.location ? '<span class="appointment-meta-item">📍 ' + event.location + '</span>' : '') +
                        (event.client ? '<span class="appointment-meta-item">👤 ' + event.client + '</span>' : '') +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        container.innerHTML = html;
    }

    /**
     * Render weekly insights
     * @param {Object} state - Application state
     */
    renderWeeklyInsights(state) {
        const container = document.getElementById('weekly-insights');
        if (!container) return;

        // Defensive check for events
        if (!state || !state.events || !Array.isArray(state.events)) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 24px;">No appointments data available</p>';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate for next 7 days (current week)
        const weekData = [];
        let totalAppointments = 0;
        let totalWorkMinutes = 0;
        let totalTravelMinutes = 0;
        let daysWithAppointments = 0;

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            date.setHours(0, 0, 0, 0);

            const dayEvents = this.eventProcessor.getEventsForDate(state.events, date);
            const metrics = this.calculator.calculateWorkloadMetrics(dayEvents, date, { includeTravel: true });

            totalAppointments += metrics.workEventCount;
            totalWorkMinutes += metrics.workMinutes;
            totalTravelMinutes += metrics.travelMinutes;
            if (metrics.workEventCount > 0) daysWithAppointments++;

            weekData.push({
                date,
                appointments: metrics.workEventCount,
                workMinutes: metrics.workMinutes,
                travelMinutes: metrics.travelMinutes
            });
        }

        const workHours = Math.floor(totalWorkMinutes / 60);
        const workMinutes = Math.round(totalWorkMinutes % 60);
        const travelHours = Math.floor(totalTravelMinutes / 60);
        const travelMins = Math.round(totalTravelMinutes % 60);
        
        // Total hours including travel
        const totalCombinedMinutes = totalWorkMinutes + totalTravelMinutes;
        const totalHours = Math.floor(totalCombinedMinutes / 60);
        const totalMinutes = Math.round(totalCombinedMinutes % 60);
        
        const avgHoursPerDay = daysWithAppointments > 0 ? Utils.formatHours(totalCombinedMinutes / 60 / daysWithAppointments) : '0h';

        // Find busiest day (including travel)
        const busiestDay = weekData.reduce((max, day) => 
            (day.workMinutes + day.travelMinutes) > (max.workMinutes + max.travelMinutes) ? day : max
        , weekData[0]);

        const busiestDayName = Utils.DAY_NAMES_LONG[busiestDay.date.getDay()];
        const busiestHours = Utils.formatHours((busiestDay.workMinutes + busiestDay.travelMinutes) / 60);

        // Workload assessment (including travel time)
        const avgWeeklyHours = totalCombinedMinutes / 60;
        let workloadStatus = '';
        let workloadColor = '';
        if (avgWeeklyHours < 25) {
            workloadStatus = 'Light';
            workloadColor = 'var(--success-500)';
        } else if (avgWeeklyHours < 40) {
            workloadStatus = 'Comfortable';
            workloadColor = 'var(--primary-500)';
        } else if (avgWeeklyHours < 50) {
            workloadStatus = 'Busy';
            workloadColor = 'var(--warning-500)';
        } else {
            workloadStatus = 'High Risk';
            workloadColor = 'var(--danger-500)';
        }

        container.innerHTML = `
            <div class="insights-grid">
                <div class="insight-card">
                    <div class="insight-label">Total Appointments</div>
                    <div class="insight-value">${totalAppointments}</div>
                    <div class="insight-sublabel">${daysWithAppointments} working days</div>
                </div>
                <div class="insight-card">
                    <div class="insight-label">Work Hours</div>
                    <div class="insight-value">${workHours}h ${workMinutes}m</div>
                    <div class="insight-sublabel">Appointment time</div>
                </div>
                <div class="insight-card">
                    <div class="insight-label">Travel Hours</div>
                    <div class="insight-value">${travelHours}h ${travelMins}m</div>
                    <div class="insight-sublabel">To/from/between appointments</div>
                </div>
                <div class="insight-card">
                    <div class="insight-label">Total Hours</div>
                    <div class="insight-value">${totalHours}h ${totalMinutes}m</div>
                    <div class="insight-sublabel">${avgHoursPerDay} avg per day</div>
                </div>
                <div class="insight-card">
                    <div class="insight-label">Busiest Day</div>
                    <div class="insight-value">${busiestDayName}</div>
                    <div class="insight-sublabel">${busiestHours} total • ${busiestDay.appointments} appointments</div>
                </div>
                <div class="insight-card">
                    <div class="insight-label">Weekly Workload</div>
                    <div class="insight-value" style="color: ${workloadColor};">${workloadStatus}</div>
                    <div class="insight-sublabel">${Utils.formatHours(avgWeeklyHours)} / ${Utils.formatHours(state.settings.thresholds.weekly.comfortable)} capacity</div>
                    <div class="progress-bar" style="margin-top: 8px;">
                        <div class="progress-fill" style="width: ${Math.min((avgWeeklyHours / state.settings.thresholds.weekly.comfortable * 100), 100)}%; background: ${workloadColor};"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render recommendations
     * @param {Object} state - Application state
     */
    renderRecommendations(state) {
        const recommendations = document.getElementById('recommendations');
        if (!recommendations) return;

        const today = new Date();
        const nextWeek = [];

        // Analyze next 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            date.setHours(0, 0, 0, 0);

            const dayEvents = state.events.filter(event => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                
                // Set day boundaries
                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);
                
                // Check if event overlaps with this day (handles multi-day events)
                return eventEnd > dayStart && eventStart <= dayEnd;
            });

            const totalMinutes = dayEvents.reduce((sum, event) => {
                return sum + this.eventProcessor.calculateEventDurationForDay(event, date);
            }, 0);

            nextWeek.push({
                date,
                hours: totalMinutes / 60,
                events: dayEvents.length
            });
        }

        let html = '';

        // Check for burnout risk
        const burnoutDays = nextWeek.filter(day => day.hours >= state.settings.thresholds.daily.burnout);
        if (burnoutDays.length > 0) {
            html += `
                <div class="recommendation-card danger">
                    <div class="recommendation-icon">⚠️</div>
                    <div class="recommendation-content">
                        <p><strong>Burnout Risk Detected:</strong> You have ${burnoutDays.length} day(s) this week with ${state.settings.thresholds.daily.burnout}+ hours. Consider declining new bookings or rescheduling if possible.</p>
                    </div>
                </div>
            `;
        }

        // Check for high workload
        const highWorkloadDays = nextWeek.filter(day =>
            day.hours >= state.settings.thresholds.daily.high && day.hours < state.settings.thresholds.daily.burnout
        );
        if (highWorkloadDays.length > 0 && burnoutDays.length === 0) {
            html += `
                <div class="recommendation-card warning">
                    <div class="recommendation-icon">📊</div>
                    <div class="recommendation-content">
                        <p><strong>High Workload:</strong> You have ${highWorkloadDays.length} day(s) this week with high workload. Be selective with new bookings.</p>
                    </div>
                </div>
            `;
        }

        // Check for good capacity
        const comfortableDays = nextWeek.filter(day => day.hours < state.settings.thresholds.daily.comfortable);
        if (comfortableDays.length >= 4) {
            html += `
                <div class="recommendation-card">
                    <div class="recommendation-icon">✅</div>
                    <div class="recommendation-content">
                        <p><strong>Good Capacity:</strong> You have ${comfortableDays.length} day(s) with comfortable workload this week. Good time to take on new clients!</p>
                    </div>
                </div>
            `;
        }

        recommendations.innerHTML = html;
    }

    /**
     * Render enhanced week overview with workload bars
     * @param {Object} state - Application state
     */
    renderWeekOverviewEnhanced(state) {
        const weekOverview = document.getElementById('week-overview');
        if (!weekOverview) return;

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start on Sunday

        let html = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            date.setHours(0, 0, 0, 0);

            const dayEvents = this.eventProcessor.getEventsForDate(state.events, date);
            const metrics = this.calculator.calculateWorkloadMetrics(dayEvents, date, { includeTravel: false });

            const hours = metrics.workHours;
            const level = metrics.level;
            const housesits = metrics.housesits;
            const isToday = date.toDateString() === today.toDateString();
            
            // Check if any housesits are ending on this day
            const hasHousesitEnding = housesits.some(h => h.isEndDate);
            const hasActiveHousesit = housesits.some(h => !h.isEndDate);

            // Calculate workload bar percentage (max 12 hours = 100%)
            const maxHours = 12;
            const barPercentage = Math.min((hours / maxHours) * 100, 100);

            html += '<div class="week-day' + (isToday ? ' today' : '') + (hasActiveHousesit ? ' has-housesit' : '') + (hasHousesitEnding ? ' has-housesit-ending' : '') + '" onclick="window.gpsApp.showDayDetails(\'' + date.toISOString() + '\')">';
            
            // Housesit indicator bar at top
            if (hasActiveHousesit) {
                html += '  <div class="week-day-housesit-indicator" title="House sit scheduled">';
                html += '    <span class="housesit-icon">🏠</span>';
                html += '  </div>';
            } else if (hasHousesitEnding) {
                html += '  <div class="week-day-housesit-indicator housesit-ending" title="House sit ends">';
                html += '    <span class="housesit-icon">🏠</span>';
                html += '  </div>';
            }
            
            html += '  <div class="week-day-header">' + date.toLocaleDateString('en-US', { weekday: 'short' }) + '</div>';
            html += '  <div class="week-day-date">' + date.getDate() + '</div>';

            if (metrics.workEventCount > 0) {
                html += '  <div class="week-day-count">' + metrics.workEventCount + '</div>';
            }

            html += '  <div class="week-day-hours">' + Utils.formatHours(hours);
            if (hasActiveHousesit) {
                html += ' <span class="housesit-label">+ housesit</span>';
            } else if (hasHousesitEnding) {
                html += ' <span class="housesit-label housesit-ending">ends</span>';
            }
            html += '</div>';
            html += '  <div class="week-day-level ' + level + '">' + this.calculator.getWorkloadLabel(level) + '</div>';
            html += '  <div class="week-day-workload-bar">';
            html += '    <div class="week-day-workload-fill ' + level + '" style="width: ' + barPercentage + '%"></div>';
            html += '  </div>';
            html += '</div>';
        }

        weekOverview.innerHTML = html;
    }

    /**
     * Render analytics view
     * @param {Object} state - Application state
     * @param {Object} templatesManager - Templates manager instance
     */
    renderAnalytics(state, templatesManager) {
        const range = document.getElementById('analytics-range')?.value || 'month';
        const compareMode = document.getElementById('analytics-compare-toggle')?.checked || false;
        const workOnlyMode = document.getElementById('analytics-work-only-toggle')?.checked || false;

        const result = this.getDateRange(range);
        const startDate = result.startDate;
        const endDate = result.endDate;

        // Filter events within date range
        let events = state.events.filter(event => {
            if (event.ignored || event.isAllDay) return false;
            const eventDate = new Date(event.start);
            return eventDate >= startDate && eventDate <= endDate;
        });

        // Apply work events filter if enabled
        if (workOnlyMode) {
            events = events.filter(event => this.eventProcessor.isWorkEvent(event.title));
        }

        if (events.length === 0) {
            this.renderAnalyticsEmpty();
            this.clearAnalyticsComparison();
            return;
        }

        // Calculate overview stats
        this.renderAnalyticsOverview(events, startDate, endDate, range);

        // Handle comparison mode
        if (compareMode) {
            const prevResult = this.getPreviousPeriodRange(range);
            let prevEvents = state.events.filter(event => {
                if (event.ignored || event.isAllDay) return false;
                const eventDate = new Date(event.start);
                return eventDate >= prevResult.startDate && eventDate <= prevResult.endDate;
            });

            // Apply work events filter to previous period if enabled
            if (workOnlyMode) {
                prevEvents = prevEvents.filter(event => this.eventProcessor.isWorkEvent(event.title));
            }

            const currentDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const previousDays = Math.ceil((prevResult.endDate - prevResult.startDate) / (1000 * 60 * 60 * 24));

            const comparison = this.calculator.calculatePeriodComparison(events, prevEvents, currentDays, previousDays);
            this.renderAnalyticsComparison(comparison, range);
        } else {
            this.clearAnalyticsComparison();
        }

        // Render charts
        this.renderWorkloadTrendChart(events, startDate, endDate, range, state.settings);
        this.renderAppointmentTypesChart(events);
        this.renderBusiestDaysChart(events);
        this.renderBusiestTimesChart(events);
        this.renderTemplateUsageChart(events, templatesManager);
        this.renderAnalyticsInsights(events, range);
    }

    /**
     * Get date range based on selection
     * @param {string} range - Time range ('week', 'month', 'quarter', 'year')
     * @returns {Object} Start and end dates
     */
    getDateRange(range) {
        const now = new Date();
        let startDate, endDate;

        switch (range) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        return { startDate, endDate };
    }

    /**
     * Get previous period date range based on current selection
     * @param {string} range - Time range ('week', 'month', 'quarter', 'year')
     * @returns {Object} Start and end dates
     */
    getPreviousPeriodRange(range) {
        const now = new Date();
        let prevStartDate, prevEndDate;

        switch (range) {
            case 'week':
                const thisWeekStart = new Date(now);
                thisWeekStart.setDate(now.getDate() - now.getDay());
                thisWeekStart.setHours(0, 0, 0, 0);

                prevStartDate = new Date(thisWeekStart);
                prevStartDate.setDate(thisWeekStart.getDate() - 7);
                prevEndDate = new Date(prevStartDate);
                prevEndDate.setDate(prevStartDate.getDate() + 6);
                prevEndDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                prevStartDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
                prevEndDate = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
                break;
            case 'year':
                prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
                prevEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                break;
            default:
                prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        }

        return { startDate: prevStartDate, endDate: prevEndDate };
    }

    /**
     * Render analytics overview cards
     */
    renderAnalyticsOverview(events, startDate, endDate, range) {
        // Total appointments
        document.getElementById('analytics-total-appointments').textContent = events.length;

        // Total hours
        const totalMinutes = events.reduce((sum, event) => {
            return sum + ((event.end - event.start) / (1000 * 60));
        }, 0);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        document.getElementById('analytics-total-hours').textContent = hours + 'h ' + minutes + 'm';

        // Average daily workload
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const avgDaily = totalMinutes / days / 60;
        document.getElementById('analytics-avg-daily').textContent = Utils.formatHours(avgDaily);

        // Busiest day
        const dayWorkload = {};
        events.forEach(event => {
            const dayKey = new Date(event.start).toDateString();
            dayWorkload[dayKey] = (dayWorkload[dayKey] || 0) + ((event.end - event.start) / (1000 * 60 * 60));
        });

        const busiestDay = Object.entries(dayWorkload).reduce((max, entry) => {
            const day = entry[0];
            const hours = entry[1];
            return hours > max.hours ? { day, hours } : max;
        }, { day: 'N/A', hours: 0 });

        const busiestDate = busiestDay.day !== 'N/A' ? new Date(busiestDay.day) : null;
        const busiestDayText = busiestDate
            ? busiestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' (' + Utils.formatHours(busiestDay.hours) + ')'
            : 'N/A';
        document.getElementById('analytics-busiest-day').textContent = busiestDayText;
    }

    /**
     * Render empty state
     */
    renderAnalyticsEmpty() {
        const content = document.getElementById('analytics-content');
        content.innerHTML = '<div class="analytics-empty"><div class="analytics-empty-icon">📊</div><h3>No Data Available</h3><p>No appointments found for the selected time period.</p></div>';
    }

    /**
     * Render workload trend chart
     */
    renderWorkloadTrendChart(events, startDate, endDate, range, settings) {
        const container = document.getElementById('workload-trend-chart');
        if (!container) return;

        // Group by day or week depending on range
        const groupByDay = range === 'week' || range === 'month';
        const dataPoints = [];

        if (groupByDay) {
            // Daily grouping
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dayKey = currentDate.toDateString();
                const dayEvents = events.filter(e => new Date(e.start).toDateString() === dayKey);
                const hours = dayEvents.reduce((sum, e) => sum + ((e.end - e.start) / (1000 * 60 * 60)), 0);

                dataPoints.push({
                    label: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    value: hours,
                    shortLabel: currentDate.getDate().toString()
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else {
            // Weekly grouping for quarter/year
            let weekStart = new Date(startDate);
            let weekNum = 1;
            while (weekStart <= endDate) {
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                const weekEvents = events.filter(e => {
                    const eventDate = new Date(e.start);
                    return eventDate >= weekStart && eventDate <= weekEnd;
                });

                const hours = weekEvents.reduce((sum, e) => sum + ((e.end - e.start) / (1000 * 60 * 60)), 0);

                dataPoints.push({
                    label: 'Week ' + weekNum,
                    value: hours,
                    shortLabel: 'W' + weekNum
                });

                weekStart.setDate(weekStart.getDate() + 7);
                weekNum++;
            }
        }

        // Render bar chart with thresholds
        this.renderBarChartWithThresholds(container, dataPoints, settings);
    }

    /**
     * Render bar chart with threshold lines
     */
    renderBarChartWithThresholds(container, data, settings) {
        const thresholds = settings.thresholds.daily;
        const displayCap = 20; // Cap display at 20h for better scale
        const actualMax = Math.max(...data.map(d => d.value), thresholds.burnout);
        const maxValue = Math.min(actualMax, displayCap);

        // Calculate threshold positions (as percentage from bottom)
        const comfortablePos = (thresholds.comfortable / maxValue * 100);
        const busyPos = (thresholds.busy / maxValue * 100);
        const burnoutPos = (thresholds.high / maxValue * 100);

        const html = '<div class="chart-with-thresholds">' +
            // Background zones for visual clarity
            '<div class="threshold-zone comfortable" style="position: absolute; bottom: 0; left: 0; right: 0; height: ' + comfortablePos + '%;"></div>' +
            '<div class="threshold-zone busy" style="position: absolute; bottom: ' + comfortablePos + '%; left: 0; right: 0; height: ' + (busyPos - comfortablePos) + '%;"></div>' +
            '<div class="threshold-zone overload" style="position: absolute; bottom: ' + busyPos + '%; left: 0; right: 0; height: ' + (100 - busyPos) + '%;"></div>' +
            // Threshold lines
            '<div class="threshold-line comfortable" style="position: absolute; bottom: ' + comfortablePos + '%; left: 0; right: 0;" data-label="' + thresholds.comfortable + 'h comfortable"></div>' +
            '<div class="threshold-line busy" style="position: absolute; bottom: ' + busyPos + '%; left: 0; right: 0;" data-label="' + thresholds.busy + 'h busy"></div>' +
            '<div class="threshold-line overload" style="position: absolute; bottom: ' + burnoutPos + '%; left: 0; right: 0;" data-label="' + thresholds.high + 'h overload"></div>' +
            // Bar chart
            '<div class="bar-chart" style="position: absolute; bottom: 16px; left: 0; right: 0; height: 200px;">' + data.map(item => {
                const displayValue = Math.min(item.value, displayCap);
                const isOverflow = item.value > displayCap;
                const heightPercent = (displayValue / maxValue * 100);
                const valueText = item.value < 1 ? item.value.toFixed(1) : Math.round(item.value);
                
                // Determine bar status based on thresholds
                let barStatus = 'comfortable';
                if (item.value >= thresholds.high || isOverflow) {
                    barStatus = 'overload';
                } else if (item.value >= thresholds.busy) {
                    barStatus = 'busy';
                } else if (item.value >= thresholds.comfortable) {
                    barStatus = 'moderate';
                }
                
                return '<div class="bar-chart-item">' +
                    '<div class="bar animated ' + barStatus + (isOverflow ? ' overflow' : '') + '" style="height: ' + heightPercent + '%;" title="' + item.label + ': ' + Utils.formatHours(item.value) + '">' +
                    '<div class="bar-value">' + valueText + (isOverflow ? '+' : '') + '</div>' +
                    '</div>' +
                    '<div class="bar-label">' + (item.shortLabel || item.label) + '</div>' +
                    '</div>';
            }).join('') + '</div>' +
        '</div>';

        container.innerHTML = html;

        // Trigger animation
        setTimeout(() => {
            const bars = container.querySelectorAll('.bar');
            bars.forEach(bar => bar.style.animationPlayState = 'running');
        }, 50);
    }

    /**
     * Render appointment types chart
     */
    renderAppointmentTypesChart(events) {
        const container = document.getElementById('appointment-types-chart');
        if (!container) return;

        // Count by type
        const typeCounts = {};
        events.forEach(event => {
            const type = event.type || 'Other';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        // Convert to array and sort
        const data = Object.entries(typeCounts).map(entry => {
            const type = entry[0];
            const count = entry[1];
            return {
                label: type.charAt(0).toUpperCase() + type.slice(1),
                value: count,
                percentage: (count / events.length * 100).toFixed(1)
            };
        }).sort((a, b) => b.value - a.value);

        this.renderDonutChart(container, data);
    }

    /**
     * Render busiest days chart
     */
    renderBusiestDaysChart(events) {
        const container = document.getElementById('busiest-days-chart');
        if (!container) return;

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts = new Array(7).fill(0);

        events.forEach(event => {
            const day = new Date(event.start).getDay();
            dayCounts[day]++;
        });

        const data = dayNames.map((name, idx) => ({
            label: name,
            value: dayCounts[idx],
            shortLabel: name
        }));

        this.renderBarChart(container, data);
    }

    /**
     * Render busiest times chart
     */
    renderBusiestTimesChart(events) {
        const container = document.getElementById('busiest-times-chart');
        if (!container) return;

        const timeSlots = {
            'Morning': [6, 9],
            'Mid-Morning': [9, 12],
            'Afternoon': [12, 15],
            'Late Afternoon': [15, 18],
            'Evening': [18, 21]
        };

        const data = Object.entries(timeSlots).map(entry => {
            const label = entry[0];
            const times = entry[1];
            const start = times[0];
            const end = times[1];
            const count = events.filter(event => {
                const hour = new Date(event.start).getHours();
                return hour >= start && hour < end;
            }).length;

            return {
                label,
                value: count,
                shortLabel: label // Use full label
            };
        });

        this.renderBarChart(container, data);
    }

    /**
     * Render template usage chart
     */
    renderTemplateUsageChart(events, templatesManager) {
        const container = document.getElementById('template-usage-chart');
        if (!container || !templatesManager) return;

        // Count template usage
        const templateCounts = {};
        events.forEach(event => {
            if (event.templateId) {
                const template = templatesManager.getTemplateById(event.templateId);
                if (template) {
                    const key = template.name;
                    templateCounts[key] = (templateCounts[key] || 0) + 1;
                }
            }
        });

        if (Object.keys(templateCounts).length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 48px;">No template usage data</p>';
            return;
        }

        // Convert to sorted array
        const data = Object.entries(templateCounts)
            .map(entry => {
                const name = entry[0];
                const count = entry[1];
                return {
                    label: name,
                    value: count,
                    percentage: (count / events.length * 100).toFixed(1)
                };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5

        this.renderDonutChart(container, data);
    }

    /**
     * Render analytics insights for a given period
     * @param {Array} events - Array of event objects to analyze
     * @param {string} range - Time range ('week', 'month', 'quarter', 'year')
     */
    renderAnalyticsInsights(events, range) {
        const container = document.getElementById('analytics-insights');
        if (!container) return;

        // Defensive check for undefined/null events
        if (!events || !Array.isArray(events) || events.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 24px;">No data available for insights</p>';
            return;
        }

        const insights = [];

        // Total workload insight
        const totalHours = events.reduce((sum, e) => sum + ((e.end - e.start) / (1000 * 60 * 60)), 0);
        const avgPerDay = totalHours / (range === 'week' ? 7 : 30);

        if (avgPerDay > 8) {
            insights.push({
                icon: '⚠️',
                title: 'High Workload Alert',
                description: 'You are averaging ' + Utils.formatHours(avgPerDay) + ' per day. Consider reducing your schedule.'
            });
        } else if (avgPerDay < 4) {
            insights.push({
                icon: '📈',
                title: 'Capacity Available',
                description: 'You are averaging ' + Utils.formatHours(avgPerDay) + ' per day. You have room for more appointments.'
            });
        }

        // Busiest day insight
        const dayWorkload = {};
        events.forEach(event => {
            const day = new Date(event.start).toLocaleDateString('en-US', { weekday: 'long' });
            dayWorkload[day] = (dayWorkload[day] || 0) + 1;
        });

        const busiestDay = Object.entries(dayWorkload).reduce((max, entry) => {
            const day = entry[0];
            const count = entry[1];
            return count > max.count ? { day, count } : max;
        }, { day: '', count: 0 });

        // Render insights
        if (insights.length > 0) {
            container.innerHTML = insights.map(insight => `
                <div class="insight-card">
                    <div class="insight-icon">${insight.icon}</div>
                    <div class="insight-content">
                        <div class="insight-title">${insight.title}</div>
                        <div class="insight-description">${insight.description}</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 24px;">No significant insights found.</p>';
        }
    }

    /**
     * Render bar chart
     */
    renderBarChart(container, data) {
        const maxValue = Math.max(...data.map(d => d.value), 1);

        const html = '<div class="bar-chart">' + data.map(item => '<div class="bar-chart-item"><div class="bar animated" style="height: ' + (item.value / maxValue * 100) + '%;" title="' + item.label + ': ' + item.value + '"><div class="bar-value">' + item.value + '</div></div><div class="bar-label">' + (item.shortLabel || item.label) + '</div></div>').join('') + '</div>';

        container.innerHTML = html;

        // Trigger animation after a small delay to ensure DOM is ready
        setTimeout(() => {
            const bars = container.querySelectorAll('.bar');
            bars.forEach(bar => bar.style.animationPlayState = 'running');
        }, 50);
    }

    /**
     * Render donut chart
     */
    renderDonutChart(container, data) {
        const colors = [
            '#3b82f6', // blue
            '#10b981', // green
            '#f59e0b', // amber
            '#ef4444', // red
            '#8b5cf6', // purple
            '#06b6d4', // cyan
            '#f97316', // orange
            '#ec4899'  // pink
        ];

        const html = '<div class="donut-legend">' + data.map((item, idx) => '<div class="donut-legend-item"><div class="donut-legend-color" style="background: ' + colors[idx % colors.length] + '"></div><div class="donut-legend-label">' + item.label + '</div><div class="donut-legend-value">' + item.value + ' (' + item.percentage + '%)</div></div>').join('') + '</div>';

        container.innerHTML = html;
    }

    /**
     * Render comparison data for analytics stats
     */
    renderAnalyticsComparison(comparison, range) {
        const rangeLabel = range === 'week' ? 'last week' : range === 'month' ? 'last month' : range === 'quarter' ? 'last quarter' : 'last year';

        // Appointments comparison
        const apptEl = document.getElementById('analytics-total-appointments-comparison');
        if (apptEl) {
            const arrow = comparison.appointments.trend === 'positive' ? '↗️' : comparison.appointments.trend === 'negative' ? '↘️' : '→';
            const sign = comparison.appointments.diff >= 0 ? '+' : '';
            apptEl.className = 'stat-comparison ' + comparison.appointments.trend;
            apptEl.innerHTML = arrow + ' ' + sign + comparison.appointments.diff + ' vs ' + rangeLabel;
        }

        // Hours comparison
        const hoursEl = document.getElementById('analytics-total-hours-comparison');
        if (hoursEl) {
            const arrow = comparison.hours.trend === 'positive' ? '↗️' : comparison.hours.trend === 'negative' ? '↘️' : '→';
            const sign = comparison.hours.diff >= 0 ? '+' : '';
            hoursEl.className = 'stat-comparison ' + comparison.hours.trend;
            hoursEl.innerHTML = arrow + ' ' + sign + Utils.formatHours(Math.abs(comparison.hours.diff)) + ' vs ' + rangeLabel;
        }

        // Avg daily comparison
        const avgEl = document.getElementById('analytics-avg-daily-comparison');
        if (avgEl) {
            const arrow = comparison.avgDaily.trend === 'positive' ? '↗️' : comparison.avgDaily.trend === 'negative' ? '↘️' : '→';
            const sign = comparison.avgDaily.diff >= 0 ? '+' : '';
            avgEl.className = 'stat-comparison ' + comparison.avgDaily.trend;
            avgEl.innerHTML = arrow + ' ' + sign + Utils.formatHours(Math.abs(comparison.avgDaily.diff)) + ' avg vs ' + rangeLabel;
        }
    }

    /**
     * Clear analytics comparison data
     */
    clearAnalyticsComparison() {
        document.getElementById('analytics-total-appointments-comparison').innerHTML = '';
        document.getElementById('analytics-total-hours-comparison').innerHTML = '';
        document.getElementById('analytics-avg-daily-comparison').innerHTML = '';
        document.getElementById('analytics-busiest-day-comparison').innerHTML = '';
    }

    /**
     * Render calendar view
     * @param {Object} state - Application state
     */
    renderCalendar(state) {
        const container = document.getElementById('calendar-container');
        if (!container) return;

        // Update title
        const title = document.getElementById('calendar-title');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        title.textContent = `${monthNames[state.currentDate.getMonth()]} ${state.currentDate.getFullYear()}`;

        // Render based on view mode
        switch (state.calendarView) {
            case 'month':
                this.renderMonthView(container, state);
                break;
            case 'week':
                this.renderWeekView(container, state);
                break;
            case 'day':
                this.renderDayView(container, state);
                break;
            case 'list':
                this.renderListView(container, state);
                break;
        }
    }

    /**
     * Render month calendar view
     * @param {HTMLElement} container - Container element
     * @param {Object} state - Application state
     */
    renderMonthView(container, state) {
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Render weekday headers into dedicated container
        const weekdaysContainer = document.getElementById('calendar-weekdays');
        if (weekdaysContainer) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            weekdaysContainer.innerHTML = dayNames.map(day => 
                `<div class="calendar-weekday">${day}</div>`
            ).join('');
        }

        // Build calendar days grid (without weekdays)
        let html = '<div class="calendar-month">';
        html += '<div class="calendar-days">';

        const currentDate = new Date(startDate);
        while (currentDate <= lastDay || currentDate.getDay() !== 0) {
            const dateKey = new Date(currentDate);
            dateKey.setHours(0, 0, 0, 0);

            const dayEvents = this.eventProcessor.getEventsForDate(state.events, dateKey);
            
            const metrics = this.calculator.calculateWorkloadMetrics(dayEvents, dateKey, { 
                includeTravel: state.settings.includeTravelTime 
            });
            
            // Count only work events for display (excluding ending housesits)
            const workEvents = dayEvents.filter(event => {
                const isWork = event.isWorkEvent || this.eventProcessor.isWorkEvent(event);
                if (!isWork) return false;
                
                // Exclude overnight events that are ending
                if (this.eventProcessor.isOvernightEvent(event)) {
                    return !this.eventProcessor.isOvernightEndDate(event, dateKey);
                }
                return true;
            });
            const workEventCount = workEvents.length;

            const hours = Utils.formatHours(metrics.totalHours);
            const workHours = Utils.formatHours(metrics.workHours);
            const travelHours = Utils.formatHours(metrics.travelHours);
            const workloadLevel = metrics.level;
            const housesits = metrics.housesits;
            
            // Check if any housesits are ending on this day
            const hasHousesitEnding = housesits.some(h => h.isEndDate);
            const hasActiveHousesit = housesits.some(h => !h.isEndDate);

            const isToday = dateKey.getTime() === today.getTime();
            const isOtherMonth = currentDate.getMonth() !== month;

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (isOtherMonth) classes += ' other-month';
            if (workEventCount > 0) classes += ` ${workloadLevel}`;
            if (hasActiveHousesit) classes += ' has-housesit';
            if (hasHousesitEnding) classes += ' has-housesit-ending';

            html += `
                <div class="${classes}" data-date="${dateKey.toISOString()}">
                    ${hasActiveHousesit ? '<div class="calendar-day-housesit-bar" title="House sit scheduled"></div>' : ''}
                    ${hasHousesitEnding ? '<div class="calendar-day-housesit-bar housesit-ending" title="House sit ends"></div>' : ''}
                    <div class="calendar-day-number">${currentDate.getDate()}</div>
                    ${workEventCount > 0 ? `
                        <div class="calendar-day-events">${workEventCount} appt${workEventCount !== 1 ? 's' : ''}</div>
                        <div class="calendar-day-hours">${workHours} work${metrics.travelMinutes > 0 ? ` + ${travelHours} travel` : ''}${hasActiveHousesit ? ' <span style="color: #8B5CF6; font-size: 0.65rem; font-weight: 600;">+ housesit</span>' : ''}${hasHousesitEnding && !hasActiveHousesit ? ' <span style="color: #A78BFA; font-size: 0.65rem; font-weight: 600;">housesit ends</span>' : ''}</div>
                        <div class="calendar-day-total" style="font-weight: 600; color: var(--primary-700);">${hours} total</div>
                    ` : ''}
                </div>
            `;

            currentDate.setDate(currentDate.getDate() + 1);
        }

        html += '</div></div>';
        container.innerHTML = html;

        // Add click handlers to calendar days
        container.querySelectorAll('.calendar-day').forEach(dayElement => {
            dayElement.addEventListener('click', () => {
                const dateStr = dayElement.dataset.date;
                // Call global app method or handle internally if possible
                // For now, we'll assume window.gpsApp exists or we need to pass a callback
                if (window.gpsApp && window.gpsApp.showDayDetails) {
                    window.gpsApp.showDayDetails(new Date(dateStr));
                } else {
                    // Fallback if we can handle it internally
                    this.showDayDetails(state, new Date(dateStr));
                }
            });
        });
    }

    /**
     * Render week calendar view
     */
    renderWeekView(container, state) {
        container.innerHTML = '<p class="text-muted">Week view coming soon...</p>';
    }

    /**
     * Render day calendar view
     */
    renderDayView(container, state) {
        container.innerHTML = '<p class="text-muted">Day view coming soon...</p>';
    }

    /**
     * Render list view
     */
    renderListView(container, state) {
        container.innerHTML = '<p class="text-muted">List view coming soon...</p>';
    }

    /**
     * Render templates view
     * @param {Object} state - Application state
     * @param {Object} templatesManager - Templates manager instance
     */
    renderTemplates(state, templatesManager) {
        const container = document.getElementById('templates-list');
        if (!container || !templatesManager) return;

        const templates = templatesManager.getAllTemplates();

        if (templates.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 48px; color: var(--text-muted);">
                    <p>No templates yet.</p>
                    <p>Click "Create Template" to get started!</p>
                </div>
            `;
            return;
        }

        const isManaging = state.isManagingTemplates;
        let html = '';

        templates.forEach(template => {
            const hours = Math.floor(template.duration / 60);
            const minutes = template.duration % 60;
            const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

            const canDelete = !template.isDefault;

            html += `
                <div class="template-card ${isManaging ? 'manage-mode' : ''}" data-template-id="${template.id}">
                    ${isManaging && canDelete ? '<div class="template-delete-overlay"><span class="delete-hint">Click delete button below to remove</span></div>' : ''}
                    <div class="template-header">
                        <div class="template-icon">${template.icon}</div>
                        <div class="template-info">
                            <div class="template-name">${template.name}${template.isDefault ? ' <span style="font-size: 10px; color: var(--text-muted);">(Default)</span>' : ''}</div>
                            <div class="template-duration">${durationText}</div>
                        </div>
                    </div>
                    <div class="template-details">
                        <div class="template-detail">
                            <span class="template-detail-label">Type:</span>
                            <span class="template-detail-value">${template.type}</span>
                        </div>
                        <div class="template-detail">
                            <span class="template-detail-label">Travel Time:</span>
                            <span class="template-detail-value">${template.includeTravel ? 'Included' : 'Not included'}</span>
                        </div>
                    </div>
                    <div class="template-actions ${isManaging ? 'manage-mode' : ''}">
                        ${!isManaging ? `
                            <button class="btn btn-primary btn-sm" onclick="window.gpsApp.useTemplate('${template.id}')">Use Template</button>
                            <button class="btn btn-secondary btn-sm" onclick="window.gpsApp.showTemplateModal('${template.id}')">Edit</button>
                        ` : ''}
                        ${isManaging && canDelete ? `
                            <button class="btn btn-danger btn-sm" onclick="window.gpsApp.deleteTemplate('${template.id}')" style="width: 100%;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Delete Template
                            </button>
                        ` : ''}
                        ${isManaging && !canDelete ? `
                            <div style="text-align: center; padding: var(--spacing-md); color: var(--gray-500); font-size: 0.875rem;">
                                Default templates cannot be deleted
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Render settings view
     * @param {Object} state - Application state
     */
    renderSettings(state) {
        console.log('⚙️  Rendering settings view');
        
        // Load current settings into form fields
        const clientIdInput = document.getElementById('calendar-client-id');
        const mapsApiKeyInput = document.getElementById('maps-api-key');
        const homeAddressInput = document.getElementById('home-address');
        const includeTravelCheckbox = document.getElementById('include-travel-time');

        // Show injected config values as fallback when saved settings are empty
        const injectedClientId = window.GPSConfig?.calendar?.clientId;
        if (clientIdInput) {
            clientIdInput.value = state.settings.api.calendarClientId ||
                                 injectedClientId || '';

            // Show appropriate help text
            const autoConfiguredMsg = document.getElementById('client-id-auto-configured');
            const manualSetupMsg = document.getElementById('client-id-manual-setup');
            if (injectedClientId && injectedClientId !== 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com') {
                if (autoConfiguredMsg) autoConfiguredMsg.style.display = 'inline';
                if (manualSetupMsg) manualSetupMsg.style.display = 'none';
            } else {
                if (autoConfiguredMsg) autoConfiguredMsg.style.display = 'none';
                if (manualSetupMsg) manualSetupMsg.style.display = 'inline';
            }
        }
        if (mapsApiKeyInput) {
            mapsApiKeyInput.value = state.settings.api.mapsApiKey ||
                                   window.GPSConfig?.maps?.apiKey || '';
        }
        if (homeAddressInput) homeAddressInput.value = state.settings.homeAddress || '';
        if (includeTravelCheckbox) includeTravelCheckbox.checked = state.settings.includeTravelTime !== false;

        // Load workload thresholds
        this.loadWorkloadThresholdsIntoForm(state);

        // Render calendar selection if authenticated
        this.renderCalendarSelection(state);

        console.log('   Settings form populated');
    }

    /**
     * Load workload thresholds into settings form
     * @param {Object} state - Application state
     */
    loadWorkloadThresholdsIntoForm(state) {
        const thresholds = state.settings.thresholds;

        // Daily thresholds
        const dailyComf = document.getElementById('threshold-daily-comfortable');
        const dailyBusy = document.getElementById('threshold-daily-busy');
        const dailyOver = document.getElementById('threshold-daily-overload');
        const dailyBurn = document.getElementById('threshold-daily-burnout');

        if (dailyComf) dailyComf.value = thresholds.daily.comfortable;
        if (dailyBusy) dailyBusy.value = thresholds.daily.busy;
        if (dailyOver) dailyOver.value = thresholds.daily.high;
        if (dailyBurn) dailyBurn.value = thresholds.daily.burnout;

        // Weekly thresholds
        const weeklyComf = document.getElementById('threshold-weekly-comfortable');
        const weeklyBusy = document.getElementById('threshold-weekly-busy');
        const weeklyOver = document.getElementById('threshold-weekly-overload');
        const weeklyBurn = document.getElementById('threshold-weekly-burnout');

        if (weeklyComf) weeklyComf.value = thresholds.weekly.comfortable;
        if (weeklyBusy) weeklyBusy.value = thresholds.weekly.busy;
        if (weeklyOver) weeklyOver.value = thresholds.weekly.high;
        if (weeklyBurn) weeklyBurn.value = thresholds.weekly.burnout;

        // Monthly thresholds
        const monthlyComf = document.getElementById('threshold-monthly-comfortable');
        const monthlyBusy = document.getElementById('threshold-monthly-busy');
        const monthlyOver = document.getElementById('threshold-monthly-overload');
        const monthlyBurn = document.getElementById('threshold-monthly-burnout');

        if (monthlyComf) monthlyComf.value = thresholds.monthly.comfortable;
        if (monthlyBusy) monthlyBusy.value = thresholds.monthly.busy;
        if (monthlyOver) monthlyOver.value = thresholds.monthly.high;
        if (monthlyBurn) monthlyBurn.value = thresholds.monthly.burnout;
    }

    /**
     * Render calendar selection list in settings
     * @param {Object} state - Application state
     */
    renderCalendarSelection(state) {
        const container = document.getElementById('calendar-list');
        if (!container) {
            console.warn('⚠️  Calendar list container not found');
            return;
        }

        console.log(`📋 Rendering calendar selection (authenticated: ${state.isAuthenticated})`);
        console.log('   Available calendars:', state.availableCalendars.length);
        console.log('   Selected calendars:', state.selectedCalendars);

        if (!state.isAuthenticated || state.availableCalendars.length === 0) {
            container.innerHTML = '<p class="text-muted">Connect your Google Calendar to select calendars</p>';
            return;
        }

        let html = '<div class="calendar-checkboxes">';
        
        state.availableCalendars.forEach(calendar => {
            const isSelected = state.selectedCalendars.includes(calendar.id);
            html += `
                <label class="calendar-checkbox-label" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--gray-200); border-radius: 8px; margin-bottom: 8px; cursor: pointer; background: ${isSelected ? 'var(--primary-50)' : 'var(--surface)'}; border-color: ${isSelected ? 'var(--primary-500)' : 'var(--gray-200)'}">
                    <input 
                        type="checkbox" 
                        value="${calendar.id}" 
                        ${isSelected ? 'checked' : ''}
                        onchange="window.gpsApp.toggleCalendarSelection('${calendar.id}')"
                        style="width: 18px; height: 18px; cursor: pointer;"
                    >
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: var(--text);">${calendar.name}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-600); margin-top: 2px;">${calendar.id}</div>
                    </div>
                    ${calendar.primary ? '<span style="font-size: 0.75rem; background: var(--primary-500); color: white; padding: 2px 8px; border-radius: 12px;">Primary</span>' : ''}
                </label>
            `;
        });
        
        html += '</div>';
        
        if (state.selectedCalendars.length === 0) {
            html += `<p class="text-warning" style="margin-top: 12px; font-size: 0.875rem; color: var(--warning);">⚠️ No calendars selected. Select at least one calendar to sync events.</p>`;
        } else {
            html += `<p class="text-muted" style="margin-top: 12px; font-size: 0.875rem;">✓ Selected: ${state.selectedCalendars.length} calendar(s)</p>`;
        }
        
        container.innerHTML = html;
    }

    /**
     * Update workload indicator in header
     * @param {Object} state - Application state
     */
    updateWorkloadIndicator(state) {
        const indicator = document.getElementById('workload-indicator');
        if (!indicator) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayEvents = this.eventProcessor.getEventsForDate(state.events, today);
        const metrics = this.calculator.calculateWorkloadMetrics(todayEvents, today, {
            includeTravel: state.settings.includeTravelTime
        });

        const dot = indicator.querySelector('.workload-dot');
        const text = indicator.querySelector('.workload-text');

        if (dot) dot.className = `workload-dot ${metrics.level}`;
        if (text) text.textContent = metrics.label;
        
        indicator.title = `Current workload: ${metrics.label} (${Utils.formatHours(metrics.totalHours)})`;
    }

    /**
     * Populate template dropdown in appointment modal
     * @param {Object} templatesManager - Templates manager instance
     */
    populateTemplateDropdown(templatesManager) {
        const select = document.getElementById('appointment-template');
        if (!select || !templatesManager) return;

        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add templates grouped by type
        const templates = templatesManager.getAllTemplates();
        const templatesByType = {};

        templates.forEach(template => {
            if (!templatesByType[template.type]) {
                templatesByType[template.type] = [];
            }
            templatesByType[template.type].push(template);
        });

        // Add options by type
        Object.keys(templatesByType).forEach(type => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = type.charAt(0).toUpperCase() + type.slice(1);

            templatesByType[type].forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = `${template.icon} ${template.name}`;
                optgroup.appendChild(option);
            });

            select.appendChild(optgroup);
        });
    }

    /**
     * Handle template selection to auto-fill appointment form
     * @param {string} templateId - Selected template ID
     * @param {Object} templatesManager - Templates manager instance
     */
    handleTemplateSelection(templateId, templatesManager) {
        if (!templateId || !templatesManager) {
            return;
        }

        const template = templatesManager.getTemplateById(templateId);
        if (!template) return;

        // Auto-fill form fields
        const titleInput = document.getElementById('appointment-title');
        if (!titleInput.value) { // Only set if empty
            titleInput.value = template.name;
        }

        // Set duration
        const durationSelect = document.getElementById('appointment-duration');
        const durationValue = template.duration.toString();
        const matchingOption = Array.from(durationSelect.options).find(opt => opt.value === durationValue);

        if (matchingOption) {
            durationSelect.value = durationValue;
        } else {
            // Set to custom if duration not in dropdown
            durationSelect.value = 'custom';
        }

        // Set travel time checkbox
        const travelCheckbox = document.getElementById('appointment-travel');
        if (travelCheckbox) {
            travelCheckbox.checked = template.includeTravel;
        }

        // Set notes if not already filled
        const notesInput = document.getElementById('appointment-notes');
        if (notesInput && !notesInput.value && template.defaultNotes) {
            notesInput.value = template.defaultNotes;
        }
    }

    /**
     * Show event details modal
     * @param {Object} state - Application state
     * @param {string} eventId - Event ID to show
     */
    showEventDetails(state, eventId) {
        const event = state.events.find(e => e.id === eventId);
        if (!event) return;

        // For now, we'll use a simple alert or a custom modal if we had one.
        // Since we don't have a dedicated event details modal in the HTML,
        // we can reuse the appointment modal in "read-only" or "edit" mode,
        // OR just show an alert for now as a placeholder, 
        // OR reuse day details modal but just for one event?
        
        // Let's try to populate the appointment modal and show it (Edit mode)
        // This requires calling back to app to show modal, or handling it here.
        // But showAppointmentModal is in app.js.
        
        // Alternatively, we can create a simple details view using alert for now
        // to satisfy the requirement without complex UI changes.
        
        const startTime = new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const endTime = new Date(event.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const details = `
Event: ${event.title}
Time: ${startTime} - ${endTime}
Location: ${event.location || 'N/A'}
Client: ${event.client || 'N/A'}
Notes: ${event.notes || 'None'}
        `;
        
        alert(details);
    }
}
