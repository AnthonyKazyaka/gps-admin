/**
 * Event List Export
 * Generates formatted text lists of work calendar events
 */

class EventListExporter {
    constructor(eventProcessor) {
        this.eventProcessor = eventProcessor;
    }

    /**
     * Calculate number of nights for an overnight event
     * @param {Object} event - Event object
     * @returns {number} Number of nights
     */
    calculateOvernightNights(event) {
        if (!this.eventProcessor.isOvernightEvent(event)) {
            return 0;
        }

        const start = new Date(event.start);
        const end = new Date(event.end);

        // Set to midnight for accurate day counting
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        // Calculate difference in days
        const diffTime = endDay - startDay;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(1, diffDays); // At least 1 night
    }

    /**
     * Check if event is an "end overnight/HS/housesit" marker
     * @param {Object} event - Event object
     * @returns {boolean} True if this is an end marker
     */
    isEndOvernightMarker(event) {
        const title = event.title || '';
        const titleLower = title.toLowerCase();

        // Check for "end overnight", "end HS", "end housesit" patterns
        return /\b(end\s*(overnight|hs|housesit))\b/i.test(titleLower);
    }

    /**
     * Check if we should include this event in the export
     * For overnight events, only include on the start date
     * Exclude "end overnight/HS/housesit" markers entirely
     * @param {Object} event - Event object
     * @param {Date} checkDate - Date to check against (optional)
     * @returns {boolean} True if should include
     */
    shouldIncludeEventOnDate(event, checkDate = null) {
        // Exclude "end overnight/HS/housesit" markers
        if (this.isEndOvernightMarker(event)) {
            return false;
        }

        // If not an overnight event, always include
        if (!this.eventProcessor.isOvernightEvent(event)) {
            return true;
        }

        // If no specific date to check, include it (will be filtered by date range later)
        if (!checkDate) {
            return true;
        }

        // For overnight events, only include if this is the start date
        const eventStart = new Date(event.start);
        const eventStartDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
        const checkDay = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

        return eventStartDay.getTime() === checkDay.getTime();
    }

    /**
     * Format service type from event title for display
     * @param {Object} event - Event object
     * @returns {string} Formatted service type
     */
    formatServiceType(event) {
        const title = event.title || '';
        const titleLower = title.toLowerCase();

        // Check for overnight/housesit
        if (this.eventProcessor.isOvernightEvent(event)) {
            const nights = this.calculateOvernightNights(event);
            const nightLabel = nights === 1 ? '1 night' : `${nights} nights`;
            return `Overnight (${nightLabel})`;
        }

        // Check for nail trim
        if (titleLower.includes('nail trim')) {
            return 'Nail Trim';
        }

        // Extract duration from title (15, 20, 30, 45, 60 minutes)
        const durationMatch = title.match(/\b(15|20|30|45|60)\b/i);
        if (durationMatch) {
            return `${durationMatch[1]}-min`;
        }

        // Check for meet & greet
        if (this.eventProcessor.workEventPatterns.meetAndGreet.test(title)) {
            return 'Meet & Greet';
        }

        // Default to the event type or 'Visit'
        return event.type === 'walk' ? 'Dog Walk' : 'Visit';
    }

    /**
     * Extract client/pet name from event title
     * @param {string} title - Event title
     * @returns {string} Client/pet name
     */
    extractClientName(title) {
        if (!title) return '';

        // Remove parenthetical notes
        let cleanTitle = title.replace(/\([^)]*\)/g, '').trim();

        // Try to extract name before dash or hyphen
        const dashMatch = cleanTitle.match(/^([^-–—]+)/);
        if (dashMatch) {
            let name = dashMatch[1].trim();

            // Remove service type indicators from the end
            name = name.replace(/\b(15|20|30|45|60)\s*$/i, '').trim();
            name = name.replace(/\b(MG|M&G|HS|Housesit)\s*$/i, '').trim();

            return name;
        }

