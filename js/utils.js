/**
 * GPS Admin - Utility Functions
 * Helper functions and constants used throughout the application
 */

class Utils {
    // Class constants
    static DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    static DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    static MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];

    /**
     * Format duration in minutes to human-readable string
     * @param {number} minutes - Duration in minutes
     * @param {Object} options - Formatting options
     * @returns {string} Formatted duration
     */
    static formatDuration(minutes, options = {}) {
        const { compact = false, showSeconds = false } = options;
        
        if (minutes < 1) return compact ? '0m' : '0 minutes';
        
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        
        if (compact) {
            if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
            if (hours > 0) return `${hours}h`;
            return `${mins}m`;
        }
        
        const parts = [];
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (mins > 0) parts.push(`${mins} minute${mins !== 1 ? 's' : ''}`);
        
        return parts.join(' ');
    }

    /**
     * Format hours with decimal precision
     * @param {number} hours - Hours as decimal
     * @param {number} precision - Decimal places
     * @returns {string} Formatted hours
     */
    static formatHours(hours, precision = 1) {
        return hours.toFixed(precision) + 'h';
    }

    /**
     * Create a date at specific time
     * @param {Date} baseDate - Base date to use
     * @param {number} hours - Hour (0-23)
     * @param {number} minutes - Minutes (0-59)
     * @returns {Date} New date at specified time
     */
    static createDateAtTime(baseDate, hours, minutes = 0) {
        return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);
    }

    /**
     * Add days to a date
     * @param {Date} date - Starting date
     * @param {number} days - Number of days to add
     * @returns {Date} New date with days added
     */
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * Create day boundaries for date filtering
     * @param {Date} date - The date
     * @returns {Object} Object with dayStart and dayEnd
     */
    static getDayBoundaries(date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        return { dayStart, dayEnd };
    }

    /**
     * Format time from Date object
     * @param {Date} date - Date to format
     * @returns {string} Formatted time string
     */
    static formatTime(date) {
        const parsedDate = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(parsedDate)) {
            return '';
        }
        return parsedDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Show a modal by ID
     * @param {string} modalId - The modal element ID
     */
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    /**
     * Hide a modal by ID
     * @param {string} modalId - The modal element ID
     */
    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type of toast (success, error, warning, info)
     * @param {number} duration - Duration in ms
     */
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}
