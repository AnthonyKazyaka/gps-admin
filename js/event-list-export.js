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
     * @returns {string} Formatted date string (e.g., "11/07/2025")
     */
    formatDate(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();

        return `${month}/${day}/${year}`;
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
     * Compare two events by a given sort field
     * @param {Object} a - First event
     * @param {Object} b - Second event
     * @param {string} sortField - Field to sort by ('date', 'client', 'service', 'time')
     * @returns {number} Comparison result
     */
    compareEvents(a, b, sortField) {
        switch (sortField) {
            case 'client':
                const clientA = this.extractClientName(a.title).toLowerCase();
                const clientB = this.extractClientName(b.title).toLowerCase();
                return clientA.localeCompare(clientB);
            case 'service':
                const serviceA = this.formatServiceType(a).toLowerCase();
                const serviceB = this.formatServiceType(b).toLowerCase();
                return serviceA.localeCompare(serviceB);
            case 'time':
                const timeA = new Date(a.start);
                const timeB = new Date(b.start);
                // Compare just the time portion (hours and minutes)
                const minutesA = timeA.getHours() * 60 + timeA.getMinutes();
                const minutesB = timeB.getHours() * 60 + timeB.getMinutes();
                return minutesA - minutesB;
            case 'date':
            default:
                return new Date(a.start) - new Date(b.start);
        }
    }

    /**
     * Sort events with multiple sort levels
     * @param {Array} events - Events to sort
     * @param {Array|Object} sortLevels - Array of {sortBy, sortOrder} or single sort config
     * @returns {Array} Sorted events
     */
    sortEventsMultiLevel(events, sortLevels) {
        // Normalize to array
        const levels = Array.isArray(sortLevels) ? sortLevels : [sortLevels];
        
        if (levels.length === 0) {
            levels.push({ sortBy: 'time', sortOrder: 'asc' });
        }

        return [...events].sort((a, b) => {
            for (const level of levels) {
                const { sortBy, sortOrder } = level;
                let comparison = this.compareEvents(a, b, sortBy);
                
                if (sortOrder === 'desc') {
                    comparison = -comparison;
                }
                
                if (comparison !== 0) {
                    return comparison;
                }
            }
            
            // Final tie-breaker: sort by date/time
            return new Date(a.start) - new Date(b.start);
        });
    }

    /**
     * Sort events with primary and optional secondary sort fields (legacy support)
     * @param {Array} events - Events to sort
     * @param {string} primarySort - Primary sort field
     * @param {string} secondarySort - Secondary sort field (optional)
     * @param {string} sortOrder - 'asc' or 'desc'
     * @returns {Array} Sorted events
     */
    sortEvents(events, primarySort, secondarySort = null, sortOrder = 'asc') {
        return [...events].sort((a, b) => {
            let comparison = this.compareEvents(a, b, primarySort);
            
            // Apply secondary sort if primary comparison is equal
            if (comparison === 0 && secondarySort) {
                comparison = this.compareEvents(a, b, secondarySort);
            }
            
            // If still equal after secondary sort, fall back to date for consistency
            if (comparison === 0 && primarySort !== 'date' && secondarySort !== 'date') {
                comparison = this.compareEvents(a, b, 'date');
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });
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
            groupBy = 'date', // 'none', 'date', 'client', 'service', 'week', 'month', or combinations like 'client-date'
            groupSort = { sortBy: 'date', sortOrder: 'asc' }, // How to sort groups
            eventSort = [{ sortBy: 'time', sortOrder: 'asc' }], // How to sort events (array of levels)
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

        // Sort events using multi-level sorting
        filteredEvents = this.sortEventsMultiLevel(filteredEvents, eventSort);

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

        // Check if groupBy contains multiple levels (e.g., "client-service-date")
        const groupLevels = groupBy.split('-').filter(level => level && level !== 'none');
        
        // Always use dynamic grouping for consistency - it handles all cases
        if (groupLevels.length > 0) {
            output += this.generateDynamicGrouping(filteredEvents, groupLevels, includeTime, includeLocation, groupSort, eventSort);
            return output.trim();
        }

        // No grouping - flat list
        output += this.generateSimpleList(filteredEvents, includeTime, includeLocation);

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
    generateGroupedByDate(events, includeTime, includeLocation, sortOptions = {}) {
        const { sortBy = 'time', secondarySort, sortOrder = 'asc' } = sortOptions;
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
            // Sort events within this date group
            const sortedDateEvents = this.sortEvents(dateEvents, sortBy, secondarySort, sortOrder);
            
            const eventCount = sortedDateEvents.length;
            const countLabel = eventCount === 1 ? '1 event' : `${eventCount} events`;
            output += `${date} (${countLabel})\n`;

            sortedDateEvents.forEach(event => {
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
    generateGroupedByClient(events, includeTime, includeLocation, sortOptions = {}) {
        const { sortBy = 'date', secondarySort, sortOrder = 'asc' } = sortOptions;
        let output = '';
        const clientGroups = new Map();

        events.forEach(event => {
            const client = this.extractClientName(event.title);

            if (!clientGroups.has(client)) {
                clientGroups.set(client, []);
            }
            clientGroups.get(client).push(event);
        });

        // Sort clients alphabetically (or by event count if sortBy is set differently)
        const sortedClients = Array.from(clientGroups.keys()).sort((a, b) => {
            if (sortOrder === 'desc') {
                return b.localeCompare(a);
            }
            return a.localeCompare(b);
        });

        sortedClients.forEach(client => {
            const clientEvents = clientGroups.get(client);
            // Sort events within this client's group
            const sortedClientEvents = this.sortEvents(clientEvents, sortBy, secondarySort, sortOrder);
            
            output += `${client} (${sortedClientEvents.length} visit${sortedClientEvents.length !== 1 ? 's' : ''})\n`;

            sortedClientEvents.forEach(event => {
                const eventDate = new Date(event.start);
                const date = this.formatDate(eventDate);
                const serviceType = this.formatServiceType(event);
                const time = includeTime ? ` @ ${this.formatTime(eventDate)}` : '';
                const location = includeLocation && event.location ? `\n      📍 ${event.location}` : '';

                output += `  • ${date} - ${serviceType}${time}${location}\n`;
            });

            output += '\n';
        });

        return output;
    }

    /**
     * Generate output grouped by service type
     */
    generateGroupedByService(events, includeTime, includeLocation, sortOptions = {}) {
        const { sortBy = 'date', secondarySort, sortOrder = 'asc' } = sortOptions;
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
        const sortedServices = Array.from(serviceGroups.keys()).sort((a, b) => {
            if (sortOrder === 'desc') {
                return b.localeCompare(a);
            }
            return a.localeCompare(b);
        });

        sortedServices.forEach(serviceType => {
            const serviceEvents = serviceGroups.get(serviceType);
            // Sort events within this service group
            const sortedServiceEvents = this.sortEvents(serviceEvents, sortBy, secondarySort, sortOrder);
            
            output += `${serviceType} (${sortedServiceEvents.length} event${sortedServiceEvents.length !== 1 ? 's' : ''})\n`;

            sortedServiceEvents.forEach(event => {
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
    generateGroupedByWeek(events, includeTime, includeLocation, sortOptions = {}) {
        const { sortBy = 'date', secondarySort, sortOrder = 'asc' } = sortOptions;
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

        // Sort weeks chronologically (or reverse if descending)
        const sortedWeeks = Array.from(weekGroups.entries()).sort((a, b) => {
            const comparison = a[1].start - b[1].start;
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        sortedWeeks.forEach(([weekKey, { events: weekEvents }]) => {
            // Sort events within this week
            const sortedWeekEvents = this.sortEvents(weekEvents, sortBy, secondarySort, sortOrder);
            
            output += `Week of ${weekKey} (${sortedWeekEvents.length} event${sortedWeekEvents.length !== 1 ? 's' : ''})\n`;

            sortedWeekEvents.forEach(event => {
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
    generateGroupedByMonth(events, includeTime, includeLocation, sortOptions = {}) {
        const { sortBy = 'date', secondarySort, sortOrder = 'asc' } = sortOptions;
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

        // Sort months chronologically (or reverse if descending)
        const sortedMonths = Array.from(monthGroups.entries()).sort((a, b) => {
            const comparison = a[1].start - b[1].start;
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        sortedMonths.forEach(([monthKey, { events: monthEvents }]) => {
            // Sort events within this month
            const sortedMonthEvents = this.sortEvents(monthEvents, sortBy, secondarySort, sortOrder);
            
            output += `${monthKey} (${sortedMonthEvents.length} event${sortedMonthEvents.length !== 1 ? 's' : ''})\n`;
            output += `${'─'.repeat(30)}\n`;

            sortedMonthEvents.forEach(event => {
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
     * Generate output grouped by client, then by service type
     */
    generateGroupedByClientThenService(events, includeTime, includeLocation, sortOptions = {}) {
        const { sortBy = 'date', secondarySort, sortOrder = 'asc' } = sortOptions;
        let output = '';
        const clientGroups = new Map();

        // Group by client
        events.forEach(event => {
            const client = this.extractClientName(event.title);
            if (!clientGroups.has(client)) {
                clientGroups.set(client, new Map());
            }

            // Then group by service within each client
            const serviceGroups = clientGroups.get(client);
            const serviceType = this.formatServiceType(event);
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

            // Sort services alphabetically
            const sortedServices = Array.from(serviceGroups.keys()).sort();

            sortedServices.forEach(serviceType => {
                const serviceEvents = serviceGroups.get(serviceType);
                // Sort events within this service group
                const sortedServiceEvents = this.sortEvents(serviceEvents, sortBy, secondarySort, sortOrder);

                output += `  ${serviceType} (${sortedServiceEvents.length}):\n`;

                sortedServiceEvents.forEach(event => {
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
     * Generate output grouped by client, then by date
     */
    generateGroupedByClientThenDate(events, includeTime, includeLocation, sortOptions = {}) {
        const { sortBy = 'time', secondarySort, sortOrder = 'asc' } = sortOptions;
        let output = '';
        const clientGroups = new Map();

        // Group by client
        events.forEach(event => {
            const client = this.extractClientName(event.title);
            if (!clientGroups.has(client)) {
                clientGroups.set(client, new Map());
            }

            // Then group by date within each client
            const dateGroups = clientGroups.get(client);
            const eventDate = new Date(event.start);
            const dateKey = this.formatDate(eventDate);
            if (!dateGroups.has(dateKey)) {
                dateGroups.set(dateKey, []);
            }
            dateGroups.get(dateKey).push(event);
        });

        // Sort clients alphabetically
        const sortedClients = Array.from(clientGroups.keys()).sort();

        sortedClients.forEach(client => {
            const dateGroups = clientGroups.get(client);
            const totalClientEvents = Array.from(dateGroups.values()).reduce((sum, events) => sum + events.length, 0);

            output += `${client} (${totalClientEvents} visit${totalClientEvents !== 1 ? 's' : ''})\n`;

            // Sort dates chronologically
            const sortedDates = Array.from(dateGroups.entries()).sort((a, b) => {
                return new Date(a[0]) - new Date(b[0]);
            });

            sortedDates.forEach(([dateKey, dateEvents]) => {
                // Sort events within this date group
                const sortedDateEvents = this.sortEvents(dateEvents, sortBy, secondarySort, sortOrder);

                output += `  ${dateKey} (${sortedDateEvents.length}):\n`;

                sortedDateEvents.forEach(event => {
                    const serviceType = this.formatServiceType(event);
                    const time = includeTime ? ` @ ${this.formatTime(new Date(event.start))}` : '';
                    const location = includeLocation && event.location ? `\n        📍 ${event.location}` : '';

                    output += `    • ${serviceType}${time}${location}\n`;
                });
            });

            output += '\n';
        });

        return output;
    }

    /**
     * Generate output grouped by service type, then by client
     */
    generateGroupedByServiceThenClient(events, includeTime, includeLocation, sortOptions = {}) {
        const { sortBy = 'date', secondarySort, sortOrder = 'asc' } = sortOptions;
        let output = '';
        const serviceGroups = new Map();

        // Group by service
        events.forEach(event => {
            const serviceType = this.formatServiceType(event);
            if (!serviceGroups.has(serviceType)) {
                serviceGroups.set(serviceType, new Map());
            }

            // Then group by client within each service
            const clientGroups = serviceGroups.get(serviceType);
            const client = this.extractClientName(event.title);
            if (!clientGroups.has(client)) {
                clientGroups.set(client, []);
            }
            clientGroups.get(client).push(event);
        });

        // Sort services alphabetically
        const sortedServices = Array.from(serviceGroups.keys()).sort();

        sortedServices.forEach(serviceType => {
            const clientGroups = serviceGroups.get(serviceType);
            const totalServiceEvents = Array.from(clientGroups.values()).reduce((sum, events) => sum + events.length, 0);

            output += `${serviceType} (${totalServiceEvents} event${totalServiceEvents !== 1 ? 's' : ''})\n`;

            // Sort clients alphabetically
            const sortedClients = Array.from(clientGroups.keys()).sort();

            sortedClients.forEach(client => {
                const clientEvents = clientGroups.get(client);
                // Sort events within this client group
                const sortedClientEvents = this.sortEvents(clientEvents, sortBy, secondarySort, sortOrder);

                output += `  ${client} (${sortedClientEvents.length}):\n`;

                sortedClientEvents.forEach(event => {
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
     * Generate output grouped by service type, then by date
     */
    generateGroupedByServiceThenDate(events, includeTime, includeLocation, sortOptions = {}) {
        const { sortBy = 'time', secondarySort, sortOrder = 'asc' } = sortOptions;
        let output = '';
        const serviceGroups = new Map();

        // Group by service
        events.forEach(event => {
            const serviceType = this.formatServiceType(event);
            if (!serviceGroups.has(serviceType)) {
                serviceGroups.set(serviceType, new Map());
            }

            // Then group by date within each service
            const dateGroups = serviceGroups.get(serviceType);
            const eventDate = new Date(event.start);
            const dateKey = this.formatDate(eventDate);
            if (!dateGroups.has(dateKey)) {
                dateGroups.set(dateKey, []);
            }
            dateGroups.get(dateKey).push(event);
        });

        // Sort services alphabetically
        const sortedServices = Array.from(serviceGroups.keys()).sort();

        sortedServices.forEach(serviceType => {
            const dateGroups = serviceGroups.get(serviceType);
            const totalServiceEvents = Array.from(dateGroups.values()).reduce((sum, events) => sum + events.length, 0);

            output += `${serviceType} (${totalServiceEvents} event${totalServiceEvents !== 1 ? 's' : ''})\n`;

            // Sort dates chronologically
            const sortedDates = Array.from(dateGroups.entries()).sort((a, b) => {
                return new Date(a[0]) - new Date(b[0]);
            });

            sortedDates.forEach(([dateKey, dateEvents]) => {
                // Sort events within this date group
                const sortedDateEvents = this.sortEvents(dateEvents, sortBy, secondarySort, sortOrder);

                output += `  ${dateKey} (${sortedDateEvents.length}):\n`;

                sortedDateEvents.forEach(event => {
                    const client = this.extractClientName(event.title);
                    const time = includeTime ? ` @ ${this.formatTime(new Date(event.start))}` : '';
                    const location = includeLocation && event.location ? `\n        📍 ${event.location}` : '';

                    output += `    • ${client}${time}${location}\n`;
                });
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
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }

    /**
     * Get week label for grouping
     * @param {Date} date - Date to get week label for
     * @returns {string} Week label (e.g., "Week of 11/04/2025")
     */
    getWeekLabel(date) {
        const weekStart = this.getWeekStart(date);
        return `Week of ${this.formatDate(weekStart)}`;
    }

    /**
     * Get month label for grouping
     * @param {Date} date - Date to get month label for
     * @returns {string} Month label (e.g., "11/2025")
     */
    getMonthLabel(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${year}`;
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
            secondarySort = null,
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

        // Sort events using combined sorting
        filteredEvents = this.sortEvents(filteredEvents, sortBy, secondarySort, sortOrder);

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

    /**
     * Generate output with dynamic multi-level grouping
     * @param {Array} events - Events to group
     * @param {Array} groupLevels - Array of grouping keys (e.g., ['client', 'service', 'date'])
     * @param {boolean} includeTime - Include time in output
     * @param {boolean} includeLocation - Include location in output
     * @param {Object} groupSort - Sort configuration for groups { sortBy, sortOrder }
     * @param {Object} eventSort - Sort configuration for events { sortBy, sortOrder }
     * @returns {string} Formatted output
     */
    generateDynamicGrouping(events, groupLevels, includeTime, includeLocation, groupSort = {}, eventSort = []) {
        if (!groupLevels || groupLevels.length === 0) {
            return this.generateSimpleList(events, includeTime, includeLocation);
        }

        const groupSortBy = groupSort.sortBy || 'date';
        const groupSortOrder = groupSort.sortOrder || 'asc';
        
        // Normalize eventSort to array
        const eventSortLevels = Array.isArray(eventSort) ? eventSort : [eventSort];
        
        // Build nested structure
        const grouped = this.buildNestedGroups(events, groupLevels);
        
        // Render nested structure
        return this.renderNestedGroups(grouped, groupLevels, 0, includeTime, includeLocation, groupSortBy, groupSortOrder, eventSortLevels);
    }

    /**
     * Build nested group structure recursively
     * @param {Array} events - Events to group
     * @param {Array} groupLevels - Array of grouping keys
     * @returns {Map} Nested Map structure
     */
    buildNestedGroups(events, groupLevels) {
        if (groupLevels.length === 0) {
            return events;
        }

        const [currentLevel, ...remainingLevels] = groupLevels;
        const grouped = new Map();

        events.forEach(event => {
            const key = this.getGroupKey(event, currentLevel);
            
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(event);
        });

        // Recursively group remaining levels
        if (remainingLevels.length > 0) {
            for (const [key, groupEvents] of grouped) {
                grouped.set(key, this.buildNestedGroups(groupEvents, remainingLevels));
            }
        }

        return grouped;
    }

    /**
     * Get grouping key for an event based on group type
     * @param {Object} event - Event to get key for
     * @param {string} groupType - Type of grouping ('client', 'service', 'date', 'week', 'month')
     * @returns {string} Group key
     */
    getGroupKey(event, groupType) {
        const eventDate = new Date(event.start);
        
        switch (groupType) {
            case 'client':
                return this.extractClientName(event.title);
            case 'service':
                return this.formatServiceType(event);
            case 'date':
                return this.formatDate(eventDate);
            case 'week':
                return this.getWeekLabel(eventDate);
            case 'month':
                return this.getMonthLabel(eventDate);
            default:
                return 'Unknown';
        }
    }

    /**
     * Render nested groups recursively
     * @param {Map|Array} data - Nested Map or array of events
     * @param {Array} groupLevels - Array of grouping keys
     * @param {number} depth - Current depth in hierarchy
     * @param {boolean} includeTime - Include time in output
     * @param {boolean} includeLocation - Include location in output
     * @param {string} groupSortBy - Sort field for groups
     * @param {string} groupSortOrder - Sort order for groups
     * @param {Array} eventSortLevels - Array of sort configurations for events
     * @returns {string} Formatted output
     */
    renderNestedGroups(data, groupLevels, depth, includeTime, includeLocation, groupSortBy, groupSortOrder, eventSortLevels) {
        let output = '';
        const indent = '  '.repeat(depth);

        // Base case: we have an array of events
        if (Array.isArray(data)) {
            // Sort events using multi-level sorting
            const sortedEvents = this.sortEventsMultiLevel(data, eventSortLevels);
            sortedEvents.forEach(event => {
                const client = this.extractClientName(event.title);
                const serviceType = this.formatServiceType(event);
                const eventDate = new Date(event.start);
                const date = this.formatDate(eventDate);
                const time = includeTime ? ` @ ${this.formatTime(eventDate)}` : '';
                const location = includeLocation && event.location ? `\n${indent}    📍 ${event.location}` : '';

                // Include date in flat list or when date isn't a grouping level
                const showDate = !groupLevels.includes('date') && !groupLevels.includes('week') && !groupLevels.includes('month');
                const datePrefix = showDate ? `${date} | ` : '';

                output += `${indent}  • ${datePrefix}${client} | ${serviceType}${time}${location}\n`;
            });
            return output;
        }

        // Recursive case: we have a Map of groups
        const currentGroupType = groupLevels[depth];
        
        // Sort keys based on group type and the global group sort config
        const sortedKeys = this.sortGroupKeys(Array.from(data.keys()), currentGroupType, groupSortBy, groupSortOrder);
        
        for (const key of sortedKeys) {
            const value = data.get(key);
            const count = this.countEvents(value);
            const countLabel = count === 1 ? '1 event' : `${count} events`;
            
            output += `${indent}${key} (${countLabel})\n`;
            output += this.renderNestedGroups(value, groupLevels, depth + 1, includeTime, includeLocation, groupSortBy, groupSortOrder, eventSortLevels);
            output += '\n';
        }

        return output;
    }

    /**
     * Sort group keys based on group type and sort configuration
     * @param {Array} keys - Array of group keys to sort
     * @param {string} groupType - Type of grouping ('date', 'week', 'month', 'client', 'service')
     * @param {string} sortBy - Sort field ('date', 'alpha', 'count')
     * @param {string} sortOrder - Sort order ('asc' or 'desc')
     * @returns {Array} Sorted keys
     */
    sortGroupKeys(keys, groupType, sortBy = 'date', sortOrder = 'asc') {
        let sortedKeys = [...keys];
        
        // For date-based groups, always sort chronologically regardless of sortBy
        // unless explicitly set to alpha
        const isDateBasedGroup = groupType === 'date' || groupType === 'week' || groupType === 'month';
        
        if (isDateBasedGroup && sortBy !== 'alpha') {
            // Sort chronologically for date-based groups
            sortedKeys.sort((a, b) => {
                const dateA = this.parseGroupKeyToDate(a, groupType);
                const dateB = this.parseGroupKeyToDate(b, groupType);
                return dateA - dateB;
            });
        } else if (sortBy === 'date' && !isDateBasedGroup) {
            // For non-date groups with date sort, just use alpha
            sortedKeys.sort((a, b) => a.localeCompare(b));
        } else {
            // Default: alphabetical sort for client/service groups
            sortedKeys.sort((a, b) => a.localeCompare(b));
        }
        
        // Reverse if descending
        if (sortOrder === 'desc') {
            sortedKeys.reverse();
        }
        
        return sortedKeys;
    }

    /**
     * Parse a group key string back into a Date object for comparison
     * @param {string} key - Group key string (e.g., "11/07/2025", "Week of 11/04/2025", "11/2025")
     * @param {string} groupType - Type of grouping
     * @returns {Date} Parsed date
     */
    parseGroupKeyToDate(key, groupType) {
        if (groupType === 'date') {
            // Format: "11/07/2025" (MM/DD/YYYY)
            const [month, day, year] = key.split('/').map(Number);
            return new Date(year, month - 1, day);
        } else if (groupType === 'week') {
            // Format: "Week of 11/04/2025"
            const match = key.match(/Week of (.+)/);
            if (match) {
                const [month, day, year] = match[1].split('/').map(Number);
                return new Date(year, month - 1, day);
            }
        } else if (groupType === 'month') {
            // Format: "11/2025" (MM/YYYY)
            const [month, year] = key.split('/').map(Number);
            return new Date(year, month - 1, 1);
        }
        
        // Fallback: try to parse as-is
        return new Date(key);
    }

    /**
     * Count total events in nested structure
     * @param {Map|Array} data - Nested Map or array of events
     * @returns {number} Total event count
     */
    countEvents(data) {
        if (Array.isArray(data)) {
            return data.length;
        }

        let count = 0;
        for (const value of data.values()) {
            count += this.countEvents(value);
        }
        return count;
    }
}

// Make available globally
window.EventListExporter = EventListExporter;
