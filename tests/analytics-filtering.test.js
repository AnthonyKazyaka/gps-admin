/**
 * Analytics Filtering Tests
 * Tests for the analytics page event filtering logic
 */

// Mock EventProcessor class for testing
class EventProcessor {
    constructor() {
        this.workEventPatterns = {
            meetAndGreet: /\b(MG|M&G|Meet\s*&\s*Greet)\b/i,
            minutesSuffix: /\b(15|20|30|45|60)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i,
            houseSitSuffix: /\b(HS|Housesit)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i,
            nailTrim: /\b(nail\s*trim)\b/i
        };

        this.personalEventPatterns = {
            offDay: /^\s*✨\s*off\s*✨|^\s*off\s*[-–]/i,
            personalKeywords: /\b(lunch|appointment with|therapy|birthday|anniversary|shower)\b/i,
            medicalPersonal: /\b(doctor|dentist|massage|nails|haircut|tattoo|yoga|acupuncture)\b/i,
            household: /\b(house clean|kroger|grocery)\b/i,
            socialBusiness: /\b(momentum|meeting with|webinar)\b/i
        };
    }

    cleanTitle(title) {
        if (!title || typeof title !== 'string') return '';
        return title.replace(/\([^)]*\)/g, '').trim();
    }

    isDefinitelyPersonal(title) {
        if (!title || typeof title !== 'string') return false;
        const trimmedTitle = title.trim();
        return Object.values(this.personalEventPatterns).some(pattern => 
            pattern.test(trimmedTitle)
        );
    }

    isWorkEvent(titleOrEvent) {
        const title = typeof titleOrEvent === 'string' ? titleOrEvent : titleOrEvent?.title;
        
        if (!title || typeof title !== 'string') return false;

        const trimmedTitle = title.trim();

        if (this.isDefinitelyPersonal(trimmedTitle)) {
            return false;
        }

        const cleanedTitle = this.cleanTitle(trimmedTitle);

        if (this.workEventPatterns.meetAndGreet.test(cleanedTitle)) {
            return true;
        }

        if (this.workEventPatterns.minutesSuffix.test(cleanedTitle)) {
            return true;
        }

        if (this.workEventPatterns.houseSitSuffix.test(cleanedTitle)) {
            return true;
        }

        if (this.workEventPatterns.nailTrim.test(cleanedTitle)) {
            return true;
        }

        return false;
    }
}

