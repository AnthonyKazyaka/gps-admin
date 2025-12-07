/**
 * Export Templates Manager
 * Stores and retrieves export presets for reuse
 */
class ExportTemplatesManager {
    constructor() {
        this.STORAGE_KEY = 'gps-export-templates';
        this.META_KEY = 'gps-export-templates-meta';
        this.templates = [];
        this.loadTemplates();
    }

    loadTemplates() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            this.templates = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Failed to load export templates', error);
            this.templates = [];
        }
    }

    saveTemplates() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.templates));
    }

    getMetadata() {
        try {
            return JSON.parse(localStorage.getItem(this.META_KEY)) || {};
        } catch (error) {
            return {};
        }
    }

    setMetadata(meta) {
        localStorage.setItem(this.META_KEY, JSON.stringify(meta));
    }

    list() {
        const meta = this.getMetadata();
        return this.templates.map(tpl => this.decorateTemplate(tpl, meta));
    }

    getTemplateById(id) {
        const tpl = this.templates.find(t => t.id === id);
        if (!tpl) return null;
        return this.decorateTemplate(tpl, this.getMetadata());
    }

    getDefaultTemplateId() {
        const meta = this.getMetadata();
        return meta.defaultTemplateId || null;
    }

    getPreferred() {
        const templates = this.list();
        if (!templates.length) return null;
        const meta = this.getMetadata();

        const defaultTemplate = meta.defaultTemplateId
            ? templates.find(t => t.id === meta.defaultTemplateId)
            : null;
        if (defaultTemplate) return defaultTemplate;

        const lastUsed = meta.lastUsedTemplateId
            ? templates.find(t => t.id === meta.lastUsedTemplateId)
            : null;
        if (lastUsed) return lastUsed;

        return templates[0];
    }

    save(payload) {
        const now = new Date().toISOString();
        const meta = this.getMetadata();
        let saved;

        if (payload.id) {
            const index = this.templates.findIndex(t => t.id === payload.id);
            if (index !== -1) {
                this.templates[index] = {
                    ...this.templates[index],
                    name: payload.name,
                    includeDateRange: payload.includeDateRange,
                    options: { ...payload.options },
                    updatedAt: now,
                };
                saved = this.templates[index];
            } else {
                saved = this.buildTemplate(payload, now);
                this.templates.push(saved);
            }
        } else {
            saved = this.buildTemplate(payload, now);
            this.templates.push(saved);
        }

        this.saveTemplates();
        this.markLastUsed(saved.id);
        return this.decorateTemplate(saved, meta);
    }

    delete(id) {
        this.templates = this.templates.filter(t => t.id !== id);
        this.saveTemplates();

        const meta = this.getMetadata();
        if (meta.defaultTemplateId === id) {
            delete meta.defaultTemplateId;
        }
        if (meta.lastUsedTemplateId === id) {
            delete meta.lastUsedTemplateId;
        }
        this.setMetadata(meta);
    }

    setDefault(id) {
        const meta = this.getMetadata();
        meta.defaultTemplateId = id || null;
        this.setMetadata(meta);
    }

    markLastUsed(id) {
        const meta = this.getMetadata();
        meta.lastUsedTemplateId = id;
        this.setMetadata(meta);

        const index = this.templates.findIndex(t => t.id === id);
        if (index !== -1) {
            const now = new Date().toISOString();
            this.templates[index] = { ...this.templates[index], lastUsedAt: now, updatedAt: now };
            this.saveTemplates();
        }
    }

    buildTemplate(payload, timestamp) {
        return {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            name: payload.name,
            includeDateRange: payload.includeDateRange,
            options: { ...payload.options },
            createdAt: timestamp,
            updatedAt: timestamp,
            lastUsedAt: timestamp,
        };
    }

    decorateTemplate(template, meta) {
        return {
            ...template,
            isDefault: meta.defaultTemplateId === template.id,
        };
    }
}

window.ExportTemplatesManager = ExportTemplatesManager;
