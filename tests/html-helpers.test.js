/**
 * Tests for HTML Helper functions
 * TDD approach: These tests are written BEFORE implementation
 */

// Load the utils module which contains HtmlHelpers
const fs = require('fs');
const path = require('path');
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');

// Create a function scope to evaluate the code and extract classes
const loadClasses = new Function(`
    ${utilsCode}
    return { Utils, HtmlHelpers };
`);

const { Utils, HtmlHelpers } = loadClasses();

describe('HtmlHelpers', () => {
    describe('insightCard', () => {
        it('should generate basic insight card with label and value', () => {
            const html = HtmlHelpers.insightCard({
                label: 'Total Appointments',
                value: '42'
            });

            expect(html).toContain('class="insight-card"');
            expect(html).toContain('class="insight-label"');
            expect(html).toContain('Total Appointments');
            expect(html).toContain('class="insight-value"');
            expect(html).toContain('42');
        });

        it('should include sublabel when provided', () => {
            const html = HtmlHelpers.insightCard({
                label: 'Work Hours',
                value: '8h 30m',
                sublabel: 'Appointment time'
            });

            expect(html).toContain('class="insight-sublabel"');
            expect(html).toContain('Appointment time');
        });

        it('should omit sublabel div when not provided', () => {
            const html = HtmlHelpers.insightCard({
                label: 'Count',
                value: '5'
            });

            expect(html).not.toContain('insight-sublabel');
        });

        it('should apply custom value style when provided', () => {
            const html = HtmlHelpers.insightCard({
                label: 'Weekly Workload',
                value: 'High',
                valueStyle: 'color: var(--orange-500);'
            });

            expect(html).toContain('style="color: var(--orange-500);"');
        });

        it('should include progress bar when progressPercent is provided', () => {
            const html = HtmlHelpers.insightCard({
                label: 'Capacity',
                value: '75%',
                progressPercent: 75,
                progressColor: 'var(--success-500)'
            });

            expect(html).toContain('class="progress-bar"');
            expect(html).toContain('class="progress-fill"');
            expect(html).toContain('width: 75%');
            expect(html).toContain('background: var(--success-500)');
        });

        it('should cap progress bar at 100%', () => {
            const html = HtmlHelpers.insightCard({
                label: 'Overload',
                value: '120%',
                progressPercent: 120,
                progressColor: 'var(--danger-500)'
            });

            expect(html).toContain('width: 100%');
        });

        it('should apply additional CSS class when type is provided', () => {
            const html = HtmlHelpers.insightCard({
                label: 'Alert',
                value: 'Warning',
                type: 'warning'
            });

            expect(html).toContain('class="insight-card warning"');
        });
    });

    describe('statCard', () => {
        it('should generate basic stat card with label, value, and id', () => {
            const html = HtmlHelpers.statCard({
                label: 'Total Hours',
                valueId: 'analytics-total-hours',
                defaultValue: '0h'
            });

            expect(html).toContain('class="stat-card"');
            expect(html).toContain('class="stat-label"');
            expect(html).toContain('Total Hours');
            expect(html).toContain('class="stat-value"');
            expect(html).toContain('id="analytics-total-hours"');
            expect(html).toContain('0h');
        });

        it('should include comparison element with correct id', () => {
            const html = HtmlHelpers.statCard({
                label: 'Daily Avg',
                valueId: 'analytics-avg-daily',
                defaultValue: '0h',
                comparisonId: 'analytics-avg-daily-comparison'
            });

            expect(html).toContain('id="analytics-avg-daily-comparison"');
            expect(html).toContain('class="stat-comparison"');
        });

        it('should omit comparison div when comparisonId not provided', () => {
            const html = HtmlHelpers.statCard({
                label: 'Count',
                valueId: 'my-count',
                defaultValue: '0'
            });

            expect(html).not.toContain('stat-comparison');
        });
    });

    describe('recommendationCard', () => {
        it('should generate basic recommendation card', () => {
            const html = HtmlHelpers.recommendationCard({
                icon: '✅',
                content: '<p>Everything looks good!</p>'
            });

            expect(html).toContain('class="recommendation-card"');
            expect(html).toContain('class="recommendation-icon"');
            expect(html).toContain('✅');
            expect(html).toContain('class="recommendation-content"');
            expect(html).toContain('Everything looks good!');
        });

        it('should apply severity class when provided', () => {
            const html = HtmlHelpers.recommendationCard({
                icon: '⚠️',
                content: '<p>Warning message</p>',
                severity: 'danger'
            });

            expect(html).toContain('class="recommendation-card danger"');
        });

        it('should apply warning severity', () => {
            const html = HtmlHelpers.recommendationCard({
                icon: '📊',
                content: '<p>High workload</p>',
                severity: 'warning'
            });

            expect(html).toContain('class="recommendation-card warning"');
        });

        it('should handle complex HTML content', () => {
            const html = HtmlHelpers.recommendationCard({
                icon: '⚠️',
                content: '<p><strong>Burnout Risk:</strong> You have 3 days with high hours.</p>'
            });

            expect(html).toContain('<strong>Burnout Risk:</strong>');
            expect(html).toContain('3 days');
        });
    });

    describe('workEventBadge', () => {
        it('should generate standard work badge', () => {
            const html = HtmlHelpers.workEventBadge({ isWork: true });

            expect(html).toContain('class="work-event-badge"');
            expect(html).toContain('💼 Work');
        });

        it('should generate housesit ending badge', () => {
            const html = HtmlHelpers.workEventBadge({
                isWork: true,
                isOvernightEnding: true
            });

            expect(html).toContain('class="work-event-badge"');
            expect(html).toContain('🏠 Housesit Ends');
            expect(html).toContain('background-color: #A78BFA');
        });

        it('should return empty string for non-work events', () => {
            const html = HtmlHelpers.workEventBadge({ isWork: false });

            expect(html).toBe('');
        });
    });

    describe('dayDetailsStat', () => {
        it('should generate stat span with icon and value', () => {
            const html = HtmlHelpers.dayDetailsStat({
                icon: '📅',
                value: '5 appointments'
            });

            expect(html).toContain('class="day-details-stat"');
            expect(html).toContain('📅');
            expect(html).toContain('5 appointments');
        });

        it('should apply total class when isTotal is true', () => {
            const html = HtmlHelpers.dayDetailsStat({
                icon: '📊',
                value: '8.5h total',
                isTotal: true
            });

            expect(html).toContain('class="day-details-stat total"');
        });
    });
});
