# Testing Documentation

## Overview

This project uses **Jest** as the testing framework to ensure code quality and prevent regressions as new features are added.

## Test Statistics

- **Test Suites**: 2
- **Total Tests**: 73
- **Coverage**: Templates Manager & Analytics modules

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
npm test:watch
```

### Run tests with coverage report
```bash
npm test:coverage
```

## Test Files

### 1. `tests/templates.test.js` - TemplatesManager Tests (51 tests)

Tests the complete CRUD functionality and business logic for appointment templates.

**Test Coverage:**
- ✅ Constructor and initialization (3 tests)
- ✅ Template CRUD operations (24 tests)
  - Create templates with validation
  - Retrieve templates by ID or type
  - Update template properties
  - Delete custom templates (prevents deleting defaults)
  - Duplicate templates
- ✅ Template validation (7 tests)
  - Required field validation
  - Duration validation
  - Travel buffer validation
  - Multi-error validation
- ✅ Template statistics (2 tests)
  - Usage tracking across events
- ✅ Import/Export functionality (5 tests)
  - JSON export
  - Merge and replace import modes
  - Error handling for invalid data
- ✅ LocalStorage persistence (3 tests)
  - Load/save to localStorage
  - Graceful handling of corrupted data
- ✅ Template types enumeration (2 tests)
- ✅ ID generation (2 tests)

**Key Test Cases:**
```javascript
// Example: Prevents deleting default templates
test('should not allow deleting default templates', () => {
  const defaultTemplate = manager.templates.find(t => t.isDefault);
  expect(() => {
    manager.deleteTemplate(defaultTemplate.id);
  }).toThrow('Cannot delete default template');
});

// Example: Validates template data
test('should reject template without name', () => {
  const validation = manager.validateTemplate({ duration: 30 });
  expect(validation.valid).toBe(false);
  expect(validation.errors).toContain('Template name is required');
});
```

### 2. `tests/analytics.test.js` - Analytics & Date Calculations (26 tests)

Tests date range calculations, period comparisons, and workload level logic.

**Test Coverage:**
- ✅ Date range calculations (7 tests)
  - Week, month, quarter, year ranges
  - Start/end time precision
  - Invalid input handling
- ✅ Previous period calculations (4 tests)
  - Week-over-week comparisons
  - Month-over-month, quarter, year
- ✅ Period comparison analytics (7 tests)
  - Appointment count comparisons
  - Hours worked comparisons
  - Average daily hours
  - Trend detection (positive/negative/neutral)
  - Empty period handling
- ✅ Workload level calculations (8 tests)
  - Threshold-based level detection
  - Light, comfortable, busy, overload, burnout levels
  - Edge case handling (zero, negative hours)
  - Daily vs weekly threshold modes

**Key Test Cases:**
```javascript
// Example: Week calculation accuracy
test('should calculate week range correctly', () => {
  const result = app.getDateRange('week');
  const daysDiff = Math.ceil((result.endDate - result.startDate) / (1000 * 60 * 60 * 24));
  expect(daysDiff).toBe(7);
});

