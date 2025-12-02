/**
 * Appointment Templates Manager
 * Handles creation, storage, and application of appointment templates
 */

class TemplatesManager {
    constructor() {
        this.templates = [];
        this.TEMPLATES_VERSION = 4; // Increment this when defaults change
        this.loadTemplates();
    }

    /**
     * Load templates from localStorage
     */
    loadTemplates() {
        const saved = localStorage.getItem('gps-admin-templates');
        const savedVersion = parseInt(localStorage.getItem('gps-admin-templates-version') || '0');
        
        if (saved && savedVersion === this.TEMPLATES_VERSION) {
            try {
                this.templates = JSON.parse(saved);
            } catch (e) {
                console.error('Error loading templates:', e);
                this.templates = this.getDefaultTemplates();
                this.saveTemplates();
            }
        } else {
            // Version mismatch or no saved templates - reset to new defaults
            console.log('Templates version updated, resetting to new defaults');
            this.templates = this.getDefaultTemplates();
            this.saveTemplates();
        }
    }

    /**
     * Save templates to localStorage
     */
    saveTemplates() {
        localStorage.setItem('gps-admin-templates', JSON.stringify(this.templates));
        localStorage.setItem('gps-admin-templates-version', this.TEMPLATES_VERSION.toString());
    }

    /**
     * Get default templates
     */
    getDefaultTemplates() {
        return [
            {
                id: this.generateId(),
                name: 'Overnight Stay',
                icon: '🌙',
                type: 'overnight',
                duration: 720, // 12 hours (8pm to 8am)
                defaultStartTime: '20:00', // 8:00 PM
                defaultEndTime: '08:00', // 8:00 AM next day
                includeTravel: false,
                travelBuffer: 15, // minutes before and after
                defaultNotes: 'Overnight pet sitting - includes evening and morning care',
                color: '#8B5CF6',
                isDefault: true,
            },
            {
                id: this.generateId(),
                name: '30-Minute Drop-in',
                icon: '🏃',
                type: 'dropin',
                duration: 30,
                defaultStartTime: '12:00', // Noon
                defaultEndTime: '12:30',
                includeTravel: false,
                travelBuffer: 15,
                defaultNotes: 'Standard drop-in visit',
                color: '#06B6D4',
                isDefault: true,
            },
            {
                id: this.generateId(),
                name: '1-Hour Dog Walk',
                icon: '🦮',
                type: 'walk',
                duration: 60,
                defaultStartTime: '10:00', // 10:00 AM
                defaultEndTime: '11:00',
                includeTravel: false,
                travelBuffer: 15,
                defaultNotes: '1 hour walk in neighborhood or park',
                color: '#F59E0B',
                isDefault: true,
            },
            {
                id: this.generateId(),
                name: 'Meet & Greet',
                icon: '👋',
                type: 'meet-greet',
                duration: 60,
                defaultStartTime: '14:00', // 2:00 PM
                defaultEndTime: '15:00',
                includeTravel: false,
                travelBuffer: 0,
                defaultNotes: 'Initial consultation with new client',
                color: '#10B981',
                isDefault: true,
            },
        ];
    }

    /**
     * Get all templates
     */
    getAllTemplates() {
        return this.templates;
    }

    /**
     * Get template by ID
     */
    getTemplateById(id) {
        return this.templates.find(t => t.id === id);
    }

    /**
     * Get templates by type
     */
    getTemplatesByType(type) {
        return this.templates.filter(t => t.type === type);
    }

    /**
     * Create new template
     */
    createTemplate(templateData) {
        const template = {
            id: this.generateId(),
            name: templateData.name,
            icon: templateData.icon || '📅',
            type: templateData.type || 'other',
            duration: templateData.duration || 30,
            defaultStartTime: templateData.defaultStartTime || null,
            defaultEndTime: templateData.defaultEndTime || null,
            includeTravel: templateData.includeTravel !== false,
            travelBuffer: templateData.travelBuffer || 15,
            defaultNotes: templateData.defaultNotes || '',
            color: templateData.color || '#6366F1',
            isDefault: false,
            createdAt: new Date().toISOString(),
        };

        this.templates.push(template);
        this.saveTemplates();

        return template;
    }

