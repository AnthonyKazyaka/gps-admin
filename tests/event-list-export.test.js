const { JSDOM } = require('jsdom');

// Ensure window is available for the exporter to attach itself
global.window = new JSDOM().window;
global.document = global.window.document;

require('../js/event-list-export');

describe('EventListExporter preview flow', () => {
    let exporter;
    let processor;
    let events;

    beforeEach(() => {
        processor = {
            isWorkEvent: jest.fn(() => true),
            isOvernightEvent: jest.fn(() => false),
            workEventPatterns: { meetAndGreet: /meet/i }
        };

        exporter = new window.EventListExporter(processor);

        events = [
            {
                id: '1',
                title: 'Milo - 30',
                start: '2024-01-01T10:00:00Z',
                end: '2024-01-01T10:30:00Z',
                location: 'Home'
            },
            {
                id: '2',
                title: 'Luna Walk',
                start: '2024-01-02T12:00:00Z',
                end: '2024-01-02T12:30:00Z',
                location: 'Park'
            }
        ];
    });

    test('filters events by search term and work flag', () => {
        processor.isWorkEvent.mockImplementation(event => event.title !== 'Personal');

        const preview = exporter.buildPreview(
            [...events, { ...events[0], id: '3', title: 'Personal' }],
            {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-03'),
                searchTerm: 'Milo',
                workEventsOnly: true
            }
        );

        expect(preview.count).toBe(1);
        expect(preview.text).toContain('Milo');
        expect(preview.text).not.toContain('Personal');
    });

    test('builds group summaries for grouped exports', () => {
        const preview = exporter.buildPreview(events, {
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-03'),
            groupBy: 'client',
            workEventsOnly: true
        });

        expect(preview.groups[0].label).toContain('Milo');
        expect(preview.groups[0].count).toBeGreaterThan(0);
        expect(preview.rows[0].groupPath.length).toBeGreaterThan(0);
    });
});
