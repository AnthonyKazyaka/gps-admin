/**
 * Unit Tests for TemplatesManager
 */

// Load the TemplatesManager class
const fs = require('fs');
const path = require('path');
const templatesCode = fs.readFileSync(
  path.join(__dirname, '../js/templates.js'),
  'utf8'
);
eval(templatesCode);

describe('TemplatesManager', () => {
  let manager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    manager = new TemplatesManager();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default templates', () => {
      expect(manager.templates).toBeDefined();
      expect(manager.templates.length).toBeGreaterThan(0);
    });

    test('should have 4 default templates', () => {
      const defaults = manager.getDefaultTemplates();
      expect(defaults.length).toBe(4);
    });

    test('should mark default templates correctly', () => {
      const defaults = manager.getDefaultTemplates();
      defaults.forEach(template => {
        expect(template.isDefault).toBe(true);
      });
    });
  });

  describe('Template CRUD Operations', () => {
    describe('createTemplate', () => {
      test('should create a new template with required fields', () => {
        const templateData = {
          name: 'Custom Visit',
          type: 'dropin',
          duration: 45,
        };

        const template = manager.createTemplate(templateData);

        expect(template).toBeDefined();
        expect(template.id).toBeDefined();
        expect(template.name).toBe('Custom Visit');
        expect(template.type).toBe('dropin');
        expect(template.duration).toBe(45);
        expect(template.isDefault).toBe(false);
      });

      test('should apply default values for optional fields', () => {
        const templateData = {
          name: 'Minimal Template',
        };

        const template = manager.createTemplate(templateData);

        expect(template.icon).toBe('📅');
        expect(template.type).toBe('other');
        expect(template.duration).toBe(30);
        expect(template.color).toBe('#6366F1');
        expect(template.includeTravel).toBe(true);
      });

      test('should save template to localStorage', () => {
        const templateData = {
          name: 'Test Template',
          duration: 60,
        };

        manager.createTemplate(templateData);

        const saved = localStorage.getItem('gps-admin-templates');
        expect(saved).toBeDefined();

        const parsed = JSON.parse(saved);
        const customTemplate = parsed.find(t => t.name === 'Test Template');
        expect(customTemplate).toBeDefined();
      });

      test('should generate unique IDs for templates', () => {
        const template1 = manager.createTemplate({ name: 'Template 1' });
        const template2 = manager.createTemplate({ name: 'Template 2' });

        expect(template1.id).not.toBe(template2.id);
        expect(template1.id).toMatch(/^tpl_/);
        expect(template2.id).toMatch(/^tpl_/);
      });
    });

    describe('getTemplateById', () => {
      test('should retrieve template by ID', () => {
        const created = manager.createTemplate({ name: 'Find Me' });
        const found = manager.getTemplateById(created.id);

        expect(found).toBeDefined();
        expect(found.id).toBe(created.id);
        expect(found.name).toBe('Find Me');
      });

      test('should return undefined for non-existent ID', () => {
        const found = manager.getTemplateById('non-existent-id');
        expect(found).toBeUndefined();
      });
    });

    describe('getAllTemplates', () => {
      test('should return all templates including defaults', () => {
        const all = manager.getAllTemplates();
        expect(all.length).toBe(4); // Default templates
      });

      test('should include custom templates', () => {
        manager.createTemplate({ name: 'Custom 1' });
        manager.createTemplate({ name: 'Custom 2' });

        const all = manager.getAllTemplates();
        expect(all.length).toBe(6); // 4 defaults + 2 custom
      });
    });

    describe('getTemplatesByType', () => {
      test('should filter templates by type', () => {
        const dropins = manager.getTemplatesByType('dropin');
        expect(dropins.length).toBeGreaterThan(0);
        dropins.forEach(template => {
          expect(template.type).toBe('dropin');
        });
      });

      test('should return empty array for non-existent type', () => {
        const result = manager.getTemplatesByType('non-existent-type');
        expect(result).toEqual([]);
      });

      test('should include custom templates of specified type', () => {
        manager.createTemplate({ name: 'Custom Walk', type: 'walk' });

        const walks = manager.getTemplatesByType('walk');
        const customWalk = walks.find(t => t.name === 'Custom Walk');
        expect(customWalk).toBeDefined();
      });
    });

    describe('updateTemplate', () => {
      test('should update template properties', () => {
        const template = manager.createTemplate({ name: 'Original Name', duration: 30 });

        const updated = manager.updateTemplate(template.id, {
          name: 'Updated Name',
          duration: 60,
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.duration).toBe(60);
        expect(updated.updatedAt).toBeDefined();
      });

      test('should preserve template ID', () => {
        const template = manager.createTemplate({ name: 'Test' });
        const originalId = template.id;

        const updated = manager.updateTemplate(originalId, { name: 'Changed' });

        expect(updated.id).toBe(originalId);
      });

      test('should throw error for non-existent template', () => {
        expect(() => {
          manager.updateTemplate('non-existent-id', { name: 'Fail' });
        }).toThrow('Template not found');
      });

      test('should persist updates to localStorage', () => {
        const template = manager.createTemplate({ name: 'Test' });
        manager.updateTemplate(template.id, { name: 'Updated' });

        const saved = JSON.parse(localStorage.getItem('gps-admin-templates'));
        const found = saved.find(t => t.id === template.id);
        expect(found.name).toBe('Updated');
      });
    });

    describe('deleteTemplate', () => {
      test('should delete custom template', () => {
        const template = manager.createTemplate({ name: 'Delete Me' });
        const initialCount = manager.getAllTemplates().length;

        manager.deleteTemplate(template.id);

        const afterCount = manager.getAllTemplates().length;
        expect(afterCount).toBe(initialCount - 1);
        expect(manager.getTemplateById(template.id)).toBeUndefined();
      });

      test('should not allow deleting default templates', () => {
        const defaultTemplate = manager.templates.find(t => t.isDefault);

        expect(() => {
          manager.deleteTemplate(defaultTemplate.id);
        }).toThrow('Cannot delete default template');
      });

      test('should throw error for non-existent template', () => {
        expect(() => {
          manager.deleteTemplate('non-existent-id');
        }).toThrow('Template not found');
      });

      test('should persist deletion to localStorage', () => {
        const template = manager.createTemplate({ name: 'Delete Me' });
        manager.deleteTemplate(template.id);

        const saved = JSON.parse(localStorage.getItem('gps-admin-templates'));
        const found = saved.find(t => t.id === template.id);
        expect(found).toBeUndefined();
      });
    });

    describe('duplicateTemplate', () => {
      test('should create copy of template', () => {
        const original = manager.createTemplate({
          name: 'Original',
          duration: 45,
          color: '#FF0000',
        });

        const duplicate = manager.duplicateTemplate(original.id);

        expect(duplicate.id).not.toBe(original.id);
        expect(duplicate.name).toBe('Original (Copy)');
        expect(duplicate.duration).toBe(45);
        expect(duplicate.color).toBe('#FF0000');
        expect(duplicate.isDefault).toBe(false);
      });

      test('should throw error for non-existent template', () => {
        expect(() => {
          manager.duplicateTemplate('non-existent-id');
        }).toThrow('Template not found');
      });

      test('should create non-default template even when duplicating default', () => {
        const defaultTemplate = manager.templates.find(t => t.isDefault);
        const duplicate = manager.duplicateTemplate(defaultTemplate.id);

        expect(duplicate.isDefault).toBe(false);
      });
    });
  });

  describe('Template Validation', () => {
    test('should validate template with all required fields', () => {
      const validation = manager.validateTemplate({
        name: 'Valid Template',
        duration: 30,
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('should reject template without name', () => {
      const validation = manager.validateTemplate({
        duration: 30,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Template name is required');
    });

    test('should reject template with empty name', () => {
      const validation = manager.validateTemplate({
        name: '   ',
        duration: 30,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Template name is required');
    });

    test('should reject template without duration', () => {
      const validation = manager.validateTemplate({
        name: 'Test',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duration must be greater than 0');
    });

    test('should reject template with zero duration', () => {
      const validation = manager.validateTemplate({
        name: 'Test',
        duration: 0,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duration must be greater than 0');
    });

    test('should reject negative travel buffer', () => {
      const validation = manager.validateTemplate({
        name: 'Test',
        duration: 30,
        travelBuffer: -5,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Travel buffer cannot be negative');
    });

    test('should return multiple errors for invalid template', () => {
      const validation = manager.validateTemplate({
        duration: -10,
        travelBuffer: -5,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Template Statistics', () => {
    test('should calculate usage statistics for templates', () => {
      const template = manager.createTemplate({ name: 'Test', duration: 30 });

      const events = [
        { templateId: template.id, duration: 30 },
        { templateId: template.id, duration: 30 },
        { templateId: 'other-id', duration: 60 },
      ];

      const stats = manager.getTemplateStats(events);

      expect(stats[template.id]).toBeDefined();
      expect(stats[template.id].usageCount).toBe(2);
      expect(stats[template.id].totalHours).toBe(1); // 2 * 30min = 1 hour
    });

    test('should return zero usage for unused templates', () => {
      const template = manager.createTemplate({ name: 'Unused', duration: 30 });
      const stats = manager.getTemplateStats([]);

      expect(stats[template.id]).toBeDefined();
      expect(stats[template.id].usageCount).toBe(0);
      expect(stats[template.id].totalHours).toBe(0);
    });
  });

  describe('Import/Export Functionality', () => {
    test('should export templates as JSON', () => {
      manager.createTemplate({ name: 'Export Test', duration: 45 });

      const exported = manager.exportTemplates();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);

      const customTemplate = parsed.find(t => t.name === 'Export Test');
      expect(customTemplate).toBeDefined();
    });

    test('should import templates (merge mode)', () => {
      const importData = JSON.stringify([
        {
          id: 'import_1',
          name: 'Imported Template',
          duration: 90,
          type: 'other',
          isDefault: false,
        },
      ]);

      const initialCount = manager.getAllTemplates().length;
      manager.importTemplates(importData, false);

      const afterCount = manager.getAllTemplates().length;
      expect(afterCount).toBeGreaterThan(initialCount);

      const imported = manager.getAllTemplates().find(t => t.name === 'Imported Template');
      expect(imported).toBeDefined();
      expect(imported.id).not.toBe('import_1'); // ID should be regenerated
    });

    test('should import templates (replace mode)', () => {
      manager.createTemplate({ name: 'Custom 1' });
      manager.createTemplate({ name: 'Custom 2' });

      const importData = JSON.stringify([
        {
          name: 'Replacement Template',
          duration: 60,
          type: 'other',
        },
      ]);

      manager.importTemplates(importData, true);

      const templates = manager.getAllTemplates();
      const defaultCount = templates.filter(t => t.isDefault).length;
      const customCount = templates.filter(t => !t.isDefault).length;

      expect(defaultCount).toBe(4); // Defaults should remain
      expect(customCount).toBe(1); // Only the imported template
    });

    test('should throw error for invalid import data', () => {
      expect(() => {
        manager.importTemplates('invalid json');
      }).toThrow();
    });

    test('should throw error for non-array import', () => {
      expect(() => {
        manager.importTemplates('{"not": "array"}');
      }).toThrow('Invalid templates format');
    });
  });

  describe('LocalStorage Persistence', () => {
    test('should load templates from localStorage on initialization', () => {
      // Create templates with first manager
      const manager1 = new TemplatesManager();
      manager1.createTemplate({ name: 'Persistent Template' });

      // Create new manager - should load from localStorage
      const manager2 = new TemplatesManager();

      const found = manager2.getAllTemplates().find(t => t.name === 'Persistent Template');
      expect(found).toBeDefined();
    });

    test('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('gps-admin-templates', 'corrupted data');

      const manager = new TemplatesManager();

      // Should fall back to defaults
      expect(manager.templates.length).toBe(4);
    });

    test('should initialize with defaults when localStorage is empty', () => {
      localStorage.clear();

      const manager = new TemplatesManager();

      expect(manager.templates.length).toBe(4);
      expect(manager.templates.every(t => t.isDefault)).toBe(true);
    });
  });

  describe('Template Types', () => {
    test('should return available template types', () => {
      const types = manager.getTemplateTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);

      types.forEach(type => {
        expect(type.value).toBeDefined();
        expect(type.label).toBeDefined();
        expect(type.icon).toBeDefined();
      });
    });

    test('should include all standard types', () => {
      const types = manager.getTemplateTypes();
      const typeValues = types.map(t => t.value);

      expect(typeValues).toContain('dropin');
      expect(typeValues).toContain('walk');
      expect(typeValues).toContain('overnight');
      expect(typeValues).toContain('meet-greet');
      expect(typeValues).toContain('other');
    });
  });

  describe('ID Generation', () => {
    test('should generate unique IDs', () => {
      const ids = new Set();

      for (let i = 0; i < 100; i++) {
        ids.add(manager.generateId());
      }

      expect(ids.size).toBe(100);
    });

    test('should generate IDs with correct format', () => {
      const id = manager.generateId();
      expect(id).toMatch(/^tpl_\d+_[a-z0-9]+$/);
    });
  });
});