    /**
     * Update template
     */
    updateTemplate(id, updates) {
        const index = this.templates.findIndex(t => t.id === id);

        if (index === -1) {
            throw new Error(`Template not found: ${id}`);
        }

        this.templates[index] = {
            ...this.templates[index],
            ...updates,
            id: id, // Preserve ID
            updatedAt: new Date().toISOString(),
        };

        this.saveTemplates();

        return this.templates[index];
    }

    /**
     * Delete template
     */
    deleteTemplate(id) {
        const template = this.getTemplateById(id);

        if (!template) {
            throw new Error(`Template not found: ${id}`);
        }

        // Don't allow deleting default templates
        if (template.isDefault) {
            throw new Error('Cannot delete default template');
        }

        this.templates = this.templates.filter(t => t.id !== id);
        this.saveTemplates();
    }

    /**
     * Duplicate template
     */
    duplicateTemplate(id) {
        const original = this.getTemplateById(id);

        if (!original) {
            throw new Error(`Template not found: ${id}`);
        }

        const duplicate = {
            ...original,
            id: this.generateId(),
            name: `${original.name} (Copy)`,
            isDefault: false,
            createdAt: new Date().toISOString(),
        };

        this.templates.push(duplicate);
        this.saveTemplates();

        return duplicate;
    }

    /**
     * Apply template to create appointment
     * @param {string} templateId - Template ID
     * @param {Object} appointmentData - Additional appointment data
     * @param {Object} mapsAPI - MapsAPI instance (optional, for travel time)
     * @returns {Object} Appointment object
     */
    async applyTemplate(templateId, appointmentData, mapsAPI = null) {
        const template = this.getTemplateById(templateId);

        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const start = new Date(appointmentData.date);
        const [hours, minutes] = appointmentData.time.split(':');
        start.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Calculate end time based on template duration
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + template.duration);

        let travelTimeBefore = 0;
        let travelTimeAfter = 0;

        // Calculate travel time if enabled and location provided
        if (template.includeTravel && appointmentData.location && mapsAPI && appointmentData.homeBase) {
            try {
                const travelInfo = await mapsAPI.calculateDriveTime(
                    appointmentData.homeBase,
                    appointmentData.location,
                    start
                );

                travelTimeBefore = travelInfo.duration.minutes + template.travelBuffer;
                travelTimeAfter = travelInfo.duration.minutes + template.travelBuffer;

                // Adjust start and end times to include travel
                start.setMinutes(start.getMinutes() - travelTimeBefore);
                end.setMinutes(end.getMinutes() + travelTimeAfter);
            } catch (error) {
                console.warn('Could not calculate travel time, using buffer only:', error);
                travelTimeBefore = template.travelBuffer;
                travelTimeAfter = template.travelBuffer;
                start.setMinutes(start.getMinutes() - travelTimeBefore);
                end.setMinutes(end.getMinutes() + travelTimeAfter);
            }
        }