// Example: Period comparison with increase
test('should calculate comparison with increase', () => {
  const currentEvents = [/* 3 events */];
  const previousEvents = [/* 1 event */];
  const comparison = app.calculatePeriodComparison(currentEvents, previousEvents, 7, 7);

  expect(comparison.appointments.diff).toBe(2);
  expect(comparison.appointments.percent).toBe(200);
  expect(comparison.appointments.trend).toBe('positive');
});
```

## Test Environment

### Configuration (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: 'jsdom',           // Browser-like environment
  roots: ['<rootDir>/tests'],         // Test location
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  coverageThreshold: {                // Quality gates
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### Setup File (`tests/setup.js`)

Provides:
- **LocalStorage Mock**: Simulates browser localStorage
- **DOM Elements**: Basic HTML structure for testing
- **Console Mocking**: Optional console output suppression

## Coverage Thresholds

The project maintains a **70% code coverage** minimum across:
- **Branches**: Conditional logic paths
- **Functions**: Function execution
- **Lines**: Line coverage
- **Statements**: Statement coverage

## Writing New Tests

### Test Structure Template

```javascript
describe('Feature Name', () => {
  let instance;

  beforeEach(() => {
    // Setup before each test
    localStorage.clear();
    instance = new YourClass();
  });

  afterEach(() => {
    // Cleanup after each test
    localStorage.clear();
  });

  describe('Method Name', () => {
    test('should do something specific', () => {
      // Arrange
      const input = { /* test data */ };

      // Act
      const result = instance.method(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Best Practices

1. **Test one thing per test**: Each test should verify a single behavior
2. **Use descriptive names**: Test names should explain what they verify
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Mock external dependencies**: Use mocks for localStorage, APIs, etc.
5. **Test edge cases**: Empty inputs, null values, boundary conditions
6. **Test error handling**: Verify proper error messages and exceptions

## Continuous Integration

### Pre-commit Checklist
```bash
# 1. Run all tests
npm test

# 2. Check coverage
npm test:coverage

# 3. Verify no failing tests
# All tests should show ✓ (passing)
```

### Expected Output
```
Test Suites: 2 passed, 2 total
Tests:       73 passed, 73 total
Snapshots:   0 total
Time:        ~5s
```

## Debugging Tests

### Run specific test file
```bash
npx jest tests/templates.test.js
```

### Run specific test by name
```bash
npx jest -t "should create a new template"
```

### Run with verbose output
```bash
npx jest --verbose
```

### Run with Node debugger
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Common Test Patterns

### Testing Async Code
```javascript
test('should handle async operations', async () => {
  const result = await instance.asyncMethod();
  expect(result).toBeDefined();
});
```

### Testing Exceptions
```javascript
test('should throw error for invalid input', () => {
  expect(() => {
    instance.method('invalid');
  }).toThrow('Expected error message');
});
```

### Testing LocalStorage
```javascript
test('should save to localStorage', () => {
  instance.save();
  const saved = localStorage.getItem('key');
  expect(saved).toBeDefined();
});
```

### Testing Date Ranges
```javascript
test('should calculate date range', () => {
  const { startDate, endDate } = instance.getDateRange('week');
  expect(endDate > startDate).toBe(true);
  expect(startDate.getHours()).toBe(0); // Midnight
  expect(endDate.getHours()).toBe(23);  // End of day
});
```

## Regression Prevention Strategy

### When Adding New Features

1. **Write tests first** (TDD approach recommended)
2. **Run existing tests** to ensure no breaking changes
3. **Add edge case tests** for new functionality
4. **Update this documentation** with new test coverage

### When Fixing Bugs

1. **Write a failing test** that reproduces the bug
2. **Fix the bug** until the test passes
3. **Add edge cases** related to the bug
4. **Document the fix** in commit messages

### When Refactoring

1. **Run full test suite** before refactoring
2. **Refactor incrementally** with tests passing after each step
3. **Ensure coverage doesn't decrease**
4. **Update tests** if behavior intentionally changes

## Future Test Expansion

### Planned Test Coverage

- [ ] **WorkloadAnalyzer**: Daily/weekly/monthly analysis logic
- [ ] **Calendar Integration**: Google Calendar API mocking
- [ ] **Maps API**: Travel time calculation mocking
- [ ] **UI Components**: Rendering and interaction tests
- [ ] **End-to-End Tests**: Full user workflows
- [ ] **Performance Tests**: Large dataset handling
- [ ] **Accessibility Tests**: WCAG compliance

### Integration Testing

Consider adding:
- API integration tests with mock servers
- Database persistence tests
- Cross-browser compatibility tests
- Mobile responsiveness tests

## Troubleshooting

### Tests Fail After Dependency Update
```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### LocalStorage Tests Failing
Ensure `tests/setup.js` is loaded:
```javascript
// Check jest.config.js
setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
```

### Timeout Errors
Increase Jest timeout for slow tests:
```javascript
jest.setTimeout(10000); // 10 seconds
```

---

**Last Updated**: 2025-11-12
**Test Framework**: Jest 29.7.0
**Test Coverage**: 73 tests across 2 modules
**Status**: ✅ All tests passing
