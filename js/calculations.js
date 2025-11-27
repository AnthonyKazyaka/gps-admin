/**
 * GPS Admin - Workload Calculations
 * Calculate workload metrics, travel time, and statistics
 */

class WorkloadCalculator {
    constructor(eventProcessor) {
        this.eventProcessor = eventProcessor;
        this.homeAddress = '';
    }

    /**
     * Set home address for travel calculations
     * @param {string} address - Home address
     */
    setHomeAddress(address) {
        this.homeAddress = address;
    }

    /**
     * Calculate estimated travel time for work events
     * @param {Array} workEvents - Work events for the day
     * @returns {number} Total estimated travel time in minutes
     */
    calculateEstimatedTravelTime(workEvents) {
        if (!workEvents || workEvents.length === 0) return 0;

        const MINUTES_PER_APPOINTMENT = 15;
        let totalTravelMinutes = 0;

        // Travel to first appointment from home
        if (workEvents.length > 0 && workEvents[0].location) {
            totalTravelMinutes += MINUTES_PER_APPOINTMENT;
        }

        // Travel between appointments
        for (let i = 0; i < workEvents.length - 1; i++) {
            const current = workEvents[i];
            const next = workEvents[i + 1];

            if (current.location && next.location) {
                totalTravelMinutes += MINUTES_PER_APPOINTMENT;
            }
        }

        // Travel home from last appointment
        if (workEvents.length > 0 && workEvents[workEvents.length - 1].location) {
            totalTravelMinutes += MINUTES_PER_APPOINTMENT;
        }

        return totalTravelMinutes;
    }

    /**
     * Calculate comprehensive workload metrics for events
     * @param {Array} events - Events to analyze
     * @param {Date} targetDate - Target date for calculations
     * @param {Object} options - Calculation options
     * @returns {Object} Workload metrics
     */
    calculateWorkloadMetrics(events, targetDate, options = {}) {
        const { includeTravel = false } = options;

        let workMinutes = 0;
        let workEventCount = 0;
        const housesits = [];

        // Calculate work time (excluding overnight/housesit events)
        events.forEach(event => {
            if (event.ignored || event.isAllDay) return;

            if (this.eventProcessor.isWorkEvent(event.title)) {
                if (!this.eventProcessor.isOvernightEvent(event)) {
                    const duration = this.eventProcessor.calculateEventDurationForDay(event, targetDate);
                    workMinutes += duration;
                    workEventCount++;
                } else {
                    // Mark if this is the end date of the housesit
                    const isEndDate = this.eventProcessor.isOvernightEndDate(event, targetDate);
                    housesits.push({
                        ...event,
                        isEndDate: isEndDate
                    });
                }
            }
        });

        // Calculate travel time
        const workEvents = events.filter(e => 
            !e.ignored && 
            !e.isAllDay && 
            this.eventProcessor.isWorkEvent(e.title) && 
            !this.eventProcessor.isOvernightEvent(e)
        );
        const travelMinutes = includeTravel ? this.calculateEstimatedTravelTime(workEvents) : 0;

        // Calculate totals
        const totalMinutes = workMinutes + travelMinutes;
        const workHours = workMinutes / 60;
        const travelHours = travelMinutes / 60;
        const totalHours = totalMinutes / 60;

        // Determine workload level
        let level = 'none';
        let label = 'No work';

        if (totalHours > 0) {
            if (totalHours < 6) {
                level = 'light';
                label = 'Light';
            } else if (totalHours < 8) {
                level = 'comfortable';
                label = 'Comfortable';
            } else if (totalHours < 10) {
                level = 'busy';
                label = 'Busy';
            } else if (totalHours < 12) {
                level = 'high';
                label = 'High';
            } else {
                level = 'burnout';
                label = 'Burnout Risk';
            }
        }

        return {
            workMinutes,
            travelMinutes,
            totalMinutes,
            workHours,
            travelHours,
            totalHours,
            workEventCount,
            housesits,
            level,
            label
        };
    }

    /**
     * Get workload label for a given level
     * @param {string} level - Workload level
     * @returns {string} Human-readable label
     */
    getWorkloadLabel(level) {
        const labels = {
            'none': 'No work',
            'light': 'Light',
            'comfortable': 'Comfortable',
            'busy': 'Busy',
            'high': 'High',
            'burnout': 'Burnout Risk'
        };
        return labels[level] || 'Unknown';
    }

