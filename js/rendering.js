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
            // Ensure dates are Date objects for duration calculation
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            const durationMinutes = Math.round((endDate - startDate) / (1000 * 60));
            const duration = event.isAllDay ? 'All Day' : (isNaN(durationMinutes) ? '' : `${durationMinutes} min`);
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
        if (avgWeeklyHours < state.settings.thresholds.weekly.comfortable) {
            workloadStatus = 'Comfortable';
            workloadColor = 'var(--success-500)';
        } else if (avgWeeklyHours < state.settings.thresholds.weekly.busy) {
            workloadStatus = 'Busy';
            workloadColor = 'var(--warning-500)';
        } else if (avgWeeklyHours < state.settings.thresholds.weekly.high) {
            workloadStatus = 'High';
            workloadColor = 'var(--orange-500)';
        } else {
            workloadStatus = 'Burnout Risk';
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
        this.renderClientDistributionChart(events);
        this.renderAppointmentTypesChart(events);
        this.renderBusiestDaysChart(events);
        this.renderBusiestTimesChart(events);
        this.renderDurationDistributionChart(events);
        this.renderAnalyticsInsights(events, range, state);
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
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            const diff = (endDate - startDate) / (1000 * 60);
            return sum + (isNaN(diff) ? 0 : diff);
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
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const dayKey = eventStart.toDateString();
            const diff = (eventEnd - eventStart) / (1000 * 60 * 60);
            dayWorkload[dayKey] = (dayWorkload[dayKey] || 0) + (isNaN(diff) ? 0 : diff);
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
            // Daily grouping - use calculator for consistent metrics
            let currentDate = new Date(startDate);
            let dayIndex = 0;
            while (currentDate <= endDate) {
                const dateKey = new Date(currentDate);
                dateKey.setHours(0, 0, 0, 0);
                
                // Get events for this day using the same method as calendar
                const dayEvents = this.eventProcessor.getEventsForDate(events, dateKey);
                
                // Use calculator for consistent workload metrics
                const metrics = this.calculator.calculateWorkloadMetrics(dayEvents, dateKey, {
                    includeTravel: settings.includeTravelTime
                });
                
                const hours = metrics.totalHours;

                // For month view, only show labels every 5 days to reduce crowding
                const showLabel = range === 'week' || (dayIndex % 5 === 0);
                
                dataPoints.push({
                    label: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    value: hours,
                    shortLabel: showLabel ? currentDate.getDate().toString() : ''
                });
                
                dayIndex++;

                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else {
            // Weekly grouping for quarter/year
            let weekStart = new Date(startDate);
            let weekNum = 1;
            while (weekStart <= endDate) {
                // Calculate total hours for the week using calculator
                let weekHours = 0;
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(weekStart.getDate() + i);
                    dayDate.setHours(0, 0, 0, 0);
                    
                    if (dayDate > endDate) break;
                    
                    const dayEvents = this.eventProcessor.getEventsForDate(events, dayDate);
                    const metrics = this.calculator.calculateWorkloadMetrics(dayEvents, dayDate, {
                        includeTravel: settings.includeTravelTime
                    });
                    weekHours += metrics.totalHours;
                }

                dataPoints.push({
                    label: 'Week ' + weekNum,
                    value: weekHours,
                    shortLabel: 'W' + weekNum
                });

                weekStart.setDate(weekStart.getDate() + 7);
                weekNum++;
            }
        }

        // Render bar chart with thresholds, passing whether data is daily or weekly
        this.renderBarChartWithThresholds(container, dataPoints, settings, groupByDay);
    }

    /**
     * Render bar chart with threshold lines and average indicator
     * @param {HTMLElement} container - Container element for the chart
     * @param {Array} data - Data points to display
     * @param {Object} settings - Settings object containing thresholds
     * @param {boolean} isDaily - Whether data is grouped by day (true) or week (false)
     */
    renderBarChartWithThresholds(container, data, settings, isDaily = true) {
        // Use daily or weekly thresholds based on data grouping
        const thresholds = isDaily ? settings.thresholds.daily : settings.thresholds.weekly;
        // Use a reasonable max that shows thresholds well, at minimum show up to the overload threshold
        const minDisplayMax = thresholds.high + 2; // At least show a bit above overload threshold
        const dataMax = Math.max(...data.map(d => d.value), 0);
        // Adjust display cap based on daily (12h) or weekly (70h) view
        const displayCap = isDaily ? 12 : 70;
        // For the scale, we want to show up to either the data max OR the display cap, whichever is less,
        // but at least up to the high threshold line
        const maxValue = Math.max(minDisplayMax, dataMax > displayCap ? displayCap : dataMax);

        // Calculate average
        const nonZeroValues = data.filter(d => d.value > 0);
        const avgValue = nonZeroValues.length > 0 
            ? nonZeroValues.reduce((sum, d) => sum + d.value, 0) / nonZeroValues.length 
            : 0;
        const avgPos = Math.min((avgValue / maxValue * 100), 100);

        // Calculate threshold positions (as percentage from bottom)
        const comfortablePos = (thresholds.comfortable / maxValue * 100);
        const busyPos = (thresholds.busy / maxValue * 100);
        const burnoutPos = (thresholds.high / maxValue * 100);

        const html = '<div class="chart-with-thresholds">' +
            // Background zones for visual clarity
            '<div class="threshold-zone comfortable" style="position: absolute; bottom: 0; left: 0; right: 0; height: ' + comfortablePos + '%;"></div>' +
            '<div class="threshold-zone busy" style="position: absolute; bottom: ' + comfortablePos + '%; left: 0; right: 0; height: ' + (busyPos - comfortablePos) + '%;"></div>' +
            '<div class="threshold-zone overload" style="position: absolute; bottom: ' + busyPos + '%; left: 0; right: 0; height: ' + (100 - busyPos) + '%;"></div>' +
            // Average line (rendered before threshold lines so it appears below them visually)
            (avgValue > 0 ? '<div class="average-line" style="position: absolute; bottom: ' + avgPos + '%; left: 0; right: 0;" data-label="' + Utils.formatHours(avgValue) + ' avg"></div>' : '') +
            // Threshold lines
            '<div class="threshold-line comfortable" style="position: absolute; bottom: ' + comfortablePos + '%; left: 0; right: 0;" data-label="' + thresholds.comfortable + 'h comfortable"></div>' +
            '<div class="threshold-line busy" style="position: absolute; bottom: ' + busyPos + '%; left: 0; right: 0;" data-label="' + thresholds.busy + 'h busy"></div>' +
            '<div class="threshold-line overload" style="position: absolute; bottom: ' + burnoutPos + '%; left: 0; right: 0;" data-label="' + thresholds.high + 'h overload"></div>' +
            // Bar chart - using pixel heights since percentage heights don't work well in flex columns
            '<div class="bar-chart" style="position: absolute; bottom: 16px; left: 0; right: 0; height: 200px;">' + data.map(item => {
                const displayValue = Math.min(item.value, displayCap);
                const isOverflow = item.value > displayCap;
                const heightPercent = (displayValue / maxValue * 100);
                // Calculate pixel height based on 180px available (200px - 20px for labels)
                const barHeight = Math.max(item.value > 0 ? 2 : 0, (displayValue / maxValue) * 180);
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
                    '<div class="bar animated ' + barStatus + (isOverflow ? ' overflow' : '') + '" style="height: ' + barHeight + 'px;" title="' + item.label + ': ' + Utils.formatHours(item.value) + '">' +
                    (item.value > 0 ? '<div class="bar-value">' + valueText + (isOverflow ? '+' : '') + '</div>' : '') +
                    '</div>' +
                    '<div class="bar-label">' + (item.shortLabel !== undefined ? item.shortLabel : item.label) + '</div>' +
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
     * Render appointment types chart - infers service types from event titles
     */
    renderAppointmentTypesChart(events) {
        const container = document.getElementById('appointment-types-chart');
        if (!container) return;

        // Infer service type from event title patterns
        const typeCounts = {};
        const typeLabels = {
            'meet-greet': 'Meet & Greet',
            'overnight': 'Overnight/Housesit',
            'walk': 'Dog Walk',
            'short-visit': 'Short Visit (15-30 min)',
            'long-visit': 'Long Visit (45-60 min)',
            'other': 'Other'
        };

        events.forEach(event => {
            // Use EventProcessor's detectServiceType logic
            let type = 'other';
            const title = event.title || '';
            const titleLower = title.toLowerCase();
            
            if (/\b(MG|M&G|Meet\s*&\s*Greet)\b/i.test(title)) {
                type = 'meet-greet';
            } else if (titleLower.includes('overnight') || titleLower.includes('housesit') || /\bhs\b/i.test(title)) {
                type = 'overnight';
            } else if (titleLower.includes('walk')) {
                type = 'walk';
            } else if (/\b(15|20|30)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i.test(title)) {
                type = 'short-visit';
            } else if (/\b(45|60)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i.test(title)) {
                type = 'long-visit';
            }
            
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        // If all events are "other", show a helpful message
        if (Object.keys(typeCounts).length === 1 && typeCounts['other']) {
            container.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--gray-500);">
                    <p style="margin-bottom: 8px;">📋 Service types detected from event titles</p>
                    <p style="font-size: 0.8rem;">Events with duration suffixes (e.g., "Pet Name 30") will be categorized automatically</p>
                </div>
            `;
            return;
        }

        // Convert to array and sort
        const data = Object.entries(typeCounts).map(entry => {
            const type = entry[0];
            const count = entry[1];
            return {
                label: typeLabels[type] || type,
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
     * Render busiest times chart - with more granular time slots
     */
    renderBusiestTimesChart(events) {
        const container = document.getElementById('busiest-times-chart');
        if (!container) return;

        // More granular 2-hour time slots with shorter labels
        const timeSlots = [
            { label: '6-8am', shortLabel: '6-8', start: 6, end: 8 },
            { label: '8-10am', shortLabel: '8-10', start: 8, end: 10 },
            { label: '10-12pm', shortLabel: '10-12', start: 10, end: 12 },
            { label: '12-2pm', shortLabel: '12-2', start: 12, end: 14 },
            { label: '2-4pm', shortLabel: '2-4', start: 14, end: 16 },
            { label: '4-6pm', shortLabel: '4-6', start: 16, end: 18 },
            { label: '6-8pm', shortLabel: '6-8', start: 18, end: 20 },
            { label: '8-10pm', shortLabel: '8+', start: 20, end: 24 }
        ];

        const data = timeSlots.map(slot => {
            const count = events.filter(event => {
                const hour = new Date(event.start).getHours();
                return hour >= slot.start && hour < slot.end;
            }).length;

            return {
                label: slot.label,
                value: count,
                shortLabel: slot.shortLabel
            };
        });

        this.renderBarChart(container, data);
    }

    /**
     * Render client distribution chart - extracts client/pet names from event titles
     */
    renderClientDistributionChart(events) {
        const container = document.getElementById('client-distribution-chart');
        if (!container) return;

        // Extract client/pet names from event titles
        // Common pattern: "Pet Name Duration" or "Pet Name HS"
        const clientCounts = {};
        
        events.forEach(event => {
            const title = event.title || '';
            // Remove duration suffix and parenthetical notes to get client/pet name
            let clientName = title
                .replace(/\([^)]*\)/g, '')  // Remove parenthetical notes
                .replace(/\b(15|20|30|45|60)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i, '') // Remove duration suffix
                .replace(/\b(HS|Housesit|MG|M&G)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i, '') // Remove HS/MG suffix
                .replace(/\s*(Start|1st|2nd|3rd|Last)\s*$/i, '') // Remove sequence markers
                .trim();
            
            // Skip empty or too short names
            if (clientName.length < 2) return;
            
            // Skip personal events that might have slipped through
            if (/^(off|lunch|appointment)/i.test(clientName)) return;
            
            clientCounts[clientName] = (clientCounts[clientName] || 0) + 1;
        });

        if (Object.keys(clientCounts).length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--gray-500);">
                    <p>📋 No client data detected</p>
                    <p style="font-size: 0.8rem;">Event titles should follow the pattern: "Pet Name Duration"</p>
                </div>
            `;
            return;
        }

        // Convert to sorted array (top 8 clients)
        const data = Object.entries(clientCounts)
            .map(entry => ({
                label: entry[0],
                value: entry[1],
                percentage: (entry[1] / events.length * 100).toFixed(1)
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        this.renderHorizontalBarChart(container, data);
    }

    /**
     * Render duration distribution chart - shows breakdown by visit length
     */
    renderDurationDistributionChart(events) {
        const container = document.getElementById('duration-distribution-chart');
        if (!container) return;

        // Group events by duration buckets
        const durationBuckets = {
            '< 15 min': 0,
            '15 min': 0,
            '20 min': 0,
            '30 min': 0,
            '45 min': 0,
            '60 min': 0,
            '1-2 hrs': 0,
            '2+ hrs': 0
        };

        events.forEach(event => {
            const durationMinutes = (new Date(event.end) - new Date(event.start)) / (1000 * 60);
            
            if (durationMinutes < 15) {
                durationBuckets['< 15 min']++;
            } else if (durationMinutes < 20) {
                durationBuckets['15 min']++;
            } else if (durationMinutes < 25) {
                durationBuckets['20 min']++;
            } else if (durationMinutes < 40) {
                durationBuckets['30 min']++;
            } else if (durationMinutes < 55) {
                durationBuckets['45 min']++;
            } else if (durationMinutes < 75) {
                durationBuckets['60 min']++;
            } else if (durationMinutes < 120) {
                durationBuckets['1-2 hrs']++;
            } else {
                durationBuckets['2+ hrs']++;
            }
        });

        // Filter out empty buckets and create data array
        const data = Object.entries(durationBuckets)
            .filter(([_, count]) => count > 0)
            .map(([label, count]) => ({
                label,
                value: count,
                shortLabel: label.replace(' min', 'm').replace(' hrs', 'h').replace('< ', '<')
            }));

        if (data.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 48px;">No duration data available</p>';
            return;
        }

        this.renderBarChart(container, data);
    }

    /**
     * Render horizontal bar chart (better for long labels like client names)
     */
    renderHorizontalBarChart(container, data) {
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 24px;">No data available</p>';
            return;
        }

        const maxValue = Math.max(...data.map(d => d.value), 1);
        const colors = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'
        ];

        let html = '<div class="horizontal-bar-chart">';
        
        data.forEach((item, idx) => {
            const widthPercent = (item.value / maxValue * 100);
            const color = colors[idx % colors.length];
            
            html += `
                <div class="h-bar-item">
                    <div class="h-bar-label" title="${item.label}">${item.label}</div>
                    <div class="h-bar-track">
                        <div class="h-bar-fill" style="width: ${widthPercent}%; background: ${color};">
                            <span class="h-bar-value">${item.value}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Render analytics insights for a given period
     * @param {Array} events - Array of event objects to analyze
     * @param {string} range - Time range ('week', 'month', 'quarter', 'year')
     * @param {Object} state - Application state
     */
    renderAnalyticsInsights(events, range, state) {
        const container = document.getElementById('analytics-insights');
        if (!container) return;

        // Defensive check for undefined/null events
        if (!events || !Array.isArray(events) || events.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 24px;">No data available for insights</p>';
            return;
        }

        const insights = [];
        const periodDays = range === 'week' ? 7 : range === 'month' ? 30 : range === 'quarter' ? 90 : 365;

        // Calculate core metrics
        const totalHours = events.reduce((sum, e) => sum + ((e.end - e.start) / (1000 * 60 * 60)), 0);
        const avgPerDay = totalHours / periodDays;
        const totalAppointments = events.length;
        const avgAppointmentsPerDay = totalAppointments / periodDays;

        // Find busiest and lightest days
        const dayWorkload = {};
        events.forEach(event => {
            const dayKey = new Date(event.start).toDateString();
            const hours = (event.end - event.start) / (1000 * 60 * 60);
            dayWorkload[dayKey] = (dayWorkload[dayKey] || 0) + hours;
        });
        
        const sortedDays = Object.entries(dayWorkload).sort((a, b) => b[1] - a[1]);
        const busiestDay = sortedDays[0];
        const lightestDay = sortedDays[sortedDays.length - 1];

        // Find busiest time of day
        const hourCounts = {};
        events.forEach(event => {
            const hour = new Date(event.start).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

        // Find top client
        const clientCounts = {};
        events.forEach(event => {
            const title = event.title || '';
            let clientName = title
                .replace(/\([^)]*\)/g, '')
                .replace(/\b(15|20|30|45|60)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i, '')
                .replace(/\b(HS|Housesit|MG|M&G)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i, '')
                .trim();
            if (clientName.length >= 2 && !/^(off|lunch)/i.test(clientName)) {
                clientCounts[clientName] = (clientCounts[clientName] || 0) + 1;
            }
        });
        const topClient = Object.entries(clientCounts).sort((a, b) => b[1] - a[1])[0];

        // Generate insights based on analysis
        
        // 1. Workload Assessment
        const thresholds = state?.settings?.thresholds?.daily || { comfortable: 6, busy: 8, high: 10 };
        if (avgPerDay > thresholds.high / periodDays * 7) {
            insights.push({
                icon: '⚠️',
                type: 'warning',
                title: 'High Workload Alert',
                description: `You're averaging ${Utils.formatHours(avgPerDay)} per day. Consider declining new bookings or scheduling rest days.`
            });
        } else if (avgPerDay < 2) {
            insights.push({
                icon: '📈',
                type: 'opportunity',
                title: 'Capacity Available',
                description: `You're averaging only ${Utils.formatHours(avgPerDay)} per day. Great time to take on new clients!`
            });
        } else {
            insights.push({
                icon: '✅',
                type: 'positive',
                title: 'Balanced Workload',
                description: `You're averaging ${Utils.formatHours(avgPerDay)} per day - a healthy balance.`
            });
        }

        // 2. Peak Time Insight
        if (peakHour) {
            const hourLabel = peakHour[0] < 12 ? `${peakHour[0]}am` : peakHour[0] === 12 ? '12pm' : `${peakHour[0] - 12}pm`;
            insights.push({
                icon: '⏰',
                type: 'info',
                title: 'Peak Booking Time',
                description: `Most of your appointments (${peakHour[1]}) start around ${hourLabel}. Consider this when scheduling.`
            });
        }

        // 3. Top Client Insight
        if (topClient && topClient[1] > 2) {
            const percentage = ((topClient[1] / totalAppointments) * 100).toFixed(0);
            insights.push({
                icon: '⭐',
                type: 'info',
                title: 'Top Client',
                description: `${topClient[0]} accounts for ${percentage}% of your appointments (${topClient[1]} visits).`
            });
        }

        // 4. Busiest Day Insight
        if (busiestDay && busiestDay[1] > 4) {
            const dayDate = new Date(busiestDay[0]);
            const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            insights.push({
                icon: '🔥',
                type: 'info',
                title: 'Busiest Day',
                description: `${dayName} was your busiest with ${Utils.formatHours(busiestDay[1])} of work.`
            });
        }

        // 5. Appointment Frequency
        if (avgAppointmentsPerDay > 0.5) {
            insights.push({
                icon: '📊',
                type: 'info',
                title: 'Booking Rate',
                description: `You averaged ${avgAppointmentsPerDay.toFixed(1)} appointments per day (${totalAppointments} total).`
            });
        }

        // Render insights
        if (insights.length > 0) {
            container.innerHTML = insights.map(insight => `
                <div class="insight-card ${insight.type || ''}">
                    <div class="insight-icon">${insight.icon}</div>
                    <div class="insight-content">
                        <div class="insight-title">${insight.title}</div>
                        <div class="insight-description">${insight.description}</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 24px;">Keep booking appointments to see insights!</p>';
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
     * Render comparison data for analytics stats - enhanced with percentages
     */
    renderAnalyticsComparison(comparison, range) {
        const rangeLabel = range === 'week' ? 'last week' : range === 'month' ? 'last month' : range === 'quarter' ? 'last quarter' : 'last year';

        // Helper to format percentage change
        const formatPercent = (percent) => {
            if (Math.abs(percent) < 1) return '';
            const sign = percent >= 0 ? '+' : '';
            return ` (${sign}${Math.round(percent)}%)`;
        };

        // Appointments comparison
        const apptEl = document.getElementById('analytics-total-appointments-comparison');
        if (apptEl) {
            const arrow = comparison.appointments.trend === 'positive' ? '↗️' : comparison.appointments.trend === 'negative' ? '↘️' : '→';
            const sign = comparison.appointments.diff >= 0 ? '+' : '';
            const percentText = formatPercent(comparison.appointments.percent);
            apptEl.className = 'stat-comparison ' + comparison.appointments.trend;
            apptEl.innerHTML = `<span class="comparison-arrow">${arrow}</span> <span class="comparison-value">${sign}${comparison.appointments.diff}${percentText}</span> <span class="comparison-label">vs ${rangeLabel}</span>`;
        }

        // Hours comparison
        const hoursEl = document.getElementById('analytics-total-hours-comparison');
        if (hoursEl) {
            const arrow = comparison.hours.trend === 'positive' ? '↗️' : comparison.hours.trend === 'negative' ? '↘️' : '→';
            const sign = comparison.hours.diff >= 0 ? '+' : '';
            const percentText = formatPercent(comparison.hours.percent);
            hoursEl.className = 'stat-comparison ' + comparison.hours.trend;
            hoursEl.innerHTML = `<span class="comparison-arrow">${arrow}</span> <span class="comparison-value">${sign}${Utils.formatHours(Math.abs(comparison.hours.diff))}${percentText}</span> <span class="comparison-label">vs ${rangeLabel}</span>`;
        }

        // Avg daily comparison
        const avgEl = document.getElementById('analytics-avg-daily-comparison');
        if (avgEl) {
            const arrow = comparison.avgDaily.trend === 'positive' ? '↗️' : comparison.avgDaily.trend === 'negative' ? '↘️' : '→';
            const sign = comparison.avgDaily.diff >= 0 ? '+' : '';
            const percentText = formatPercent(comparison.avgDaily.percent);
            avgEl.className = 'stat-comparison ' + comparison.avgDaily.trend;
            avgEl.innerHTML = `<span class="comparison-arrow">${arrow}</span> <span class="comparison-value">${sign}${Utils.formatHours(Math.abs(comparison.avgDaily.diff))}${percentText}</span> <span class="comparison-label">vs ${rangeLabel}</span>`;
        }

        // Busiest day comparison
        const busiestEl = document.getElementById('analytics-busiest-day-comparison');
        if (busiestEl && comparison.busiestDay) {
            const arrow = comparison.busiestDay.trend === 'positive' ? '↗️' : comparison.busiestDay.trend === 'negative' ? '↘️' : '→';
            const sign = comparison.busiestDay.diff >= 0 ? '+' : '';
            const percentText = formatPercent(comparison.busiestDay.percent);
            busiestEl.className = 'stat-comparison ' + comparison.busiestDay.trend;
            busiestEl.innerHTML = `<span class="comparison-arrow">${arrow}</span> <span class="comparison-value">${sign}${Utils.formatHours(Math.abs(comparison.busiestDay.diff))}${percentText}</span> <span class="comparison-label">vs ${rangeLabel}</span>`;
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

        // Set title based on view mode
        if (state.calendarView === 'week') {
            // Calculate week range for title
            const currentDate = new Date(state.currentDate);
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            const startMonth = monthNames[startOfWeek.getMonth()];
            const endMonth = monthNames[endOfWeek.getMonth()];
            const startDay = startOfWeek.getDate();
            const endDay = endOfWeek.getDate();
            const year = startOfWeek.getFullYear();
            const endYear = endOfWeek.getFullYear();

            if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                // Same month
                title.textContent = `${startMonth} ${startDay}-${endDay}, ${year}`;
            } else if (startOfWeek.getFullYear() === endOfWeek.getFullYear()) {
                // Different months, same year
                title.textContent = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
            } else {
                // Different years
                title.textContent = `${startMonth} ${startDay}, ${year} - ${endMonth} ${endDay}, ${endYear}`;
            }
        } else {
            title.textContent = `${monthNames[state.currentDate.getMonth()]} ${state.currentDate.getFullYear()}`;
        }

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
        // Remove week-view class if present (for month view)
        const weekdaysContainer = document.getElementById('calendar-weekdays');
        if (weekdaysContainer) {
            weekdaysContainer.classList.remove('week-view-active');
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
        // Get the start of the week (Sunday) for the current date
        const currentDate = new Date(state.currentDate);
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Render weekday headers into dedicated container
        // Add week-view class for mobile styling
        const weekdaysContainer = document.getElementById('calendar-weekdays');
        if (weekdaysContainer) {
            weekdaysContainer.classList.add('week-view-active');
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            weekdaysContainer.innerHTML = dayNames.map(day =>
                `<div class="calendar-weekday">${day}</div>`
            ).join('');
        }

        // Build week view grid
        let html = '<div class="calendar-week-view">';
        html += '<div class="calendar-week-days">';

        // Generate 7 days (Sunday through Saturday)
        for (let i = 0; i < 7; i++) {
            const dateKey = new Date(startOfWeek);
            dateKey.setDate(startOfWeek.getDate() + i);
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

            let classes = 'calendar-week-day';
            if (isToday) classes += ' today';
            if (workEventCount > 0) classes += ` ${workloadLevel}`;
            if (hasActiveHousesit) classes += ' has-housesit';
            if (hasHousesitEnding) classes += ' has-housesit-ending';

            // Short day name for mobile display
            const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayNameShort = dayNamesShort[dateKey.getDay()];

            html += `
                <div class="${classes}" data-date="${dateKey.toISOString()}" data-day-name="${dayNameShort}">
                    ${hasActiveHousesit ? '<div class="calendar-day-housesit-bar" title="House sit scheduled"></div>' : ''}
                    ${hasHousesitEnding ? '<div class="calendar-day-housesit-bar housesit-ending" title="House sit ends"></div>' : ''}

                    <div class="calendar-week-day-header">
                        <div class="calendar-week-day-number">${dateKey.getDate()}</div>
                        ${workEventCount > 0 ? `
                            <div class="calendar-week-day-summary">
                                <div class="calendar-week-day-count">${workEventCount} appt${workEventCount !== 1 ? 's' : ''}</div>
                                <div class="calendar-week-day-hours">${hours} total</div>
                            </div>
                        ` : '<div class="calendar-week-day-summary text-muted">No appointments</div>'}
                    </div>

                    ${workEventCount > 0 ? `
                        <div class="calendar-week-day-stats">
                            <div class="stat-item">
                                <span class="stat-label">Work:</span>
                                <span class="stat-value">${workHours}</span>
                            </div>
                            ${metrics.travelMinutes > 0 ? `
                                <div class="stat-item">
                                    <span class="stat-label">Travel:</span>
                                    <span class="stat-value">${travelHours}</span>
                                </div>
                            ` : ''}
                            ${hasActiveHousesit ? `
                                <div class="stat-item housesit-badge">
                                    <span style="color: #8B5CF6;">🏠 Housesit</span>
                                </div>
                            ` : ''}
                            ${hasHousesitEnding && !hasActiveHousesit ? `
                                <div class="stat-item housesit-badge">
                                    <span style="color: #A78BFA;">🏠 Ends</span>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <div class="calendar-week-day-events">
                        ${workEvents.map(event => {
                            const startTime = Utils.formatTime(event.start);
                            const endTime = Utils.formatTime(event.end);
                            const eventStart = new Date(event.start);
                            const eventEnd = new Date(event.end);
                            const durationMinutes = Math.round((eventEnd - eventStart) / (1000 * 60));
                            const duration = isNaN(durationMinutes) ? 0 : durationMinutes; // minutes

                            let eventType = '';
                            if (this.eventProcessor.isOvernightEvent(event)) {
                                eventType = 'overnight';
                            } else if (event.title && event.title.toLowerCase().includes('dropin')) {
                                eventType = 'dropin';
                            } else if (event.title && (event.title.includes('MG') || event.title.toLowerCase().includes('meet'))) {
                                eventType = 'meet-greet';
                            } else {
                                eventType = 'walk';
                            }

                            return `
                                <div class="calendar-week-event ${eventType}">
                                    <div class="event-time-badge">${startTime}</div>
                                    <div class="event-details">
                                        <div class="event-title">${event.title || 'Untitled'}</div>
                                        <div class="event-meta">
                                            ${event.location ? `<span class="event-location">📍 ${event.location}</span>` : ''}
                                            ${duration > 0 ? `<span class="event-duration">${duration} min</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div></div>';
        container.innerHTML = html;

        // Add click handlers to calendar days
        container.querySelectorAll('.calendar-week-day').forEach(dayElement => {
            dayElement.addEventListener('click', () => {
                const dateStr = dayElement.dataset.date;
                if (window.gpsApp && window.gpsApp.showDayDetails) {
                    window.gpsApp.showDayDetails(new Date(dateStr));
                } else {
                    this.showDayDetails(state, new Date(dateStr));
                }
            });
        });
    }

    /**
     * Render day calendar view
     */
    renderDayView(container, state) {
        const currentDate = new Date(state.currentDate);
        currentDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = currentDate.getTime() === today.getTime();

        // Get events for this day
        const dayEvents = this.eventProcessor.getEventsForDate(state.events, currentDate);
        const sortedEvents = dayEvents.sort((a, b) => a.start - b.start);

        // Calculate workload metrics
        const metrics = this.calculator.calculateWorkloadMetrics(sortedEvents, currentDate, {
            includeTravel: state.settings.includeTravelTime
        });

        // Count only work events (excluding ending housesits)
        const workEvents = sortedEvents.filter(event => {
            const isWork = event.isWorkEvent || this.eventProcessor.isWorkEvent(event.title);
            if (!isWork) return false;

            // Exclude overnight events that are ending
            if (this.eventProcessor.isOvernightEvent(event)) {
                return !this.eventProcessor.isOvernightEndDate(event, currentDate);
            }
            return true;
        });
        const workEventCount = workEvents.length;

        // Build the day view HTML
        let html = '<div class="calendar-day-view">';

        // Day header with workload info
        html += '<div class="day-view-header">';
        html += `<div class="day-view-title">
            <h2>${Utils.DAY_NAMES_LONG[currentDate.getDay()]}, ${Utils.MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}</h2>
            ${isToday ? '<span class="day-view-today-badge">Today</span>' : ''}
        </div>`;

        // Workload summary card
        html += '<div class="day-view-workload-summary">';
        html += `<div class="workload-summary-card ${metrics.level}">`;
        html += '<div class="workload-summary-header">';
        html += `<span class="workload-level-badge ${metrics.level}">${metrics.label}</span>`;
        html += '</div>';
        html += '<div class="workload-summary-stats">';
        html += `<div class="workload-stat">
            <div class="workload-stat-label">Appointments</div>
            <div class="workload-stat-value">${workEventCount}</div>
        </div>`;
        html += `<div class="workload-stat">
            <div class="workload-stat-label">Work Hours</div>
            <div class="workload-stat-value">${Utils.formatHours(metrics.workHours)}</div>
        </div>`;
        if (state.settings.includeTravelTime && metrics.travelHours > 0) {
            html += `<div class="workload-stat">
                <div class="workload-stat-label">Travel Time</div>
                <div class="workload-stat-value">${Utils.formatHours(metrics.travelHours)}</div>
            </div>`;
        }
        html += `<div class="workload-stat highlight">
            <div class="workload-stat-label">Total Hours</div>
            <div class="workload-stat-value">${Utils.formatHours(metrics.totalHours)}</div>
        </div>`;
        html += '</div>';

        // Workload capacity bar
        const thresholds = state.settings.thresholds.daily;
        const capacityPercent = Math.min((metrics.totalHours / thresholds.burnout) * 100, 100);
        html += '<div class="workload-capacity-bar">';
        html += `<div class="workload-capacity-fill ${metrics.level}" style="width: ${capacityPercent}%"></div>`;
        html += '</div>';
        html += '<div class="workload-capacity-labels">';
        html += `<span>0h</span>`;
        html += `<span class="capacity-threshold comfortable">${thresholds.comfortable}h</span>`;
        html += `<span class="capacity-threshold busy">${thresholds.busy}h</span>`;
        html += `<span class="capacity-threshold high">${thresholds.high}h</span>`;
        html += `<span class="capacity-threshold burnout">${thresholds.burnout}h</span>`;
        html += '</div>';
        html += '</div>'; // workload-summary-card
        html += '</div>'; // day-view-workload-summary
        html += '</div>'; // day-view-header

        // Events timeline
        html += '<div class="day-view-timeline">';

        if (sortedEvents.length === 0) {
            html += '<div class="day-view-empty">';
            html += '<div class="day-view-empty-icon">📅</div>';
            html += '<h3>No appointments scheduled</h3>';
            html += '<p>Enjoy your free day!</p>';
            html += '</div>';
        } else {
            // Housesit info
            if (metrics.housesits.length > 0) {
                const hasActiveHousesit = metrics.housesits.some(h => !h.isEndDate);
                const hasEndingHousesit = metrics.housesits.some(h => h.isEndDate);

                if (hasActiveHousesit || hasEndingHousesit) {
                    html += '<div class="day-view-housesit-notice">';
                    html += '<div class="housesit-icon">🏠</div>';
                    html += '<div class="housesit-info">';
                    if (hasActiveHousesit) {
                        html += '<strong>House Sitting Day</strong>';
                        html += '<p>You have an active house sit scheduled</p>';
                    } else if (hasEndingHousesit) {
                        html += '<strong>House Sit Ending</strong>';
                        html += '<p>Your house sit ends today</p>';
                    }
                    html += '</div>';
                    html += '</div>';
                }
            }

            // Render events
            html += '<div class="day-view-events">';

            sortedEvents.forEach((event, index) => {
                const startTime = event.isAllDay ? 'All Day' : Utils.formatTime(event.start);
                const endTime = event.isAllDay ? '' : Utils.formatTime(event.end);
                const duration = event.isAllDay ? '' : Math.round((event.end - event.start) / (1000 * 60));
                const icon = this.eventProcessor.getEventTypeIcon(event.type);
                const isWorkEvent = event.isWorkEvent || this.eventProcessor.isWorkEvent(event.title);
                const isOvernightEnding = this.eventProcessor.isOvernightEndDate(event, currentDate);

                html += `<div class="day-view-event ${isWorkEvent ? 'work-event' : 'personal-event'} ${event.ignored ? 'event-ignored' : ''}">`;
                html += '<div class="event-time-badge">';
                html += `<div class="event-start-time">${startTime}</div>`;
                if (endTime) {
                    html += `<div class="event-end-time">→ ${endTime}</div>`;
                }
                html += '</div>';
                html += '<div class="event-details">';
                html += '<div class="event-header">';
                html += `<span class="event-icon">${icon}</span>`;
                html += `<span class="event-title">${event.title}</span>`;
                if (isWorkEvent) {
                    if (isOvernightEnding) {
                        html += '<span class="event-badge housesit-ending">🏠 Ends</span>';
                    } else {
                        html += '<span class="event-badge work">💼 Work</span>';
                    }
                }
                html += '</div>';
                if (event.location) {
                    html += `<div class="event-location">📍 ${event.location}</div>`;
                }
                if (duration) {
                    html += `<div class="event-duration">⏱️ ${duration} minutes</div>`;
                }
                if (event.notes) {
                    html += `<div class="event-notes">${event.notes}</div>`;
                }
                html += '</div>'; // event-details
                html += '</div>'; // day-view-event

                // Add travel time indicator if not the last event
                if (state.settings.includeTravelTime && index < sortedEvents.length - 1 && !event.isAllDay) {
                    const travelTime = 15; // Mock travel time
                    html += `<div class="day-view-travel">`;
                    html += `<div class="travel-icon">🚗</div>`;
                    html += `<div class="travel-time">~${travelTime} min travel</div>`;
                    html += '</div>';
                }
            });

            html += '</div>'; // day-view-events
        }

        html += '</div>'; // day-view-timeline
        html += '</div>'; // calendar-day-view

        container.innerHTML = html;
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

        // Update preview boxes to match loaded values
        if (window.gpsApp && typeof window.gpsApp.updateThresholdPreviews === 'function') {
            window.gpsApp.updateThresholdPreviews();
        }
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