describe('Analytics Event Filtering', () => {
    let eventProcessor;

    beforeEach(() => {
        eventProcessor = new EventProcessor();
    });

    describe('Work Event Detection', () => {
        test('should detect work events with minute suffix', () => {
            expect(eventProcessor.isWorkEvent('Bella 30')).toBe(true);
            expect(eventProcessor.isWorkEvent('Max & Cooper 60')).toBe(true);
            expect(eventProcessor.isWorkEvent('Luna 45')).toBe(true);
            expect(eventProcessor.isWorkEvent('Archie 30')).toBe(true);
            expect(eventProcessor.isWorkEvent('Kona Chai Zero 45')).toBe(true);
        });

        test('should detect work events with house sit suffix', () => {
            expect(eventProcessor.isWorkEvent('Buddy HS')).toBe(true);
            expect(eventProcessor.isWorkEvent('Charlie Housesit')).toBe(true);
        });

        test('should detect meet & greet events', () => {
            expect(eventProcessor.isWorkEvent('Daisy MG')).toBe(true);
            expect(eventProcessor.isWorkEvent('Rocky M&G')).toBe(true);
            expect(eventProcessor.isWorkEvent('Spot Meet & Greet')).toBe(true);
        });

        test('should detect nail trim events', () => {
            expect(eventProcessor.isWorkEvent('Bella nail trim')).toBe(true);
        });

        test('should exclude personal events', () => {
            expect(eventProcessor.isWorkEvent('Lunch')).toBe(false);
            expect(eventProcessor.isWorkEvent('Doctor appointment')).toBe(false);
            expect(eventProcessor.isWorkEvent('Grocery shopping')).toBe(false);
            expect(eventProcessor.isWorkEvent('✨ off ✨')).toBe(false);
        });

        test('should handle no title', () => {
            expect(eventProcessor.isWorkEvent('(No title)')).toBe(false);
            expect(eventProcessor.isWorkEvent('')).toBe(false);
            expect(eventProcessor.isWorkEvent(null)).toBe(false);
            expect(eventProcessor.isWorkEvent(undefined)).toBe(false);
        });

        test('should work with event objects', () => {
            const workEvent = { title: 'Bella 30' };
            const personalEvent = { title: 'Lunch' };
            
            expect(eventProcessor.isWorkEvent(workEvent)).toBe(true);
            expect(eventProcessor.isWorkEvent(personalEvent)).toBe(false);
        });
    });

    describe('Analytics Filtering Logic', () => {
        test('should use pre-computed isWorkEvent property when available', () => {
            const events = [
                { 
                    title: 'Bella 30', 
                    isWorkEvent: true,
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-11-15T10:00:00Z')
                },
                { 
                    title: 'Lunch', 
                    isWorkEvent: false,
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-11-15T12:00:00Z')
                }
            ];

            // Simulate analytics filtering with work-only mode
            const workOnlyMode = true;
            const filtered = events.filter(event => 
                event.isWorkEvent || eventProcessor.isWorkEvent(event.title)
            );

            expect(filtered.length).toBe(1);
            expect(filtered[0].title).toBe('Bella 30');
        });

        test('should fall back to pattern matching when isWorkEvent is missing', () => {
            const events = [
                { 
                    title: 'Bella 30',
                    // isWorkEvent property missing
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-11-15T10:00:00Z')
                },
                { 
                    title: 'Lunch',
                    // isWorkEvent property missing
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-11-15T12:00:00Z')
                }
            ];

            // Simulate analytics filtering with work-only mode
            const workOnlyMode = true;
            const filtered = events.filter(event => 
                event.isWorkEvent || eventProcessor.isWorkEvent(event.title)
            );

            expect(filtered.length).toBe(1);
            expect(filtered[0].title).toBe('Bella 30');
        });

        test('should filter out ignored events', () => {
            const events = [
                { 
                    title: 'Bella 30', 
                    isWorkEvent: true,
                    isAllDay: false,
                    ignored: true,
                    start: new Date('2025-11-15T10:00:00Z')
                }
            ];

            // Simulate analytics date range filtering
            const filtered = events.filter(event => {
                if (event.ignored || event.isAllDay) return false;
                return true;
            });

            expect(filtered.length).toBe(0);
        });

        test('should filter out all-day events', () => {
            const events = [
                { 
                    title: 'Bella 30', 
                    isWorkEvent: true,
                    isAllDay: true,
                    ignored: false,
                    start: new Date('2025-11-15T10:00:00Z')
                }
            ];

            // Simulate analytics date range filtering
            const filtered = events.filter(event => {
                if (event.ignored || event.isAllDay) return false;
                return true;
            });

            expect(filtered.length).toBe(0);
        });

        test('should filter events by date range', () => {
            const startDate = new Date('2025-11-01T00:00:00Z');
            const endDate = new Date('2025-11-30T23:59:59Z');

            const events = [
                { 
                    title: 'Bella 30',
                    isWorkEvent: true,
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-11-15T10:00:00Z')
                },
                { 
                    title: 'Max 45',
                    isWorkEvent: true,
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-10-15T10:00:00Z') // October - outside range
                },
                { 
                    title: 'Luna 30',
                    isWorkEvent: true,
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-12-15T10:00:00Z') // December - outside range
                }
            ];

            // Simulate analytics date range filtering
            const filtered = events.filter(event => {
                if (event.ignored || event.isAllDay) return false;
                const eventDate = new Date(event.start);
                return eventDate >= startDate && eventDate <= endDate;
            });

            expect(filtered.length).toBe(1);
            expect(filtered[0].title).toBe('Bella 30');
        });

        test('should combine all filters correctly', () => {
            const startDate = new Date('2025-11-01T00:00:00Z');
            const endDate = new Date('2025-11-30T23:59:59Z');
            const workOnlyMode = true;

            const events = [
                { 
                    title: 'Bella 30',
                    isWorkEvent: true,
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-11-15T10:00:00Z')
                },
                { 
                    title: 'Lunch',
                    isWorkEvent: false,
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-11-15T12:00:00Z')
                },
                { 
                    title: 'Max 45',
                    isWorkEvent: true,
                    isAllDay: true, // All-day - should be filtered
                    ignored: false,
                    start: new Date('2025-11-16T10:00:00Z')
                },
                { 
                    title: 'Luna 30',
                    isWorkEvent: true,
                    isAllDay: false,
                    ignored: true, // Ignored - should be filtered
                    start: new Date('2025-11-17T10:00:00Z')
                },
                { 
                    title: 'Cooper 60',
                    isWorkEvent: true,
                    isAllDay: false,
                    ignored: false,
                    start: new Date('2025-10-15T10:00:00Z') // Outside date range
                }
            ];

            // Simulate full analytics filtering pipeline
            let filtered = events.filter(event => {
                if (event.ignored || event.isAllDay) return false;
                const eventDate = new Date(event.start);
                return eventDate >= startDate && eventDate <= endDate;
            });

            if (workOnlyMode) {
                filtered = filtered.filter(event => 
                    event.isWorkEvent || eventProcessor.isWorkEvent(event.title)
                );
            }

            expect(filtered.length).toBe(1);
            expect(filtered[0].title).toBe('Bella 30');
        });
    });
});