    /**
     * Calculate weekly statistics
     * @param {Array} events - All events
     * @param {Date} startDate - Week start date
     * @param {Object} options - Calculation options
     * @returns {Object} Weekly statistics
     */
    calculateWeeklyStats(events, startDate, options = {}) {
        const weekData = [];
        let totalWorkMinutes = 0;
        let totalTravelMinutes = 0;
        let totalAppointments = 0;
        let daysWithWork = 0;

        for (let i = 0; i < 7; i++) {
            const date = Utils.addDays(startDate, i);
            const dayEvents = this.eventProcessor.getEventsForDate(events, date);
            const metrics = this.calculateWorkloadMetrics(dayEvents, date, options);

            if (metrics.workEventCount > 0) daysWithWork++;
            totalWorkMinutes += metrics.workMinutes;
            totalTravelMinutes += metrics.travelMinutes;
            totalAppointments += metrics.workEventCount;

            weekData.push({
                date,
                metrics,
                appointments: metrics.workEventCount
            });
        }

        return {
            weekData,
            totalWorkMinutes,
            totalTravelMinutes,
            totalMinutes: totalWorkMinutes + totalTravelMinutes,
            totalHours: (totalWorkMinutes + totalTravelMinutes) / 60,
            totalAppointments,
            daysWithWork,
            avgHoursPerDay: daysWithWork > 0 ? (totalWorkMinutes + totalTravelMinutes) / 60 / daysWithWork : 0
        };
    }

    /**
     * Get week comparison data
     * @param {Array} events - All events
     * @param {Date} currentDate - Current date
     * @returns {Object} Comparison data
     */
    getWeekComparison(events, currentDate) {
        const today = new Date(currentDate);
        today.setHours(0, 0, 0, 0);

        // This week (starting from today)
        const thisWeekStats = this.calculateWeeklyStats(events, today, { includeTravel: true });

        // Last week
        const lastWeekStart = Utils.addDays(today, -7);
        const lastWeekStats = this.calculateWeeklyStats(events, lastWeekStart, { includeTravel: true });

        const diff = thisWeekStats.totalHours - lastWeekStats.totalHours;
        
        let trend = 'neutral';
        if (diff > 0.5) trend = 'positive';
        if (diff < -0.5) trend = 'negative';

        return {
            thisWeek: thisWeekStats.totalHours,
            lastWeek: lastWeekStats.totalHours,
            diff,
            trend
        };
    }

    /**
     * Calculate comparison metrics between current and previous period
     * @param {Array} currentEvents - Events in current period
     * @param {Array} previousEvents - Events in previous period
     * @param {number} currentDays - Number of days in current period
     * @param {number} previousDays - Number of days in previous period
     * @returns {Object} Comparison metrics
     */
    calculatePeriodComparison(currentEvents, previousEvents, currentDays, previousDays) {
        // Total appointments
        const currentAppointments = currentEvents.length;
        const previousAppointments = previousEvents.length;
        const appointmentsDiff = currentAppointments - previousAppointments;
        const appointmentsPercent = previousAppointments > 0
            ? (appointmentsDiff / previousAppointments * 100)
            : 0;

        // Total hours
        const currentMinutes = currentEvents.reduce((sum, e) => sum + ((e.end - e.start) / (1000 * 60)), 0);
        const previousMinutes = previousEvents.reduce((sum, e) => sum + ((e.end - e.start) / (1000 * 60)), 0);
        const currentHours = currentMinutes / 60;
        const previousHours = previousMinutes / 60;
        const hoursDiff = currentHours - previousHours;
        const hoursPercent = previousHours > 0 ? (hoursDiff / previousHours * 100) : 0;

        // Average daily
        const currentAvgDaily = currentHours / currentDays;
        const previousAvgDaily = previousHours / previousDays;
        const avgDailyDiff = currentAvgDaily - previousAvgDaily;
        const avgDailyPercent = previousAvgDaily > 0 ? (avgDailyDiff / previousAvgDaily * 100) : 0;

        return {
            appointments: {
                current: currentAppointments,
                previous: previousAppointments,
                diff: appointmentsDiff,
                percent: appointmentsPercent,
                trend: appointmentsDiff > 0 ? 'positive' : appointmentsDiff < 0 ? 'negative' : 'neutral'
            },
            hours: {
                current: currentHours,
                previous: previousHours,
                diff: hoursDiff,
                percent: hoursPercent,
                trend: hoursDiff > 1 ? 'positive' : hoursDiff < -1 ? 'negative' : 'neutral'
            },
            avgDaily: {
                current: currentAvgDaily,
                previous: previousAvgDaily,
                diff: avgDailyDiff,
                percent: avgDailyPercent,
                trend: avgDailyDiff > 0.5 ? 'positive' : avgDailyDiff < -0.5 ? 'negative' : 'neutral'
            }
        };
    }
}
