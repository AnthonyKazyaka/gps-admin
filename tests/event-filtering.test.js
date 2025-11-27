/**
 * Event Filtering Tests - Priority 1 Improvements
 * Tests for critical bug fixes in work event detection
 */

// Test cases for Priority 1 improvements
const testCases = [
    // Gap 3: Parenthetical notes should not break detection
    { 
        title: "Pixel 30 (forgot to cancel)", 
        expected: true,
        reason: "Duration in title with parenthetical note"
    },
    { 
        title: "Roary 30 (last until 10/26 AM)", 
        expected: true,
        reason: "Duration with clarifying note in parentheses"
    },
    
    // Gap 4: Personal events should be excluded
    {
        title: "Lunch",
        expected: false,
        reason: "Lunch is personal event"
    },
    {
        title: "✨ Off ✨",
        expected: false,
        reason: "Off day marker should exclude from work"
    },
    {
        title: "Appointment with Eric",
        expected: false,
        reason: "Personal appointment keyword"
    },
    {
        title: "Yoga Therapy",
        expected: false,
        reason: "Personal therapy appointment"
    },
    {
        title: "House Clean",
        expected: false,
        reason: "Household task, not pet sitting"
    },
    {
        title: "Momentum \"Get Operational\" @ Velocity",
        expected: false,
        reason: "Business networking event"
    },
    {
        title: "Meeting with Mark @ Fusion",
        expected: false,
        reason: "Personal/business meeting"
    },
    
    // Valid work events (should still match)
    {
        title: "Minnie+ 30",
        expected: true,
        reason: "Standard work event format"
    },
    {
        title: "Archie Tarzan 60",
        expected: true,
        reason: "Multi-pet with duration"
    },
    {
        title: "Roary 30 - 1st",
        expected: true,
        reason: "Work event with sequence marker"
    },
    {
        title: "Larry Reuben 30 & HS Start",
        expected: true,
        reason: "Housesit start marker"
    },
    {
        title: "Kona Chai Zero M&G",
        expected: true,
        reason: "Meet & greet abbreviation"
    },
    
    // Edge cases
    {
        title: "Cookie gaba",
        expected: false,
        reason: "No duration marker - personal pet care"
    },
    {
        title: "30 minute massage",
        expected: false,
        reason: "Personal appointment despite having '30'"
    },
    {
        title: "Watchtower Tattoo",
        expected: false,
        reason: "Personal tattoo appointment"
    }
];

// Run tests (basic console output)
function runTests() {
    console.log('🧪 Running Event Filtering Tests - Priority 1 Improvements\n');
    
    // Need to instantiate EventProcessor
    const processor = new EventProcessor();
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach((test, index) => {
        const result = processor.isWorkEvent(test.title);
        const success = result === test.expected;
        
        if (success) {
            passed++;
            console.log(`✅ Test ${index + 1}: PASS - "${test.title}"`);
        } else {
            failed++;
            console.log(`❌ Test ${index + 1}: FAIL - "${test.title}"`);
            console.log(`   Expected: ${test.expected}, Got: ${result}`);
            console.log(`   Reason: ${test.reason}`);
        }
    });
    
    console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);
    console.log(`   Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
    
    return { passed, failed, total: testCases.length };
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testCases, runTests };
}
