/**
 * Event Filtering Tests - Priority 1 Improvements
 * Tests for critical bug fixes in work event detection
 */

describe('Event Filtering - Priority 1 Improvements', () => {
    let processor;
    
    beforeEach(() => {
        // Create mock processor with work event detection methods
        processor = {
            workEventPatterns: {
                meetAndGreet: /\b(MG|M&G|Meet\s*&\s*Greet)\b/i,
                minutesSuffix: /\b(15|20|30|45|60)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i,
                houseSitSuffix: /\b(HS|Housesit)\b(?:\s*[-–]?\s*(Start|1st|2nd|3rd|Last))?$/i
            },
            
            personalEventPatterns: [
                /^lunch$/i,
                /^(✨|🌟)?\s*off\s*(✨|🌟)?$/i,
                /\bappointment\b/i,
                /\btherapy\b/i,
                /\bhouse\s*clean/i,
                /\bmomentum\b/i,
                /\bmeeting\s+with\b/i,
                /\btattoo\b/i,
                /\bmassage\b/i,
                /\byoga\b/i
            ],
            
            isPersonalEvent(title) {
                if (!title || typeof title !== 'string') return false;
                return this.personalEventPatterns.some(pattern => pattern.test(title));
            },
            
            isWorkEvent(title) {
                if (!title || typeof title !== 'string') return false;
                
                // First check if it's a personal event - exclude those
                if (this.isPersonalEvent(title)) return false;
                
                // Remove parenthetical notes for pattern matching
                const cleanTitle = title.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
                
                return (
                    this.workEventPatterns.meetAndGreet.test(cleanTitle) ||
                    this.workEventPatterns.minutesSuffix.test(cleanTitle) ||
                    this.workEventPatterns.houseSitSuffix.test(cleanTitle)
                );
            }
        };
    });

    describe('Parenthetical notes handling', () => {
        test('should detect work event with parenthetical note', () => {
            expect(processor.isWorkEvent("Pixel 30 (forgot to cancel)")).toBe(true);
        });
        
        test('should detect work event with clarifying note in parentheses', () => {
            expect(processor.isWorkEvent("Roary 30 (last until 10/26 AM)")).toBe(true);
        });
    });

    describe('Personal events exclusion', () => {
        test('should exclude "Lunch" as personal event', () => {
            expect(processor.isWorkEvent("Lunch")).toBe(false);
        });
        
        test('should exclude off day marker', () => {
            expect(processor.isWorkEvent("✨ Off ✨")).toBe(false);
        });
        
        test('should exclude personal appointments', () => {
            expect(processor.isWorkEvent("Appointment with Eric")).toBe(false);
        });
        
        test('should exclude therapy appointments', () => {
            expect(processor.isWorkEvent("Yoga Therapy")).toBe(false);
        });
        
        test('should exclude household tasks', () => {
            expect(processor.isWorkEvent("House Clean")).toBe(false);
        });
        
        test('should exclude business networking events', () => {
            expect(processor.isWorkEvent('Momentum "Get Operational" @ Velocity')).toBe(false);
        });
        
        test('should exclude personal/business meetings', () => {
            expect(processor.isWorkEvent("Meeting with Mark @ Fusion")).toBe(false);
        });
    });

    describe('Valid work events', () => {
        test('should detect standard work event format', () => {
            expect(processor.isWorkEvent("Minnie+ 30")).toBe(true);
        });
        
        test('should detect multi-pet with duration', () => {
            expect(processor.isWorkEvent("Archie Tarzan 60")).toBe(true);
        });
        
        test('should detect work event with sequence marker', () => {
            expect(processor.isWorkEvent("Roary 30 - 1st")).toBe(true);
        });
        
        test('should detect housesit start marker', () => {
            expect(processor.isWorkEvent("Larry Reuben 30 & HS Start")).toBe(true);
        });
        
        test('should detect meet & greet abbreviation', () => {
            expect(processor.isWorkEvent("Kona Chai Zero M&G")).toBe(true);
        });
    });

    describe('Edge cases', () => {
        test('should NOT detect pet care without duration marker', () => {
            expect(processor.isWorkEvent("Cookie gaba")).toBe(false);
        });
        
        test('should NOT detect personal appointment despite having "30"', () => {
            expect(processor.isWorkEvent("30 minute massage")).toBe(false);
        });
        
        test('should NOT detect tattoo appointment', () => {
            expect(processor.isWorkEvent("Watchtower Tattoo")).toBe(false);
        });
    });
});
