/**
 * Appointment Templates Manager
 * Handles creation, storage, and application of appointment templates
 */

class TemplatesManager {
    constructor() {
        this.templates = [];
        this.TEMPLATES_VERSION = 2; // Increment this when defaults change
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
                duration: 960, // 16 hours (6pm to 10am)
                includeTravel: true,
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
                includeTravel: true,
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
                includeTravel: true,
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