        return cleanTitle;
    }

    /**
     * Format date for display
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const dayName = days[date.getDay()];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();

        return `${dayName} ${month} ${day}, ${year}`;
    }

    /**
     * Format time for display
     * @param {Date} date - Date object
     * @returns {string} Formatted time string (e.g., "2:30 PM")
     */
    formatTime(date) {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12

        const minuteStr = minutes < 10 ? '0' + minutes : minutes;

        return `${hours}:${minuteStr} ${ampm}`;
    }

    /**
     * Generate text list of work events
     * @param {Array} events - Array of all events
     * @param {Object} options - Export options
     * @returns {string} Formatted text list
     */
    generateTextList(events, options = {}) {
        const {
            startDate = null,
            endDate = null,
            includeTime = false,
            includeLocation = false,
            groupBy = 'date', // 'none', 'date', 'client', 'service', 'week', 'month'
            sortBy = 'date', // 'date', 'client', 'service'
            sortOrder = 'asc', // 'asc' or 'desc'
            workEventsOnly = true
        } = options;

        // Filter events
        let filteredEvents = events.filter(event => {
            // Filter by work events if enabled
            if (workEventsOnly && !this.eventProcessor.isWorkEvent(event)) {
                return false;
            }

            // Filter by date range if specified
            const eventDate = new Date(event.start);

            if (startDate && eventDate < startDate) {
                return false;
            }

            if (endDate && eventDate > endDate) {
                return false;
            }

            return true;
        });

        // Filter out overnight events not on their start date
        filteredEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.start);
            return this.shouldIncludeEventOnDate(event, eventDate);
        });

        // Sort events
        filteredEvents.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'client':
                    const clientA = this.extractClientName(a.title).toLowerCase();
                    const clientB = this.extractClientName(b.title).toLowerCase();
                    comparison = clientA.localeCompare(clientB);
                    // Secondary sort by date
                    if (comparison === 0) {
                        comparison = new Date(a.start) - new Date(b.start);
                    }
                    break;
                case 'service':
                    const serviceA = this.formatServiceType(a).toLowerCase();
                    const serviceB = this.formatServiceType(b).toLowerCase();
                    comparison = serviceA.localeCompare(serviceB);
                    // Secondary sort by date
                    if (comparison === 0) {
                        comparison = new Date(a.start) - new Date(b.start);
                    }
                    break;
                case 'date':
                default:
                    comparison = new Date(a.start) - new Date(b.start);
                    break;
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        if (filteredEvents.length === 0) {
            return 'No events found in the selected date range.';
        }

        let output = '';

        // Add summary header
        const sortedByDate = [...filteredEvents].sort((a, b) => new Date(a.start) - new Date(b.start));
        const firstEventDate = this.formatDate(new Date(sortedByDate[0].start));
        const lastEventDate = this.formatDate(new Date(sortedByDate[sortedByDate.length - 1].start));

        const filterLabel = workEventsOnly ? 'Work Events' : 'All Events';
        output += `${filterLabel} Summary\n`;
        output += `${firstEventDate} - ${lastEventDate}\n`;
        output += `Total: ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}\n`;
        output += `${'='.repeat(50)}\n\n`;

        // Generate output based on groupBy option
        switch (groupBy) {
            case 'client':
                output += this.generateGroupedByClient(filteredEvents, includeTime, includeLocation);
                break;
            case 'service':
                output += this.generateGroupedByService(filteredEvents, includeTime, includeLocation);
                break;
            case 'week':
                output += this.generateGroupedByWeek(filteredEvents, includeTime, includeLocation);
                break;
            case 'month':
                output += this.generateGroupedByMonth(filteredEvents, includeTime, includeLocation);
                break;
            case 'date':
                output += this.generateGroupedByDate(filteredEvents, includeTime, includeLocation);
                break;
            case 'none':
            default:
                output += this.generateSimpleList(filteredEvents, includeTime, includeLocation);
                break;
        }

        return output.trim();
    }

    /**
     * Generate simple list without grouping
     */
    generateSimpleList(events, includeTime, includeLocation) {
        let output = '';
        events.forEach(event => {
            const eventDate = new Date(event.start);
            const date = this.formatDate(eventDate);
            const client = this.extractClientName(event.title);
            const serviceType = this.formatServiceType(event);
            const time = includeTime ? ` @ ${this.formatTime(eventDate)}` : '';
            const location = includeLocation && event.location ? ` | ${event.location}` : '';

            output += `${date} | ${client} | ${serviceType}${time}${location}\n`;
        });
        return output;
    }

    /**
     * Generate output grouped by date
     */
    generateGroupedByDate(events, includeTime, includeLocation) {
        let output = '';
        const eventsByDate = new Map();

        events.forEach(event => {
            const eventDate = new Date(event.start);
            const dateKey = this.formatDate(eventDate);

            if (!eventsByDate.has(dateKey)) {
                eventsByDate.set(dateKey, []);
            }
            eventsByDate.get(dateKey).push(event);
        });

        for (const [date, dateEvents] of eventsByDate) {
            const eventCount = dateEvents.length;
            const countLabel = eventCount === 1 ? '1 event' : `${eventCount} events`;
            output += `${date} (${countLabel})\n`;

            dateEvents.forEach(event => {
                const client = this.extractClientName(event.title);
                const serviceType = this.formatServiceType(event);
                const time = includeTime ? ` @ ${this.formatTime(new Date(event.start))}` : '';
                const location = includeLocation && event.location ? `\n      📍 ${event.location}` : '';

                output += `  • ${client} - ${serviceType}${time}${location}\n`;
            });

            output += '\n';
        }
        return output;
    }

    /**
     * Generate output grouped by client
     */
    generateGroupedByClient(events, includeTime, includeLocation) {
        let output = '';
        const clientGroups = new Map();

        events.forEach(event => {
            const client = this.extractClientName(event.title);
            const serviceType = this.formatServiceType(event);

            if (!clientGroups.has(client)) {
                clientGroups.set(client, new Map());
            }

            const serviceGroups = clientGroups.get(client);
            if (!serviceGroups.has(serviceType)) {
                serviceGroups.set(serviceType, []);
            }

            serviceGroups.get(serviceType).push(event);
        });

        // Sort clients alphabetically
        const sortedClients = Array.from(clientGroups.keys()).sort();

        sortedClients.forEach(client => {
            const serviceGroups = clientGroups.get(client);
            const totalClientEvents = Array.from(serviceGroups.values()).reduce((sum, events) => sum + events.length, 0);

            output += `${client} (${totalClientEvents} visit${totalClientEvents !== 1 ? 's' : ''})\n`;

            serviceGroups.forEach((events, serviceType) => {
                output += `  ${serviceType}:\n`;

                events.forEach(event => {
                    const eventDate = new Date(event.start);
                    const date = this.formatDate(eventDate);
                    const time = includeTime ? ` @ ${this.formatTime(eventDate)}` : '';
                    const location = includeLocation && event.location ? `\n        📍 ${event.location}` : '';

                    output += `    • ${date}${time}${location}\n`;
                });
            });

            output += '\n';
        });

        return output;
    }

    /**
     * Generate output grouped by service type
     */
    generateGroupedByService(events, includeTime, includeLocation) {
        let output = '';
        const serviceGroups = new Map();

        events.forEach(event => {
            const serviceType = this.formatServiceType(event);

            if (!serviceGroups.has(serviceType)) {
                serviceGroups.set(serviceType, []);
            }
            serviceGroups.get(serviceType).push(event);
        });

        // Sort service types alphabetically
        const sortedServices = Array.from(serviceGroups.keys()).sort();

        sortedServices.forEach(serviceType => {
            const serviceEvents = serviceGroups.get(serviceType);
            output += `${serviceType} (${serviceEvents.length} event${serviceEvents.length !== 1 ? 's' : ''})\n`;

            serviceEvents.forEach(event => {
                const eventDate = new Date(event.start);
                const date = this.formatDate(eventDate);
                const client = this.extractClientName(event.title);
                const time = includeTime ? ` @ ${this.formatTime(eventDate)}` : '';
                const location = includeLocation && event.location ? `\n      📍 ${event.location}` : '';

                output += `  • ${date} - ${client}${time}${location}\n`;
            });

            output += '\n';
        });

        return output;
    }

    /**
     * Generate output grouped by week
     */
    generateGroupedByWeek(events, includeTime, includeLocation) {
        let output = '';
        const weekGroups = new Map();

        events.forEach(event => {
            const eventDate = new Date(event.start);
            const weekStart = this.getWeekStart(eventDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const weekKey = `${this.formatShortDate(weekStart)} - ${this.formatShortDate(weekEnd)}`;

            if (!weekGroups.has(weekKey)) {
                weekGroups.set(weekKey, { start: weekStart, events: [] });
            }
            weekGroups.get(weekKey).events.push(event);
        });

        // Sort weeks chronologically
        const sortedWeeks = Array.from(weekGroups.entries()).sort((a, b) => a[1].start - b[1].start);

        sortedWeeks.forEach(([weekKey, { events: weekEvents }]) => {
            output += `Week of ${weekKey} (${weekEvents.length} event${weekEvents.length !== 1 ? 's' : ''})\n`;

            // Sort events within week by date
            weekEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

            weekEvents.forEach(event => {
                const eventDate = new Date(event.start);
                const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
                const day = eventDate.getDate();
                const client = this.extractClientName(event.title);
                const serviceType = this.formatServiceType(event);
                const time = includeTime ? ` @ ${this.formatTime(eventDate)}` : '';
                const location = includeLocation && event.location ? `\n      📍 ${event.location}` : '';

                output += `  • ${dayName} ${day}: ${client} - ${serviceType}${time}${location}\n`;
            });

            output += '\n';
        });

        return output;
    }

    /**
     * Generate output grouped by month
     */
    generateGroupedByMonth(events, includeTime, includeLocation) {
        let output = '';
        const monthGroups = new Map();

        events.forEach(event => {
            const eventDate = new Date(event.start);
            const monthKey = eventDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            const monthStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1);

            if (!monthGroups.has(monthKey)) {
                monthGroups.set(monthKey, { start: monthStart, events: [] });
            }
            monthGroups.get(monthKey).events.push(event);
        });

        // Sort months chronologically
        const sortedMonths = Array.from(monthGroups.entries()).sort((a, b) => a[1].start - b[1].start);

        sortedMonths.forEach(([monthKey, { events: monthEvents }]) => {
            output += `${monthKey} (${monthEvents.length} event${monthEvents.length !== 1 ? 's' : ''})\n`;
            output += `${'─'.repeat(30)}\n`;

            // Sort events within month by date
            monthEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

            monthEvents.forEach(event => {
                const eventDate = new Date(event.start);
                const date = this.formatDate(eventDate);
                const client = this.extractClientName(event.title);
                const serviceType = this.formatServiceType(event);
                const time = includeTime ? ` @ ${this.formatTime(eventDate)}` : '';
                const location = includeLocation && event.location ? `\n      📍 ${event.location}` : '';

                output += `  • ${date}: ${client} - ${serviceType}${time}${location}\n`;
            });

            output += '\n';
        });

        return output;
    }

    /**
     * Get the start of the week (Sunday) for a given date
     */
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Format date in short format (Mon Jan 1)
     */
    formatShortDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    /**
     * Generate CSV format of events
     * @param {Array} events - Array of all events
     * @param {Object} options - Export options
     * @returns {string} CSV formatted string
     */
    generateCSV(events, options = {}) {
        const {
            startDate = null,
            endDate = null,
            workEventsOnly = true,
            sortBy = 'date',
            sortOrder = 'asc',
            includeLocation = false
        } = options;

        // Filter events
        let filteredEvents = events.filter(event => {
            if (workEventsOnly && !this.eventProcessor.isWorkEvent(event)) {
                return false;
            }

            const eventDate = new Date(event.start);

            if (startDate && eventDate < startDate) {
                return false;
            }

            if (endDate && eventDate > endDate) {
                return false;
            }

            return true;
        });

        // Sort events
        filteredEvents.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'client':
                    const clientA = this.extractClientName(a.title).toLowerCase();
                    const clientB = this.extractClientName(b.title).toLowerCase();
                    comparison = clientA.localeCompare(clientB);
                    if (comparison === 0) {
                        comparison = new Date(a.start) - new Date(b.start);
                    }
                    break;
                case 'service':
                    const serviceA = this.formatServiceType(a).toLowerCase();
                    const serviceB = this.formatServiceType(b).toLowerCase();
                    comparison = serviceA.localeCompare(serviceB);
                    if (comparison === 0) {
                        comparison = new Date(a.start) - new Date(b.start);
                    }
                    break;
                case 'date':
                default:
                    comparison = new Date(a.start) - new Date(b.start);
                    break;
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        // CSV header
        let csv = includeLocation 
            ? 'Date,Time,Client/Pet,Service Type,Duration,Location\n'
            : 'Date,Time,Client/Pet,Service Type,Duration\n';

        // CSV rows
        filteredEvents.forEach(event => {
            const eventDate = new Date(event.start);

            // Only include overnight events on their start date
            if (!this.shouldIncludeEventOnDate(event, eventDate)) {
                return;
            }

            const date = this.formatDate(eventDate);
            const time = this.formatTime(eventDate);
            const client = this.escapeCSV(this.extractClientName(event.title));
            const serviceType = this.escapeCSV(this.formatServiceType(event));

            // Calculate duration
            const start = new Date(event.start);
            const end = new Date(event.end);
            const durationMinutes = Math.round((end - start) / (1000 * 60));
            const durationHours = Math.floor(durationMinutes / 60);
            const remainingMinutes = durationMinutes % 60;
            const duration = durationHours > 0
                ? `${durationHours}h ${remainingMinutes}m`
                : `${remainingMinutes}m`;

            if (includeLocation) {
                const location = this.escapeCSV(event.location || '');
                csv += `${date},${time},${client},${serviceType},${duration},${location}\n`;
            } else {
                csv += `${date},${time},${client},${serviceType},${duration}\n`;
            }
        });

        return csv;
    }

    /**
     * Escape CSV field values
     * @param {string} value - Value to escape
     * @returns {string} Escaped value
     */
    escapeCSV(value) {
        if (!value) return '';

        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }

        return value;
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} Success status
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);

            // Fallback method
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return success;
            } catch (fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
                return false;
            }
        }
    }

    /**
     * Download text as file
     * @param {string} text - Text content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadAsFile(text, filename, mimeType = 'text/plain') {
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

// Make available globally
window.EventListExporter = EventListExporter;