        return {
            id: this.generateId(),
            title: appointmentData.title || template.name,
            type: template.type,
            start: start,
            end: end,
            location: appointmentData.location || '',
            client: appointmentData.client || '',
            notes: appointmentData.notes || template.defaultNotes,
            templateId: templateId,
            templateName: template.name,
            duration: template.duration,
            travelTimeBefore,
            travelTimeAfter,
            color: template.color,
        };
    }

    /**
     * Get template statistics
     */
    getTemplateStats(events) {
        const stats = {};

        this.templates.forEach(template => {
            const usageCount = events.filter(e => e.templateId === template.id).length;
            stats[template.id] = {
                template: template,
                usageCount: usageCount,
                totalHours: (usageCount * template.duration) / 60,
            };
        });

        return stats;
    }

    /**
     * Export templates to JSON
     */
    exportTemplates() {
        return JSON.stringify(this.templates, null, 2);
    }

    /**
     * Import templates from JSON
     */
    importTemplates(jsonString, replace = false) {
        try {
            const imported = JSON.parse(jsonString);

            if (!Array.isArray(imported)) {
                throw new Error('Invalid templates format');
            }

            if (replace) {
                // Keep default templates
                const defaultTemplates = this.templates.filter(t => t.isDefault);
                this.templates = [
                    ...defaultTemplates,
                    ...imported.filter(t => !t.isDefault),
                ];
            } else {
                // Merge with existing
                imported.forEach(template => {
                    // Regenerate IDs to avoid conflicts
                    const newTemplate = {
                        ...template,
                        id: this.generateId(),
                        isDefault: false,
                    };
                    this.templates.push(newTemplate);
                });
            }

            this.saveTemplates();
            return true;
        } catch (error) {
            console.error('Error importing templates:', error);
            throw error;
        }
    }

    /**
     * Reset to default templates
     */
    resetToDefaults() {
        if (confirm('Are you sure you want to reset all templates to defaults? This will delete any custom templates.')) {
            this.templates = this.getDefaultTemplates();
            this.saveTemplates();
            return true;
        }
        return false;
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate template data
     */
    validateTemplate(templateData) {
        const errors = [];

        if (!templateData.name || templateData.name.trim() === '') {
            errors.push('Template name is required');
        }

        if (!templateData.duration || templateData.duration <= 0) {
            errors.push('Duration must be greater than 0');
        }

        if (templateData.travelBuffer && templateData.travelBuffer < 0) {
            errors.push('Travel buffer cannot be negative');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
        };
    }

    /**
     * Generate multiple events for a multi-day booking
     * @param {Object} config - Configuration for the multi-event booking
     * @returns {Array} Array of event objects to be created
     */
    generateMultiDayEvents(config) {
        const {
            clientName,
            location,
            startDate,
            endDate,
            bookingType, // 'daily-visits' or 'overnight-stay'
            visits, // Array of { templateId, time, duration } for daily visits
            weekendVisits, // Array of { templateId, time, duration } for weekend visits (optional)
            overnightConfig, // { templateId, arrivalTime, departureTime }
            dropinConfig, // { enabled, visits: [...], skipFirstDay, skipLastDay }
        } = config;

        const events = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Calculate number of days
        const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        if (bookingType === 'daily-visits') {
            // Generate daily visits for each day
            for (let dayOffset = 0; dayOffset < dayCount; dayOffset++) {
                const currentDate = new Date(start);
                currentDate.setDate(start.getDate() + dayOffset);
                
                const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6; // 0 is Sunday, 6 is Saturday
                const currentVisits = (isWeekend && weekendVisits && weekendVisits.length > 0) ? weekendVisits : visits;

                currentVisits.forEach((visit, visitIndex) => {
                    const template = visit.templateId ? this.getTemplateById(visit.templateId) : null;
                    const duration = visit.duration || (template ? template.duration : 30);
                    const [hours, minutes] = visit.time.split(':').map(Number);

                    const eventStart = new Date(currentDate);
                    eventStart.setHours(hours, minutes, 0, 0);

                    const eventEnd = new Date(eventStart);
                    eventEnd.setMinutes(eventEnd.getMinutes() + duration);

                    const suffix = duration;
                    const title = `${clientName} ${suffix}`;

                    events.push({
                        id: this.generateId(),
                        title: title,
                        start: eventStart,
                        end: eventEnd,
                        location: location,
                        type: template?.type || 'dropin',
                        templateId: visit.templateId || null,
                        isLocal: true,
                        ignored: false,
                        isWorkEvent: true,
                    });
                });
            }
        } else if (bookingType === 'overnight-stay') {
            // Generate overnight events - 12-hour blocks for each night
            if (overnightConfig) {
                const template = overnightConfig.templateId ? this.getTemplateById(overnightConfig.templateId) : null;
                const [arrHours, arrMinutes] = overnightConfig.arrivalTime.split(':').map(Number);
                const [depHours, depMinutes] = overnightConfig.departureTime.split(':').map(Number);
                const overnightDuration = 12 * 60; // 12 hours in minutes

                // Create an overnight segment for each day of the stay
                for (let dayOffset = 0; dayOffset < dayCount; dayOffset++) {
                    const currentDate = new Date(start);
                    currentDate.setDate(start.getDate() + dayOffset);

                    let segmentStart, segmentEnd, segmentLabel;

                    if (dayOffset === 0) {
                        // First day: arrival time + 12 hours (or until departure if same-day)
                        segmentStart = new Date(currentDate);
                        segmentStart.setHours(arrHours, arrMinutes, 0, 0);
                        
                        if (dayCount === 1) {
                            // Same-day checkout
                            segmentEnd = new Date(currentDate);
                            segmentEnd.setHours(depHours, depMinutes, 0, 0);
                            segmentLabel = 'Start';
                        } else {
                            // Multi-day stay - 12 hour block
                            segmentEnd = new Date(segmentStart);
                            segmentEnd.setMinutes(segmentEnd.getMinutes() + overnightDuration);
                            segmentLabel = 'Start';
                        }
                    } else if (dayOffset === dayCount - 1) {
                        // Last day: 12 hours before departure (or from midnight if departure is early)
                        segmentEnd = new Date(currentDate);
                        segmentEnd.setHours(depHours, depMinutes, 0, 0);
                        segmentStart = new Date(segmentEnd);
                        segmentStart.setMinutes(segmentStart.getMinutes() - overnightDuration);
                        
                        // If calculated start is before midnight, start at midnight
                        const midnight = new Date(currentDate);
                        midnight.setHours(0, 0, 0, 0);
                        if (segmentStart < midnight) {
                            segmentStart = midnight;
                        }
                        segmentLabel = 'Last';
                    } else {
                        // Middle days: 12-hour block starting at midnight
                        segmentStart = new Date(currentDate);
                        segmentStart.setHours(0, 0, 0, 0);
                        segmentEnd = new Date(segmentStart);
                        segmentEnd.setMinutes(segmentEnd.getMinutes() + overnightDuration);
                        segmentLabel = `${dayOffset + 1}${this.getOrdinalSuffix(dayOffset + 1)}`;
                    }

                    events.push({
                        id: this.generateId(),
                        title: `${clientName} HS${segmentLabel ? ' - ' + segmentLabel : ''}`,
                        start: segmentStart,
                        end: segmentEnd,
                        location: location,
                        type: 'overnight',
                        templateId: overnightConfig.templateId || null,
                        isLocal: true,
                        ignored: false,
                        isWorkEvent: true,
                        overnightSegment: segmentLabel, // Track which segment this is
                    });
                }
            }

            // Generate drop-in visits if enabled
            if (dropinConfig && dropinConfig.enabled && dropinConfig.visits && dropinConfig.visits.length > 0) {
                for (let dayOffset = 0; dayOffset < dayCount; dayOffset++) {
                    // Skip first day if configured
                    if (dayOffset === 0 && dropinConfig.skipFirstDay) continue;
                    // Skip last day if configured
                    if (dayOffset === dayCount - 1 && dropinConfig.skipLastDay) continue;

                    const currentDate = new Date(start);
                    currentDate.setDate(start.getDate() + dayOffset);

                    dropinConfig.visits.forEach((visit, visitIndex) => {
                        const template = visit.templateId ? this.getTemplateById(visit.templateId) : null;
                        const duration = visit.duration || (template ? template.duration : 30);
                        const [hours, minutes] = visit.time.split(':').map(Number);

                        const eventStart = new Date(currentDate);
                        eventStart.setHours(hours, minutes, 0, 0);

                        const eventEnd = new Date(eventStart);
                        eventEnd.setMinutes(eventEnd.getMinutes() + duration);

                        const suffix = duration;
                        const title = `${clientName} ${suffix}`;

                        events.push({
                            id: this.generateId(),
                            title: title,
                            start: eventStart,
                            end: eventEnd,
                            location: location,
                            type: template?.type || 'dropin',
                            templateId: visit.templateId || null,
                            isLocal: true,
                            ignored: false,
                            isWorkEvent: true,
                        });
                    });
                }
            }
        }

        // Sort events by start time
        events.sort((a, b) => a.start - b.start);

        return events;
    }

    /**
     * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
     */
    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    }

    /**
     * Get template types
     */
    getTemplateTypes() {
        return [
            { value: 'dropin', label: 'Drop-in', icon: '🏃' },
            { value: 'walk', label: 'Dog Walk', icon: '🦮' },
            { value: 'overnight', label: 'Overnight', icon: '🌙' },
            { value: 'meet-greet', label: 'Meet & Greet', icon: '👋' },
            { value: 'other', label: 'Other', icon: '📅' },
        ];
    }
}

// Make available globally
window.TemplatesManager = TemplatesManager;
