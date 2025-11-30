/**
 * GPS Admin - Mock Data Generator
 * Generates realistic sample data for development and testing
 */

class MockDataGenerator {
    /**
     * Generate mock events for testing
     * @returns {Array} Array of mock events
     */
    static generateMockEvents() {
        const today = new Date();
        const events = [];

        // ===== HISTORICAL DATA FOR CURRENT MONTH =====
        // This ensures the Analytics chart has data to display
        
        // Day -25 (early in month) - Light day
        events.push(
            {
                id: 'h1',
                title: 'Buddy 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 25, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 25, 9, 30),
                location: '111 Ash Avenue',
                client: 'Thompson Family',
                notes: 'Morning check-in'
            },
            {
                id: 'h2',
                title: 'Shadow 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 25, 14, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 25, 14, 45),
                location: '222 Walnut Lane',
                client: 'Miller Family',
                notes: 'Afternoon visit'
            }
        );

        // Day -24 - Moderate day
        events.push(
            {
                id: 'h3',
                title: 'Luna 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 24, 8, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 24, 8, 30),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Medication'
            },
            {
                id: 'h4',
                title: 'Max & Cooper 60',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 24, 11, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 24, 12, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family',
                notes: 'Park walk'
            },
            {
                id: 'h5',
                title: 'Milo 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 24, 17, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 24, 17, 30),
                location: '321 Pine Road',
                client: 'Wilson Family',
                notes: 'Evening care'
            }
        );

        // Day -22 - BUSY day (6+ hours)
        events.push(
            {
                id: 'h6',
                title: 'Bella 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 7, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 7, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: 'h7',
                title: 'Charlie 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 8, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 9, 15),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            },
            {
                id: 'h8',
                title: 'Max & Cooper 60',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 10, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 11, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: 'h9',
                title: 'Luna 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 12, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 12, 45),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: 'h10',
                title: 'Daisy 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 14, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 14, 30),
                location: '888 Birch Court',
                client: 'Taylor Family'
            },
            {
                id: 'h11',
                title: 'Oscar 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 15, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 16, 15),
                location: '999 Willow Way',
                client: 'Anderson Family'
            },
            {
                id: 'h12',
                title: 'Milo 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 17, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 18, 0),
                location: '321 Pine Road',
                client: 'Wilson Family'
            },
            {
                id: 'h13',
                title: 'Buddy 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 19, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 22, 19, 30),
                location: '111 Ash Avenue',
                client: 'Thompson Family'
            }
        );

        // Day -20 - OVERLOAD day (8+ hours)
        events.push(
            {
                id: 'h14',
                title: 'Bella 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 6, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 7, 0),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: 'h15',
                title: 'Luna 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 7, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 8, 15),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: 'h16',
                title: 'Charlie 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 9, 45),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            },
            {
                id: 'h17',
                title: 'Max & Cooper 90',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 10, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 12, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: 'h18',
                title: 'Jasper 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 13, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 13, 30),
                location: '234 Spruce St',
                client: 'Garcia Family'
            },
            {
                id: 'h19',
                title: 'Daisy 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 14, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 15, 15),
                location: '888 Birch Court',
                client: 'Taylor Family'
            },
            {
                id: 'h20',
                title: 'Oscar 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 16, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 16, 45),
                location: '999 Willow Way',
                client: 'Anderson Family'
            },
            {
                id: 'h21',
                title: 'Milo 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 17, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 18, 0),
                location: '321 Pine Road',
                client: 'Wilson Family'
            },
            {
                id: 'h22',
                title: 'Buddy 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 18, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 19, 15),
                location: '111 Ash Avenue',
                client: 'Thompson Family'
            },
            {
                id: 'h23',
                title: 'Shadow 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 20, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 20, 20, 30),
                location: '222 Walnut Lane',
                client: 'Miller Family'
            }
        );

        // Day -18 - Moderate day
        events.push(
            {
                id: 'h24',
                title: 'Luna 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 18, 8, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 18, 8, 30),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: 'h25',
                title: 'Bella 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 18, 12, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 18, 12, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: 'h26',
                title: 'Max & Cooper 60',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 18, 15, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 18, 16, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            }
        );

        // Day -15 - EXTREME OVERLOAD (10+ hours - burnout!)
        events.push(
            {
                id: 'h27',
                title: 'Bella 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 6, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 6, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: 'h28',
                title: 'Luna 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 7, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 7, 45),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: 'h29',
                title: 'Charlie 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 8, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 9, 15),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            },
            {
                id: 'h30',
                title: 'Max & Cooper 90',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 10, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 11, 30),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: 'h31',
                title: 'Jasper 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 12, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 12, 45),
                location: '234 Spruce St',
                client: 'Garcia Family'
            },
            {
                id: 'h32',
                title: 'Daisy 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 13, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 14, 15),
                location: '888 Birch Court',
                client: 'Taylor Family'
            },
            {
                id: 'h33',
                title: 'Oscar 60',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 15, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 16, 0),
                location: '999 Willow Way',
                client: 'Anderson Family'
            },
            {
                id: 'h34',
                title: 'Milo 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 16, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 17, 15),
                location: '321 Pine Road',
                client: 'Wilson Family'
            },
            {
                id: 'h35',
                title: 'Buddy 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 18, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 18, 45),
                location: '111 Ash Avenue',
                client: 'Thompson Family'
            },
            {
                id: 'h36',
                title: 'Shadow 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 19, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 20, 15),
                location: '222 Walnut Lane',
                client: 'Miller Family'
            },
            {
                id: 'h37',
                title: 'Bella 30 (late)',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 21, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15, 21, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            }
        );

        // Day -12 - Light day
        events.push(
            {
                id: 'h38',
                title: 'Luna 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 12, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 12, 9, 30),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: 'h39',
                title: 'Milo 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 12, 17, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 12, 17, 30),
                location: '321 Pine Road',
                client: 'Wilson Family'
            }
        );

        // Day -10 - Moderate day
        events.push(
            {
                id: 'h40',
                title: 'Bella 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 8, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 8, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: 'h41',
                title: 'Max & Cooper 60',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 11, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 12, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: 'h42',
                title: 'Luna 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 13, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 13, 30),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: 'h43',
                title: 'Daisy 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 17, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10, 17, 30),
                location: '888 Birch Court',
                client: 'Taylor Family'
            }
        );

        // Day -8 - Busy day
        events.push(
            {
                id: 'h44',
                title: 'Bella 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 7, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 7, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: 'h45',
                title: 'Charlie 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 9, 45),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            },
            {
                id: 'h46',
                title: 'Max & Cooper 60',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 11, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 12, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: 'h47',
                title: 'Luna 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 13, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 13, 45),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: 'h48',
                title: 'Oscar 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 15, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 15, 45),
                location: '999 Willow Way',
                client: 'Anderson Family'
            },
            {
                id: 'h49',
                title: 'Milo 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 17, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8, 18, 0),
                location: '321 Pine Road',
                client: 'Wilson Family'
            }
        );

        // Day -5 - Moderate day
        events.push(
            {
                id: 'h50',
                title: 'Luna 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 8, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 8, 30),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: 'h51',
                title: 'Bella 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 12, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 12, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: 'h52',
                title: 'Max & Cooper 60',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 15, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 16, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            }
        );

        // Day -3 - Light day
        events.push(
            {
                id: 'h53',
                title: 'Milo 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 9, 30),
                location: '321 Pine Road',
                client: 'Wilson Family'
            },
            {
                id: 'h54',
                title: 'Daisy 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 17, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 17, 30),
                location: '888 Birch Court',
                client: 'Taylor Family'
            }
        );

        // Day -1 (Yesterday) - Busy day
        events.push(
            {
                id: 'h55',
                title: 'Bella 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 7, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 8, 0),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: 'h56',
                title: 'Luna 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 45),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: 'h57',
                title: 'Max & Cooper 60',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 11, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: 'h58',
                title: 'Charlie 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 14, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 14, 45),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            },
            {
                id: 'h59',
                title: 'Milo 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 17, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 17, 30),
                location: '321 Pine Road',
                client: 'Wilson Family'
            }
        );

        // ===== WEEK 1: TODAY =====
        // Today - Moderate workload
        events.push(
            {
                id: '1',
                title: 'Bella 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 30),
                location: '123 Oak Street',
                client: 'Johnson Family',
                notes: 'Feed, water, and playtime'
            },
            {
                id: '2',
                title: 'Max & Cooper 60',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30),
                location: '456 Elm Avenue',
                client: 'Smith Family',
                notes: '1 hour walk in the park'
            },
            {
                id: '3',
                title: 'Luna 45',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 45),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Medication at 1:30pm'
            },
            {
                id: '4',
                title: 'Milo 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0),
                location: '321 Pine Road',
                client: 'Wilson Family',
                notes: 'Dinner and potty break'
            }
        );

        // Day +1 - Light day
        events.push(
            {
                id: '5',
                title: 'Charlie M&G',
                type: 'meet-greet',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 15, 0),
                location: '555 Cedar Lane',
                client: 'Brown Family',
                notes: 'New client - anxious rescue dog'
            },
            {
                id: '6',
                title: 'Daisy 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 18, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 18, 30),
                location: '888 Birch Court',
                client: 'Taylor Family',
                notes: 'Feed and quick walk'
            }
        );

        // Day +2 - Overnight starts
        events.push(
            {
                id: '7',
                title: 'Rocky & Bella Overnight',
                type: 'overnight',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 18, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 10, 0),
                location: '123 Oak Street',
                client: 'Johnson Family',
                notes: 'Overnight care - family vacation'
            },
            {
                id: '8',
                title: 'Luna 30',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 9, 30),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Medication'
            },
            {
                id: '8a',
                title: 'Buddy Nail Trim',
                type: 'other',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 11, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 11, 15),
                location: '999 Cherry Street',
                client: 'Anderson Family',
                notes: 'Nail trim only'
            }
        );

        // Day +3 - Busy day with ongoing overnight
        events.push(
            {
                id: '9',
                title: 'Max & Cooper - Morning Walk',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 10, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family',
                notes: '1 hour walk'
            },
            {
                id: '10',
                title: 'Luna - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 12, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 12, 30),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Medication'
            },
            {
                id: '11',
                title: 'Milo - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 17, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 17, 30),
                location: '321 Pine Road',
                client: 'Wilson Family',
                notes: 'Evening care'
            }
        );

        // Day +4 - Very busy Friday
        events.push(
            {
                id: '12',
                title: 'Bella - Early Morning Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 7, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 7, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: '13',
                title: 'Charlie - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 9, 45),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            },
            {
                id: '14',
                title: 'Max & Cooper - Walk',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 11, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 12, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: '15',
                title: 'Luna - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 13, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 14, 0),
                location: '789 Maple Drive',
                client: 'Davis Family'
            },
            {
                id: '16',
                title: 'Daisy - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 15, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 15, 30),
                location: '888 Birch Court',
                client: 'Taylor Family'
            },
            {
                id: '17',
                title: 'Milo - Evening Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 17, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 18, 0),
                location: '321 Pine Road',
                client: 'Wilson Family'
            },
            {
                id: '18',
                title: 'Oscar - Late Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 19, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 19, 30),
                location: '999 Willow Way',
                client: 'Anderson Family'
            }
        );

        // Day +5 - Weekend Saturday - Moderate
        events.push(
            {
                id: '19',
                title: 'Luna - Morning Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 9, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 9, 45),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Weekend medication'
            },
            {
                id: '20',
                title: 'Jasper - Meet & Greet',
                type: 'meet-greet',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 11, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 12, 0),
                location: '234 Spruce St',
                client: 'Garcia Family',
                notes: 'New client - senior cat'
            },
            {
                id: '21',
                title: 'Daisy - Evening Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 18, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 18, 30),
                location: '888 Birch Court',
                client: 'Taylor Family'
            }
        );

        // Day +6 - Sunday - Light
        events.push(
            {
                id: '22',
                title: 'Max & Cooper - Long Walk',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6, 10, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6, 11, 30),
                location: '456 Elm Avenue',
                client: 'Smith Family',
                notes: '1.5 hour park walk'
            }
        );

        // ===== WEEK 2 =====
        // Day +7 - Monday - Back to work busy
        events.push(
            {
                id: '23',
                title: 'Bella - Morning Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 8, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 8, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: '24',
                title: 'Luna - Morning Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 9, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 10, 0),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Medication'
            },
            {
                id: '25',
                title: 'Charlie - Midday Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 12, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 13, 15),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            },
            {
                id: '26',
                title: 'Max & Cooper - Afternoon Walk',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 15, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 16, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: '27',
                title: 'Milo - Evening Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 17, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 18, 0),
                location: '321 Pine Road',
                client: 'Wilson Family'
            }
        );

        // Day +8 - Tuesday - Overnight starts
        events.push(
            {
                id: '28',
                title: 'Tucker - Overnight Stay',
                type: 'overnight',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 18, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 10, 0),
                location: '777 Poplar Blvd',
                client: 'Martinez Family',
                notes: '3-night stay - business trip'
            },
            {
                id: '29',
                title: 'Bella - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 8, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 8, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: '30',
                title: 'Luna - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 13, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8, 13, 45),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Medication'
            }
        );

        // Day +9 - Wednesday - HIGH WORKLOAD
        events.push(
            {
                id: '31',
                title: 'Bella - Early Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 7, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 7, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: '32',
                title: 'Charlie - Morning Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 8, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 9, 15),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            },
            {
                id: '33',
                title: 'Max & Cooper - Walk',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 10, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 11, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: '34',
                title: 'Luna - Midday Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 12, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 12, 45),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Medication'
            },
            {
                id: '35',
                title: 'Daisy - Afternoon Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 14, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 14, 30),
                location: '888 Birch Court',
                client: 'Taylor Family'
            },
            {
                id: '36',
                title: 'Milo - Evening Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 16, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 17, 0),
                location: '321 Pine Road',
                client: 'Wilson Family'
            },
            {
                id: '37',
                title: 'Oscar - Late Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 18, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 9, 19, 0),
                location: '999 Willow Way',
                client: 'Anderson Family'
            }
        );

        // Day +10 - Thursday - VERY HIGH WORKLOAD (BURNOUT RISK)
        events.push(
            {
                id: '38',
                title: 'Bella - Early Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 6, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 7, 0),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: '39',
                title: 'Luna - Morning Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 8, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 8, 45),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Medication'
            },
            {
                id: '40',
                title: 'Charlie - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 9, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 10, 15),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            },
            {
                id: '41',
                title: 'Max & Cooper - Walk',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 11, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 12, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: '42',
                title: 'Jasper - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 13, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 13, 30),
                location: '234 Spruce St',
                client: 'Garcia Family'
            },
            {
                id: '43',
                title: 'Daisy - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 14, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 15, 0),
                location: '888 Birch Court',
                client: 'Taylor Family'
            },
            {
                id: '44',
                title: 'Milo - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 16, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 16, 30),
                location: '321 Pine Road',
                client: 'Wilson Family'
            },
            {
                id: '45',
                title: 'Oscar - Evening Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 17, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 18, 0),
                location: '999 Willow Way',
                client: 'Anderson Family'
            },
            {
                id: '46',
                title: 'Buddy - Late Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 19, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 19, 45),
                location: '111 Ash Avenue',
                client: 'Thompson Family',
                notes: 'Emergency visit - owner delayed'
            }
        );

        // Day +11 - Friday - Still busy
        events.push(
            {
                id: '47',
                title: 'Luna - Morning Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 8, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 8, 45),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Medication'
            },
            {
                id: '48',
                title: 'Bella - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 10, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 10, 30),
                location: '123 Oak Street',
                client: 'Johnson Family'
            },
            {
                id: '49',
                title: 'Max & Cooper - Walk',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 12, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 13, 0),
                location: '456 Elm Avenue',
                client: 'Smith Family'
            },
            {
                id: '50',
                title: 'Daisy - Afternoon Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 15, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 15, 30),
                location: '888 Birch Court',
                client: 'Taylor Family'
            },
            {
                id: '51',
                title: 'Milo - Evening Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 17, 30),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 11, 18, 0),
                location: '321 Pine Road',
                client: 'Wilson Family'
            }
        );

        // Day +12 - Weekend Saturday
        events.push(
            {
                id: '52',
                title: 'Luna - Weekend Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 10, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 10, 30),
                location: '789 Maple Drive',
                client: 'Davis Family',
                notes: 'Weekend medication'
            },
            {
                id: '53',
                title: 'Charlie - Drop-in',
                type: 'dropin',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 14, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 14, 45),
                location: '555 Cedar Lane',
                client: 'Brown Family'
            }
        );

        // Day +13 - Sunday - Light day (rest!)
        events.push(
            {
                id: '54',
                title: 'Max & Cooper - Long Walk',
                type: 'walk',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 13, 10, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 13, 11, 30),
                location: '456 Elm Avenue',
                client: 'Smith Family',
                notes: 'Weekend park walk'
            }
        );

        // Add calendar metadata to mock events
        events.forEach(event => {
            event.calendarName = 'Genie\'s Pet Sitting Calendar';
            event.calendarId = 'primary';
            event.isAllDay = false;
            event.recurringEventId = null;
            event.ignored = false;
        });

        // Add some sample all-day events for testing
        events.push(
            {
                id: '92',
                title: 'Your Birthday',
                type: 'other',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 0, 0, 0, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6, 0, 0, 0, 0),
                location: '',
                client: '',
                notes: '',
                calendarName: 'Personal Calendar',
                calendarId: 'personal',
                isAllDay: true,
                recurringEventId: null,
                ignored: false
            },
            {
                id: '93',
                title: 'Annual Vet Conference',
                type: 'other',
                start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12, 0, 0, 0, 0),
                end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14, 0, 0, 0, 0),
                location: 'Convention Center',
                client: '',
                notes: 'Professional development - mark as ignored for workload',
                calendarName: 'Personal Calendar',
                calendarId: 'personal',
                isAllDay: true,
                recurringEventId: null,
                ignored: false
            }
        );

        return events;
    }

    /**
     * Generate default templates
     * @returns {Array} Array of default templates
     */
    static generateDefaultTemplates() {
        return [
            {
                id: 't1',
                name: 'Overnight Stay',
                icon: '🌙',
                type: 'overnight',
                duration: 960, // 16 hours
                includeTravel: true,
                defaultNotes: 'Overnight pet sitting - includes evening and morning care'
            },
            {
                id: 't2',
                name: '30-Minute Drop-in',
                icon: '🏃',
                type: 'dropin',
                duration: 30,
                includeTravel: true,
                defaultNotes: 'Quick visit for feeding and potty break'
            },
            {
                id: 't3',
                name: '1-Hour Dog Walk',
                icon: '🦮',
                type: 'walk',
                duration: 60,
                includeTravel: true,
                defaultNotes: '1 hour walk in neighborhood or park'
            },
            {
                id: 't4',
                name: 'Meet & Greet',
                icon: '👋',
                type: 'meet-greet',
                duration: 60,
                includeTravel: false,
                defaultNotes: 'Initial consultation with new client'
            }
        ];
    }
}
