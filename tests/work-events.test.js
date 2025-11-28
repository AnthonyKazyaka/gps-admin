/**
 * Unit Tests for Work Event Detection
 */

describe('Work Event Detection', () => {
    let app;

    beforeEach(() => {
        // Create mock app with work event detection methods
        app = {
            workEventPatterns: {
                meetAndGreet: /\b(MG|M&G|Meet\s*&\s*Greet)\b/i,
                minutesSuffix: /\b(15|20|30|45|60)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i,
                houseSitSuffix: /\b(HS|Housesit)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i
            },

            isWorkEvent(title) {
                if (!title || typeof title !== 'string') return false;
                const trimmedTitle = title.trim();
                return (
                    this.workEventPatterns.meetAndGreet.test(trimmedTitle) ||
                    this.workEventPatterns.minutesSuffix.test(trimmedTitle) ||
                    this.workEventPatterns.houseSitSuffix.test(trimmedTitle)
                );
            },

            detectServiceType(title) {
                if (!title || typeof title !== 'string') return 'other';
                const trimmedTitle = title.trim();
                if (this.workEventPatterns.meetAndGreet.test(trimmedTitle)) return 'meet-greet';
                if (this.workEventPatterns.houseSitSuffix.test(trimmedTitle)) return 'housesit';
                if (this.workEventPatterns.minutesSuffix.test(trimmedTitle)) return 'dropin';
                return 'other';
            },

            extractDurationFromTitle(title) {
                if (!title || typeof title !== 'string') return null;
                const match = this.workEventPatterns.minutesSuffix.exec(title.trim());
                return (match && match[1]) ? parseInt(match[1], 10) : null;
            },

            extractSequenceMarker(title) {
                if (!title || typeof title !== 'string') return null;
                let match = this.workEventPatterns.minutesSuffix.exec(title.trim());
                if (match && match[2]) return match[2];
                match = this.workEventPatterns.houseSitSuffix.exec(title.trim());
                return (match && match[2]) ? match[2] : null;
            }
        };
    });

    describe('isWorkEvent - Meet & Greet Detection', () => {
        test('should detect "MG" as work event', () => {
            expect(app.isWorkEvent('Cooper MG')).toBe(true);
            expect(app.isWorkEvent('Bentley MG')).toBe(true);
        });

        test('should detect "M&G" as work event', () => {
            expect(app.isWorkEvent('Stella M&G')).toBe(true);
            expect(app.isWorkEvent('Chairman M&G')).toBe(true);
        });

        test('should detect "Meet & Greet" as work event', () => {
            expect(app.isWorkEvent('Cooper Meet & Greet')).toBe(true);
            expect(app.isWorkEvent('Bentley Meet&Greet')).toBe(true);
        });

        test('should be case insensitive', () => {
            expect(app.isWorkEvent('Cooper mg')).toBe(true);
            expect(app.isWorkEvent('Cooper m&g')).toBe(true);
            expect(app.isWorkEvent('Cooper meet & greet')).toBe(true);
        });

        test('should match as whole words', () => {
            expect(app.isWorkEvent('MG Cooper')).toBe(true);
            expect(app.isWorkEvent('Cooper MG')).toBe(true);
        });
    });

    describe('isWorkEvent - Timed Visit Detection', () => {
        test('should detect visit ending with duration', () => {
            expect(app.isWorkEvent('Bentley 30')).toBe(true);
            expect(app.isWorkEvent('Chairman Lulu 45')).toBe(true);
            expect(app.isWorkEvent('Evie 30')).toBe(true);
            expect(app.isWorkEvent('Chu Chu 20')).toBe(true);
            expect(app.isWorkEvent('Cooper 60')).toBe(true);
        });

        test('should detect all standard durations', () => {
            expect(app.isWorkEvent('Pet 15')).toBe(true);
            expect(app.isWorkEvent('Pet 20')).toBe(true);
            expect(app.isWorkEvent('Pet 30')).toBe(true);
            expect(app.isWorkEvent('Pet 45')).toBe(true);
            expect(app.isWorkEvent('Pet 60')).toBe(true);
        });

        test('should detect visits with sequence markers', () => {
            expect(app.isWorkEvent('Chairman Lulu 60 - 1st')).toBe(true);
            expect(app.isWorkEvent('Evie 30 – Last')).toBe(true);
            expect(app.isWorkEvent('Chu Chu 20 Start')).toBe(true);
            expect(app.isWorkEvent('Bentley 45 - 2nd')).toBe(true);
            expect(app.isWorkEvent('Cooper 30 - 3rd')).toBe(true);
        });

        test('should NOT detect non-standard durations', () => {
            expect(app.isWorkEvent('Meeting 90')).toBe(false);
            expect(app.isWorkEvent('Lunch 120')).toBe(false);
            expect(app.isWorkEvent('Workout 35')).toBe(false);
        });

        test('should NOT detect duration in middle of title', () => {
            expect(app.isWorkEvent('Apartment 30 Main St')).toBe(false);
        });
    });

    describe('isWorkEvent - House Sit Detection', () => {
        test('should detect "HS" suffix', () => {
            expect(app.isWorkEvent('Stella Sirius HS')).toBe(true);
            expect(app.isWorkEvent('Kona Chai Zero HS')).toBe(true);
        });

        test('should detect "Housesit" suffix', () => {
            expect(app.isWorkEvent('Kona Chai Zero Housesit')).toBe(true);
            expect(app.isWorkEvent('Stella Sirius Housesit')).toBe(true);
        });

        test('should be case insensitive', () => {
            expect(app.isWorkEvent('Stella hs')).toBe(true);
            expect(app.isWorkEvent('Stella housesit')).toBe(true);
            expect(app.isWorkEvent('Stella HOUSESIT')).toBe(true);
        });

        test('should detect house sits with sequence markers', () => {
            expect(app.isWorkEvent('Chu Chu HS Start')).toBe(true);
            expect(app.isWorkEvent('Stella HS - 1st')).toBe(true);
            expect(app.isWorkEvent('Cooper Housesit Last')).toBe(true);
        });
    });

    describe('isWorkEvent - Non-Work Events', () => {
        test('should NOT detect personal events', () => {
            expect(app.isWorkEvent('Dentist Appointment')).toBe(false);
            expect(app.isWorkEvent('Team Meeting')).toBe(false);
            expect(app.isWorkEvent('Lunch with Sarah')).toBe(false);
            expect(app.isWorkEvent('Birthday Party')).toBe(false);
        });

        test('should handle empty or null titles', () => {
            expect(app.isWorkEvent('')).toBe(false);
            expect(app.isWorkEvent(null)).toBe(false);
            expect(app.isWorkEvent(undefined)).toBe(false);
        });
    });

    describe('detectServiceType', () => {
        test('should detect meet-greet type', () => {
            expect(app.detectServiceType('Cooper MG')).toBe('meet-greet');
            expect(app.detectServiceType('Bentley M&G')).toBe('meet-greet');
        });

        test('should detect housesit type', () => {
            expect(app.detectServiceType('Stella HS')).toBe('housesit');
            expect(app.detectServiceType('Cooper Housesit')).toBe('housesit');
        });

        test('should detect dropin type', () => {
            expect(app.detectServiceType('Bentley 30')).toBe('dropin');
            expect(app.detectServiceType('Chairman Lulu 45')).toBe('dropin');
        });

        test('should return "other" for non-work events', () => {
            expect(app.detectServiceType('Dentist')).toBe('other');
            expect(app.detectServiceType('Meeting')).toBe('other');
        });
    });

    describe('extractDurationFromTitle', () => {
        test('should extract duration from timed visits', () => {
            expect(app.extractDurationFromTitle('Bentley 30')).toBe(30);
            expect(app.extractDurationFromTitle('Chairman Lulu 45')).toBe(45);
            expect(app.extractDurationFromTitle('Cooper 60')).toBe(60);
            expect(app.extractDurationFromTitle('Pet 15')).toBe(15);
            expect(app.extractDurationFromTitle('Pet 20')).toBe(20);
        });

        test('should extract duration with sequence markers', () => {
            expect(app.extractDurationFromTitle('Chairman Lulu 60 - 1st')).toBe(60);
            expect(app.extractDurationFromTitle('Evie 30 – Last')).toBe(30);
        });

        test('should return null for non-timed events', () => {
            expect(app.extractDurationFromTitle('Stella HS')).toBeNull();
            expect(app.extractDurationFromTitle('Cooper MG')).toBeNull();
            expect(app.extractDurationFromTitle('Meeting')).toBeNull();
        });
    });

    describe('extractSequenceMarker', () => {
        test('should extract sequence from timed visits', () => {
            expect(app.extractSequenceMarker('Chairman Lulu 60 - 1st')).toBe('1st');
            expect(app.extractSequenceMarker('Evie 30 – Last')).toBe('Last');
            expect(app.extractSequenceMarker('Chu Chu 20 Start')).toBe('Start');
            expect(app.extractSequenceMarker('Bentley 45 - 2nd')).toBe('2nd');
            expect(app.extractSequenceMarker('Cooper 30 - 3rd')).toBe('3rd');
        });

        test('should extract sequence from house sits', () => {
            expect(app.extractSequenceMarker('Chu Chu HS Start')).toBe('Start');
            expect(app.extractSequenceMarker('Stella HS - 1st')).toBe('1st');
            expect(app.extractSequenceMarker('Cooper Housesit Last')).toBe('Last');
        });

        test('should return null when no sequence marker', () => {
            expect(app.extractSequenceMarker('Bentley 30')).toBeNull();
            expect(app.extractSequenceMarker('Stella HS')).toBeNull();
        });
    });

    describe('Real-world Examples', () => {
        test('should correctly identify all example work events', () => {
            const workEvents = [
                'Chairman Lulu 45',
                'Stella Sirius HS',
                'Chairman Lulu 60 - 1st',
                'Evie 30 – Last',
                'Chu Chu 20 Start',
                'Kona Chai Zero Housesit',
                'Cooper MG',
                'Bentley M&G',
                'Pet Meet & Greet',
                'Chu Chu HS Start'
            ];

            workEvents.forEach(title => {
                expect(app.isWorkEvent(title)).toBe(true);
            });
        });

        test('should correctly identify non-work events', () => {
            const nonWorkEvents = [
                'Team Standup',
                'Dentist Appointment',
                'Lunch with Client',
                'Project Review',
                'Birthday Party'
            ];

            nonWorkEvents.forEach(title => {
                expect(app.isWorkEvent(title)).toBe(false);
            });
        });
    });
});
