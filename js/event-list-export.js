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
            groupBy = 'client', // 'client' or 'date'
            sortOrder = 'asc' // 'asc' or 'desc'
        } = options;

        // Filter for work events only
        let workEvents = events.filter(event => {
            if (!this.eventProcessor.isWorkEvent(event)) {
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

        // Sort events by start date
        workEvents.sort((a, b) => {
            const dateA = new Date(a.start);
            const dateB = new Date(b.start);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        if (workEvents.length === 0) {
            return 'No work events found in the selected date range.';
        }

        let output = '';

        // Filter out overnight events not on their start date
        const filteredEvents = [];
        workEvents.forEach(event => {
            const eventDate = new Date(event.start);
            if (this.shouldIncludeEventOnDate(event, eventDate)) {
                filteredEvents.push(event);
            }
        });

        if (filteredEvents.length === 0) {
            return 'No work events found in the selected date range.';
        }

        // Add summary header
        const firstEventDate = this.formatDate(new Date(filteredEvents[0].start));
        const lastEventDate = this.formatDate(new Date(filteredEvents[filteredEvents.length - 1].start));

        output += `Work Events Summary\n`;
        output += `${firstEventDate} - ${lastEventDate}\n`;
        output += `Total: ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}\n`;
        output += `${'='.repeat(50)}\n\n`;

        if (groupBy === 'client') {
            // Group by client, then by service type
            const clientGroups = new Map();

            filteredEvents.forEach(event => {
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

            // Generate output grouped by client and service
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

                        output += `    • ${date}${time}\n`;
                    });
                });

                output += '\n';
            });

        } else if (groupBy === 'date') {
            // Group events by date
            const eventsByDate = new Map();

            filteredEvents.forEach(event => {
                const eventDate = new Date(event.start);
                const dateKey = this.formatDate(eventDate);

                if (!eventsByDate.has(dateKey)) {
                    eventsByDate.set(dateKey, []);
                }

                eventsByDate.get(dateKey).push(event);
            });

            // Generate grouped output by date
            for (const [date, dateEvents] of eventsByDate) {
                const eventCount = dateEvents.length;
                const countLabel = eventCount === 1 ? '1 event' : `${eventCount} events`;
                output += `${date} (${countLabel})\n`;

                dateEvents.forEach(event => {
                    const client = this.extractClientName(event.title);
                    const serviceType = this.formatServiceType(event);
                    const time = includeTime ? ` @ ${this.formatTime(new Date(event.start))}` : '';

                    output += `  • ${client} - ${serviceType}${time}\n`;
                });

                output += '\n';
            }
        } else {
            // Simple list without grouping
            filteredEvents.forEach(event => {
                const eventDate = new Date(event.start);
                const date = this.formatDate(eventDate);
                const client = this.extractClientName(event.title);
                const serviceType = this.formatServiceType(event);
                const time = includeTime ? ` @ ${this.formatTime(eventDate)}` : '';

                output += `${date} | ${client} | ${serviceType}${time}\n`;
            });
        }

        return output.trim();
    }

    /**
     * Generate CSV format of work events
     * @param {Array} events - Array of all events
     * @param {Object} options - Export options
     * @returns {string} CSV formatted string
     */
    generateCSV(events, options = {}) {
        const {
            startDate = null,
            endDate = null
        } = options;

        // Filter for work events only
        let workEvents = events.filter(event => {
            if (!this.eventProcessor.isWorkEvent(event)) {
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

        // Sort by date
        workEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

        // CSV header
        let csv = 'Date,Time,Client/Pet,Service Type,Duration\n';

        // CSV rows
        workEvents.forEach(event => {
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

            csv += `${date},${time},${client},${serviceType},${duration}\n`;
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
