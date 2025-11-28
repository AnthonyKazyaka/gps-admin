/**
 * Jest Test Setup
 * Configures the test environment with necessary mocks and globals
 */

// Mock localStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock();

// Mock console methods to reduce test output noise (optional)
global.console = {
  ...console,
  // Uncomment to suppress console output in tests:
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: console.error, // Keep errors visible
};

// Set up basic DOM elements if needed
document.body.innerHTML = `
  <div id="app"></div>
`;
