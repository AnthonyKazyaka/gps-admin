/**
 * Workload Analyzer
 * Analyzes calendar events to identify burnout risks and provide recommendations
 */

class WorkloadAnalyzer {
    constructor(thresholds = {}) {
        this.thresholds = {
            comfortable: 6,      // Daily hours for comfortable workload
            busy: 8,             // Daily hours when getting busy
            high: 10,            // Daily hours for high workload
            burnout: 12,         // Daily hours for single-day burnout risk
            weeklyComfortable: 35,  // Weekly hours for sustainable workload
            weeklyHigh: 50,         // Weekly hours that's getting unsustainable
            consecutiveDaysWarning: 5,  // Days in a row before warning
            consecutiveDaysCritical: 7, // Days in a row before critical
            ...thresholds
        };
    }

    /**
     * Update thresholds
     */
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }

    /**
     * Calculate event duration for a specific day
     * Handles multi-day events and overnight appointments properly
     * @param {Object} event - The event object
     * @param {Date} targetDate - The specific date to calculate duration for
     * @returns {number} Duration in minutes for that specific day
     */
    calculateEventDurationForDay(event, targetDate) {
        // All-day events (like birthdays) don't count toward workload
        if (event.isAllDay) {
            return 0;
        }
        
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        // Set target day boundaries (midnight to midnight)
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        // If event doesn't overlap with this day at all, return 0
        if (eventEnd <= dayStart || eventStart > dayEnd) {
            return 0;
        }
        
        // Special handling for overnight appointments
        // These typically run from 8-9 PM to 8-9 AM and should count as 12 hours per day
        const isOvernightType = event.type === 'overnight' || 
                               event.title?.toLowerCase().includes('overnight') ||
                               event.title?.toLowerCase().includes('boarding');
        
        if (isOvernightType) {
            // Calculate the actual overlap, but cap at 12 hours per day for overnights
            const overlapStart = eventStart > dayStart ? eventStart : dayStart;
            const overlapEnd = eventEnd < dayEnd ? eventEnd : dayEnd;
            const actualMinutes = (overlapEnd - overlapStart) / (1000 * 60);
            
            // For overnight stays, count 12 hours per day maximum
            // This represents the active care time (evening check-in + morning check-out)
            return Math.min(actualMinutes, 12 * 60);
        }
        
        // For regular appointments, calculate the actual overlap with the day
        const overlapStart = eventStart > dayStart ? eventStart : dayStart;
        const overlapEnd = eventEnd < dayEnd ? eventEnd : dayEnd;
        const minutes = (overlapEnd - overlapStart) / (1000 * 60);
        
        return Math.max(0, minutes);
    }

    /**
     * Analyze a single day's workload
     * @param {Array} events - Events for the day
     * @param {Date} date - The date being analyzed
     * @returns {Object} Analysis results
     */
    analyzeDay(events, date) {
        // Calculate total working time for this specific day
        // This properly handles multi-day events by only counting overlap with this day
        const totalMinutes = events.reduce((sum, event) => {
            const duration = this.calculateEventDurationForDay(event, date);
            return sum + duration;
        }, 0);

        const totalHours = totalMinutes / 60;

        // Calculate appointment density (appointments per hour)
        const workingHours = this.calculateWorkingHours(events);
        const density = workingHours > 0 ? events.length / workingHours : 0;

        // Calculate average break time between appointments
        const avgBreakTime = this.calculateAverageBreakTime(events);

        // Calculate travel time (mock for now)
        const estimatedTravelTime = this.estimateTravelTime(events);

        // Determine workload level
        const level = this.getWorkloadLevel(totalHours);

        // Calculate risk score (0-100)
        const riskScore = this.calculateRiskScore({
            totalHours,
            density,
            avgBreakTime,
            travelTime: estimatedTravelTime
        });

        // Generate recommendations
        const recommendations = this.generateRecommendations({
            level,
            riskScore,
            totalHours,
            density,
            avgBreakTime,
            eventCount: events.length
        });

        return {
            date,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalMinutes: Math.round(totalMinutes),
            eventCount: events.length,
            density: parseFloat(density.toFixed(2)),
            avgBreakTime: Math.round(avgBreakTime),
            estimatedTravelTime: Math.round(estimatedTravelTime),
            workloadLevel: level,
            riskScore: Math.round(riskScore),
            recommendations,
            events
        };
    }

    /**
     * Analyze a week's workload
     * @param {Array} events - All events
     * @param {Date} weekStart - Start of week
     * @returns {Object} Weekly analysis
     */
    analyzeWeek(events, weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekEvents = events.filter(event =>
            event.start >= weekStart && event.start < weekEnd
        );

        const dailyAnalyses = [];
        const currentDate = new Date(weekStart);

        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const dayEvents = weekEvents.filter(event => {
                const eventDate = new Date(event.start);
                eventDate.setHours(0, 0, 0, 0);
                return eventDate.getTime() === dayStart.getTime();
            });

            dailyAnalyses.push(this.analyzeDay(dayEvents, new Date(dayStart)));

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calculate weekly metrics
        const totalWeekHours = dailyAnalyses.reduce((sum, day) => sum + day.totalHours, 0);
        const totalWeekEvents = dailyAnalyses.reduce((sum, day) => sum + day.eventCount, 0);
        const avgDailyHours = totalWeekHours / 7;
        const consecutiveWorkDays = this.calculateConsecutiveWorkDays(dailyAnalyses);
        const burnoutDays = dailyAnalyses.filter(day => day.workloadLevel === 'burnout').length;
        const highWorkloadDays = dailyAnalyses.filter(day =>
            day.workloadLevel === 'high' || day.workloadLevel === 'burnout'
        ).length;

        // Calculate weekly risk score
        const weeklyRiskScore = this.calculateWeeklyRiskScore({
            avgDailyHours,
            consecutiveWorkDays,
            burnoutDays,
            highWorkloadDays,
            totalWeekHours
        });

        return {
            weekStart,
            weekEnd,
            dailyAnalyses,
            totalWeekHours: parseFloat(totalWeekHours.toFixed(2)),
            totalWeekEvents,
            avgDailyHours: parseFloat(avgDailyHours.toFixed(2)),
            consecutiveWorkDays,
            burnoutDays,
            highWorkloadDays,
            weeklyRiskScore: Math.round(weeklyRiskScore),
            recommendations: this.generateWeeklyRecommendations({
                avgDailyHours,
                consecutiveWorkDays,
                burnoutDays,
                highWorkloadDays
            })
        };
    }

    /**
     * Calculate working hours span (first to last appointment)
     */
    calculateWorkingHours(events) {
        if (events.length === 0) return 0;

        const sortedEvents = [...events].sort((a, b) => a.start - b.start);
        const firstEvent = sortedEvents[0];
        const lastEvent = sortedEvents[sortedEvents.length - 1];

        const span = (lastEvent.end - firstEvent.start) / (1000 * 60 * 60);
        return Math.max(span, 0);
    }

    /**
     * Calculate average break time between appointments
     */
    calculateAverageBreakTime(events) {
        if (events.length <= 1) return 0;

        const sortedEvents = [...events].sort((a, b) => a.start - b.start);
        let totalBreakTime = 0;
        let breakCount = 0;

        for (let i = 0; i < sortedEvents.length - 1; i++) {
            const breakTime = (sortedEvents[i + 1].start - sortedEvents[i].end) / (1000 * 60);
            if (breakTime >= 0) {
                totalBreakTime += breakTime;
                breakCount++;
            }
        }

        return breakCount > 0 ? totalBreakTime / breakCount : 0;
    }

    /**
     * Estimate travel time (mock - would use Google Maps API)
     */
    estimateTravelTime(events) {
        // Mock: assume 15 minutes travel time per appointment
        return events.length * 15;
    }

    /**
     * Get workload level based on hours
     */
    getWorkloadLevel(hours) {
        if (hours >= this.thresholds.burnout) return 'burnout';
        if (hours >= this.thresholds.high) return 'high';
        if (hours >= this.thresholds.busy) return 'busy';
        return 'comfortable';
    }

    /**
     * Calculate risk score (0-100)
     * Higher score = higher burnout risk
     */
    calculateRiskScore({ totalHours, density, avgBreakTime, travelTime }) {
        let score = 0;

        // Hours factor (0-40 points)
        const hoursRatio = totalHours / this.thresholds.burnout;
        score += Math.min(hoursRatio * 40, 40);

        // Density factor (0-25 points)
        // High density (many appointments per hour) increases risk
        if (density > 1.5) score += 25;
        else if (density > 1) score += 15;
        else if (density > 0.5) score += 5;

        // Break time factor (0-20 points)
        // Short breaks increase risk
        if (avgBreakTime < 15) score += 20;
        else if (avgBreakTime < 30) score += 15;
        else if (avgBreakTime < 60) score += 10;
        else score += 5;

        // Travel time factor (0-15 points)
        const travelHours = travelTime / 60;
        if (travelHours > 3) score += 15;
        else if (travelHours > 2) score += 10;
        else if (travelHours > 1) score += 5;

        return Math.min(score, 100);
    }

    /**
     * Calculate consecutive work days
     */
    calculateConsecutiveWorkDays(dailyAnalyses) {
        let maxConsecutive = 0;
        let currentConsecutive = 0;

        dailyAnalyses.forEach(day => {
            if (day.eventCount > 0) {
                currentConsecutive++;
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
            } else {
                currentConsecutive = 0;
            }
        });

        return maxConsecutive;
    }

    /**
     * Calculate weekly risk score
     * Focuses on sustained patterns rather than single-day spikes
     */
    calculateWeeklyRiskScore({ avgDailyHours, consecutiveWorkDays, burnoutDays, highWorkloadDays, totalWeekHours }) {
        let score = 0;

        // Total weekly hours (0-35 points) - Most important factor
        // Reflects cumulative time away from personal life
        if (totalWeekHours >= 60) score += 35;      // Extreme - no life outside work
        else if (totalWeekHours >= 50) score += 30; // Very high - minimal personal time
        else if (totalWeekHours >= 40) score += 20; // High - limited personal time
        else if (totalWeekHours >= 35) score += 10; // Moderate - manageable
        else score += 0;                             // Sustainable

        // Consecutive work days without rest (0-30 points) - Second most important
        // Lack of recovery time is key burnout indicator
        if (consecutiveWorkDays >= 7) score += 30;      // No rest days at all
        else if (consecutiveWorkDays >= 6) score += 25; // Only one rest day
        else if (consecutiveWorkDays >= 5) score += 15; // Limited recovery
        else if (consecutiveWorkDays >= 4) score += 5;  // Some recovery time

        // High workload days sustained over time (0-20 points)
        // Multiple demanding days compounds fatigue
        if (highWorkloadDays >= 5) score += 20;      // Most of week is demanding
        else if (highWorkloadDays >= 4) score += 15; // More than half demanding
        else if (highWorkloadDays >= 3) score += 10; // Several demanding days
        else if (highWorkloadDays >= 2) score += 5;  // A few demanding days

        // Single burnout days (0-15 points) - Less important than sustained load
        // One crazy day is recoverable, sustained load is not
        score += Math.min(burnoutDays * 8, 15);

        return Math.min(score, 100);
    }

    /**
     * Generate daily recommendations
     */
    generateRecommendations({ level, riskScore, totalHours, density, avgBreakTime, eventCount }) {
        const recommendations = [];

        if (level === 'burnout') {
            recommendations.push({
                type: 'critical',
                icon: '🚨',
                title: 'Burnout Risk',
                message: `${totalHours.toFixed(1)} hours scheduled exceeds your burnout threshold (${this.thresholds.burnout}h). Strongly consider declining new bookings or rescheduling.`
            });
        } else if (level === 'high') {
            recommendations.push({
                type: 'warning',
                icon: '⚠️',
                title: 'High Workload',
                message: `${totalHours.toFixed(1)} hours scheduled. Be very selective with new bookings to avoid burnout.`
            });
        } else if (level === 'busy') {
            recommendations.push({
                type: 'info',
                icon: '📊',
                title: 'Busy Day',
                message: `${totalHours.toFixed(1)} hours scheduled. You're approaching your comfortable capacity.`
            });
        } else if (eventCount > 0) {
            recommendations.push({
                type: 'success',
                icon: '✅',
                title: 'Good Capacity',
                message: `${totalHours.toFixed(1)} hours scheduled. You have good capacity for additional bookings.`
            });
        }

        // Break time recommendations
        if (avgBreakTime < 15 && eventCount > 2) {
            recommendations.push({
                type: 'warning',
                icon: '⏰',
                title: 'Short Breaks',
                message: `Average ${Math.round(avgBreakTime)} minutes between appointments. Consider spacing appointments further apart.`
            });
        }

        // Density recommendations
        if (density > 1.5) {
            recommendations.push({
                type: 'info',
                icon: '📍',
                title: 'High Appointment Density',
                message: `${eventCount} appointments in a short timeframe. Ensure routes are optimized to minimize travel time.`
            });
        }

        // Risk-based recommendations
        if (riskScore > 75) {
            recommendations.push({
                type: 'critical',
                icon: '🛑',
                title: 'High Burnout Risk',
                message: `Risk score: ${riskScore}/100. Take extra care to maintain work-life balance and avoid overcommitment.`
            });
        }

        return recommendations;
    }

    /**
     * Generate weekly recommendations
     * Focus on sustained patterns and recovery time
     */
    generateWeeklyRecommendations({ avgDailyHours, consecutiveWorkDays, burnoutDays, highWorkloadDays }) {
        const recommendations = [];

        // CRITICAL: No rest days - highest priority issue
        if (consecutiveWorkDays >= 7) {
            recommendations.push({
                type: 'critical',
                icon: '🚨',
                title: 'Burnout Risk: No Recovery Time',
                message: 'Working all 7 days without rest leaves no time for personal responsibilities, recovery, or self-care. This pattern is unsustainable and leads to burnout.'
            });
        } else if (consecutiveWorkDays >= 6) {
            recommendations.push({
                type: 'warning',
                icon: '😴',
                title: 'Very Limited Recovery Time',
                message: `Only ${7 - consecutiveWorkDays} rest day(s) this week. Difficult to recharge, handle personal tasks, or maintain work-life balance.`
            });
        } else if (consecutiveWorkDays >= 5) {
            recommendations.push({
                type: 'info',
                icon: '📅',
                title: 'Limited Personal Time',
                message: `${consecutiveWorkDays} consecutive work days. Consider protecting at least 2 days per week for personal life and recovery.`
            });
        }

        // WARNING: Multiple high-demand days sustained over time
        if (highWorkloadDays >= 5) {
            recommendations.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Sustained High Demand',
                message: `${highWorkloadDays} demanding days this week makes it hard to keep up with personal goals and responsibilities. Consider spreading out the workload.`
            });
        } else if (highWorkloadDays >= 4) {
            recommendations.push({
                type: 'info',
                icon: '📊',
                title: 'Busy Week Pattern',
                message: `${highWorkloadDays} high-workload days. Ensure you're protecting time for rest and personal tasks.`
            });
        }

        // Total weekly hours check - cumulative impact
        const totalWeekHours = avgDailyHours * 7;
        if (totalWeekHours >= 60) {
            recommendations.push({
                type: 'critical',
                icon: '🛑',
                title: 'Extreme Weekly Hours',
                message: `${totalWeekHours.toFixed(0)} hours this week leaves almost no time for personal life. This pace is not sustainable.`
            });
        } else if (totalWeekHours >= 50) {
            recommendations.push({
                type: 'warning',
                icon: '⏰',
                title: 'Very High Weekly Hours',
                message: `${totalWeekHours.toFixed(0)} hours working makes it difficult to maintain personal responsibilities and relationships.`
            });
        } else if (totalWeekHours >= 40) {
            recommendations.push({
                type: 'info',
                icon: '⏱️',
                title: 'High Weekly Load',
                message: `${totalWeekHours.toFixed(0)} hours scheduled. Monitor how you're feeling and protect personal time where possible.`
            });
        }

        // Note about single extreme days (less concerning than patterns)
        if (burnoutDays > 0 && burnoutDays <= 2) {
            recommendations.push({
                type: 'info',
                icon: '💡',
                title: 'Note: Single Busy Day',
                message: `${burnoutDays} very busy day(s) this week. One crazy day is manageable if you have recovery time before and after.`
            });
        } else if (burnoutDays > 2) {
            recommendations.push({
                type: 'warning',
                icon: '🚨',
                title: 'Multiple Extreme Days',
                message: `${burnoutDays} days with extreme hours. Multiple demanding days compounds fatigue - ensure adequate recovery.`
            });
        }

        // Positive reinforcement for healthy patterns
        if (consecutiveWorkDays <= 5 && totalWeekHours < 40 && highWorkloadDays <= 3) {
            recommendations.push({
                type: 'success',
                icon: '🌟',
                title: 'Sustainable Pace',
                message: 'Your schedule allows time for personal goals, rest, and responsibilities. This pace is maintainable long-term!'
            });
        } else if (consecutiveWorkDays <= 6 && totalWeekHours < 50) {
            recommendations.push({
                type: 'success',
                icon: '✅',
                title: 'Manageable Workload',
                message: 'You have some recovery time built in. Keep protecting those rest days!'
            });
        }

        return recommendations;
    }

    /**
     * Find optimal days for time off
     * @param {Array} dailyAnalyses - Week of daily analyses
     * @returns {Array} Suggested days off
     */
    findOptimalTimeOff(dailyAnalyses) {
        // Sort days by workload (ascending)
        const sortedDays = [...dailyAnalyses]
            .map((day, index) => ({ day, index }))
            .sort((a, b) => a.day.totalHours - b.day.totalHours);

        // Suggest the lightest workload days
        return sortedDays.slice(0, 2).map(item => ({
            date: item.day.date,
            currentHours: item.day.totalHours,
            currentEvents: item.day.eventCount,
            reason: item.day.totalHours === 0
                ? 'Already a rest day'
                : `Light workload (${item.day.totalHours.toFixed(1)}h) - easiest to reschedule`
        }));
    }

    /**
     * Assess capacity for new booking
     * @param {Object} dailyAnalysis - Analysis for the day
     * @param {number} newBookingHours - Hours for potential new booking
     * @returns {Object} Capacity assessment
     */
    assessNewBookingCapacity(dailyAnalysis, newBookingHours) {
        const projectedHours = dailyAnalysis.totalHours + newBookingHours;
        const projectedLevel = this.getWorkloadLevel(projectedHours);

        let recommendation = '';
        let accept = true;

        if (projectedLevel === 'burnout') {
            recommendation = 'Decline - would exceed burnout threshold';
            accept = false;
        } else if (projectedLevel === 'high') {
            recommendation = 'Consider carefully - would result in high workload';
            accept = 'conditional';
        } else if (projectedLevel === 'busy') {
            recommendation = 'Acceptable - would be busy but manageable';
            accept = true;
        } else {
            recommendation = 'Accept - within comfortable capacity';
            accept = true;
        }

        return {
            currentHours: dailyAnalysis.totalHours,
            newBookingHours,
            projectedHours,
            currentLevel: dailyAnalysis.workloadLevel,
            projectedLevel,
            recommendation,
            accept,
            availableCapacity: Math.max(0, this.thresholds.burnout - projectedHours)
        };
    }
}

// Make available globally
window.WorkloadAnalyzer = WorkloadAnalyzer;
