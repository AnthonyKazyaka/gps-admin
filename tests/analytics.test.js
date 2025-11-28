/**
 * Unit Tests for Analytics and Date Calculation Methods
 */

describe('Analytics Calculations', () => {
  let app;

  beforeEach(() => {
    // Create a mock app instance with necessary methods and state
    app = {
      state: {
        events: [],
        settings: {
          thresholds: {
            daily: {
              comfortable: 6,
              busy: 8,
              high: 10,
              burnout: 12
            },
            weekly: {
              comfortable: 35,
              busy: 45,
              high: 55,
              burnout: 65
            }
          }
        }
      },

      // Date range calculation method
      getDateRange(range) {
        const now = new Date();
        let startDate, endDate;

        switch (range) {
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        return { startDate, endDate };
      },

      // Previous period calculation
      getPreviousPeriodRange(range) {
        const now = new Date();
        let prevStartDate, prevEndDate;

        switch (range) {
          case 'week':
            const thisWeekStart = new Date(now);
            thisWeekStart.setDate(now.getDate() - now.getDay());
            thisWeekStart.setHours(0, 0, 0, 0);

            prevStartDate = new Date(thisWeekStart);
            prevStartDate.setDate(thisWeekStart.getDate() - 7);
            prevEndDate = new Date(prevStartDate);
            prevEndDate.setDate(prevStartDate.getDate() + 6);
            prevEndDate.setHours(23, 59, 59, 999);
            break;
          case 'month':
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            break;
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            prevStartDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
            prevEndDate = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
            break;
          case 'year':
            prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
            prevEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            break;
        }

        return { startDate: prevStartDate, endDate: prevEndDate };
      },

      // Period comparison calculation
      calculatePeriodComparison(currentEvents, previousEvents, currentDays, previousDays) {
        // Total appointments
        const currentAppointments = currentEvents.length;
        const previousAppointments = previousEvents.length;
        const appointmentsDiff = currentAppointments - previousAppointments;
        const appointmentsPercent = previousAppointments > 0
          ? (appointmentsDiff / previousAppointments * 100)
          : 0;

        // Total hours
        const currentMinutes = currentEvents.reduce((sum, e) => sum + ((e.end - e.start) / (1000 * 60)), 0);
        const previousMinutes = previousEvents.reduce((sum, e) => sum + ((e.end - e.start) / (1000 * 60)), 0);
        const currentHours = currentMinutes / 60;
        const previousHours = previousMinutes / 60;
        const hoursDiff = currentHours - previousHours;
        const hoursPercent = previousHours > 0 ? (hoursDiff / previousHours * 100) : 0;

        // Average daily
        const currentAvgDaily = currentHours / currentDays;
        const previousAvgDaily = previousHours / previousDays;
        const avgDailyDiff = currentAvgDaily - previousAvgDaily;
        const avgDailyPercent = previousAvgDaily > 0 ? (avgDailyDiff / previousAvgDaily * 100) : 0;

        return {
          appointments: {
            current: currentAppointments,
            previous: previousAppointments,
            diff: appointmentsDiff,
            percent: appointmentsPercent,
            trend: appointmentsDiff > 0 ? 'positive' : appointmentsDiff < 0 ? 'negative' : 'neutral'
          },
          hours: {
            current: currentHours,
            previous: previousHours,
            diff: hoursDiff,
            percent: hoursPercent,
            trend: hoursDiff > 1 ? 'positive' : hoursDiff < -1 ? 'negative' : 'neutral'
          },
          avgDaily: {
            current: currentAvgDaily,
            previous: previousAvgDaily,
            diff: avgDailyDiff,
            percent: avgDailyPercent,
            trend: avgDailyDiff > 0.5 ? 'positive' : avgDailyDiff < -0.5 ? 'negative' : 'neutral'
          }
        };
      },

      // Workload level calculation
      getWorkloadLevel(hours, period = 'daily') {
        const thresholds = this.state.settings.thresholds[period];
        if (hours >= thresholds.burnout) return 'burnout';
        if (hours >= thresholds.high) return 'overload';
        if (hours >= thresholds.busy) return 'busy';
        if (hours >= thresholds.comfortable) return 'comfortable';
        return 'light';
      }
    };
  });

  describe('getDateRange', () => {
    test('should calculate week range correctly', () => {
      const result = app.getDateRange('week');

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.endDate > result.startDate).toBe(true);

      // Week should span 7 days
      const daysDiff = Math.ceil((result.endDate - result.startDate) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(7); // 7 days from start to end
    });

    test('should calculate month range correctly', () => {
      const result = app.getDateRange('month');
      const now = new Date();

      expect(result.startDate.getDate()).toBe(1);
      expect(result.startDate.getMonth()).toBe(now.getMonth());
      expect(result.startDate.getFullYear()).toBe(now.getFullYear());
    });

    test('should calculate quarter range correctly', () => {
      const result = app.getDateRange('quarter');
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);

      expect(result.startDate.getMonth()).toBe(quarter * 3);

      // Quarter should span approximately 3 months
      const monthsDiff = result.endDate.getMonth() - result.startDate.getMonth() + 1;
      expect(monthsDiff).toBe(3);
    });

    test('should calculate year range correctly', () => {
      const result = app.getDateRange('year');
      const now = new Date();

      expect(result.startDate.getMonth()).toBe(0); // January
      expect(result.endDate.getMonth()).toBe(11); // December
      expect(result.startDate.getFullYear()).toBe(now.getFullYear());
    });

    test('should default to month range for invalid input', () => {
      const result = app.getDateRange('invalid');
      const now = new Date();

      expect(result.startDate.getMonth()).toBe(now.getMonth());
    });

    test('should set start time to beginning of day', () => {
      const result = app.getDateRange('week');

      expect(result.startDate.getHours()).toBe(0);
      expect(result.startDate.getMinutes()).toBe(0);
      expect(result.startDate.getSeconds()).toBe(0);
    });

    test('should set end time to end of day', () => {
      const result = app.getDateRange('week');

      expect(result.endDate.getHours()).toBe(23);
      expect(result.endDate.getMinutes()).toBe(59);
      expect(result.endDate.getSeconds()).toBe(59);
    });
  });

  describe('getPreviousPeriodRange', () => {
    test('should calculate previous week correctly', () => {
      const current = app.getDateRange('week');
      const previous = app.getPreviousPeriodRange('week');

      // Previous week should be exactly 7 days before current week
      const daysDiff = Math.round((current.startDate - previous.startDate) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(7);
    });

    test('should calculate previous month correctly', () => {
      const previous = app.getPreviousPeriodRange('month');
      const now = new Date();

      expect(previous.startDate.getDate()).toBe(1);
      expect(previous.startDate.getMonth()).toBe(now.getMonth() - 1);
    });

    test('should calculate previous quarter correctly', () => {
      const previous = app.getPreviousPeriodRange('quarter');
      const now = new Date();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const previousQuarter = currentQuarter - 1;

      expect(previous.startDate.getMonth()).toBe(previousQuarter * 3);
    });

    test('should calculate previous year correctly', () => {
      const previous = app.getPreviousPeriodRange('year');
      const now = new Date();

      expect(previous.startDate.getFullYear()).toBe(now.getFullYear() - 1);
      expect(previous.startDate.getMonth()).toBe(0);
      expect(previous.endDate.getMonth()).toBe(11);
    });
  });

  describe('calculatePeriodComparison', () => {
    test('should calculate comparison with equal periods', () => {
      const currentEvents = [
        { start: new Date('2024-01-01T10:00'), end: new Date('2024-01-01T11:00') },
        { start: new Date('2024-01-02T10:00'), end: new Date('2024-01-02T11:00') },
      ];
      const previousEvents = [
        { start: new Date('2023-12-01T10:00'), end: new Date('2023-12-01T11:00') },
        { start: new Date('2023-12-02T10:00'), end: new Date('2023-12-02T11:00') },
      ];

      const comparison = app.calculatePeriodComparison(currentEvents, previousEvents, 7, 7);

      expect(comparison.appointments.current).toBe(2);
      expect(comparison.appointments.previous).toBe(2);
      expect(comparison.appointments.diff).toBe(0);
      expect(comparison.appointments.trend).toBe('neutral');
    });

    test('should calculate comparison with increase', () => {
      const currentEvents = [
        { start: new Date('2024-01-01T10:00'), end: new Date('2024-01-01T11:00') },
        { start: new Date('2024-01-02T10:00'), end: new Date('2024-01-02T11:00') },
        { start: new Date('2024-01-03T10:00'), end: new Date('2024-01-03T11:00') },
      ];
      const previousEvents = [
        { start: new Date('2023-12-01T10:00'), end: new Date('2023-12-01T11:00') },
      ];

      const comparison = app.calculatePeriodComparison(currentEvents, previousEvents, 7, 7);

      expect(comparison.appointments.current).toBe(3);
      expect(comparison.appointments.previous).toBe(1);
      expect(comparison.appointments.diff).toBe(2);
      expect(comparison.appointments.percent).toBe(200);
      expect(comparison.appointments.trend).toBe('positive');
    });

    test('should calculate comparison with decrease', () => {
      const currentEvents = [
        { start: new Date('2024-01-01T10:00'), end: new Date('2024-01-01T11:00') },
      ];
      const previousEvents = [
        { start: new Date('2023-12-01T10:00'), end: new Date('2023-12-01T11:00') },
        { start: new Date('2023-12-02T10:00'), end: new Date('2023-12-02T11:00') },
        { start: new Date('2023-12-03T10:00'), end: new Date('2023-12-03T11:00') },
      ];

      const comparison = app.calculatePeriodComparison(currentEvents, previousEvents, 7, 7);

      expect(comparison.appointments.current).toBe(1);
      expect(comparison.appointments.previous).toBe(3);
      expect(comparison.appointments.diff).toBe(-2);
      expect(comparison.appointments.trend).toBe('negative');
    });

    test('should calculate hours correctly', () => {
      const currentEvents = [
        { start: new Date('2024-01-01T10:00'), end: new Date('2024-01-01T12:00') }, // 2 hours
        { start: new Date('2024-01-02T10:00'), end: new Date('2024-01-02T13:00') }, // 3 hours
      ];
      const previousEvents = [
        { start: new Date('2023-12-01T10:00'), end: new Date('2023-12-01T11:00') }, // 1 hour
      ];

      const comparison = app.calculatePeriodComparison(currentEvents, previousEvents, 7, 7);

      expect(comparison.hours.current).toBe(5);
      expect(comparison.hours.previous).toBe(1);
      expect(comparison.hours.diff).toBe(4);
      expect(comparison.hours.percent).toBe(400);
      expect(comparison.hours.trend).toBe('positive');
    });

    test('should calculate average daily hours correctly', () => {
      const currentEvents = [
        { start: new Date('2024-01-01T10:00'), end: new Date('2024-01-01T17:00') }, // 7 hours
      ];
      const previousEvents = [
        { start: new Date('2023-12-01T10:00'), end: new Date('2023-12-01T13:00') }, // 3 hours
      ];

      const comparison = app.calculatePeriodComparison(currentEvents, previousEvents, 7, 7);

      expect(comparison.avgDaily.current).toBe(1); // 7 hours / 7 days
      expect(comparison.avgDaily.previous).toBeCloseTo(0.428, 2); // 3 hours / 7 days
    });

    test('should handle empty previous period', () => {
      const currentEvents = [
        { start: new Date('2024-01-01T10:00'), end: new Date('2024-01-01T11:00') },
      ];
      const previousEvents = [];

      const comparison = app.calculatePeriodComparison(currentEvents, previousEvents, 7, 7);

      expect(comparison.appointments.percent).toBe(0);
      expect(comparison.hours.percent).toBe(0);
    });

    test('should handle empty current period', () => {
      const currentEvents = [];
      const previousEvents = [
        { start: new Date('2023-12-01T10:00'), end: new Date('2023-12-01T11:00') },
      ];

      const comparison = app.calculatePeriodComparison(currentEvents, previousEvents, 7, 7);

      expect(comparison.appointments.current).toBe(0);
      expect(comparison.appointments.trend).toBe('negative');
    });
  });

  describe('getWorkloadLevel', () => {
    test('should return "light" for low hours', () => {
      expect(app.getWorkloadLevel(3, 'daily')).toBe('light');
      expect(app.getWorkloadLevel(5, 'daily')).toBe('light');
    });

    test('should return "comfortable" for moderate hours', () => {
      expect(app.getWorkloadLevel(6, 'daily')).toBe('comfortable');
      expect(app.getWorkloadLevel(7, 'daily')).toBe('comfortable');
    });

    test('should return "busy" for high hours', () => {
      expect(app.getWorkloadLevel(8, 'daily')).toBe('busy');
      expect(app.getWorkloadLevel(9, 'daily')).toBe('busy');
    });

    test('should return "overload" for very high hours', () => {
      expect(app.getWorkloadLevel(10, 'daily')).toBe('overload');
      expect(app.getWorkloadLevel(11, 'daily')).toBe('overload');
    });

    test('should return "burnout" for extreme hours', () => {
      expect(app.getWorkloadLevel(12, 'daily')).toBe('burnout');
      expect(app.getWorkloadLevel(15, 'daily')).toBe('burnout');
    });

    test('should work with weekly thresholds', () => {
      expect(app.getWorkloadLevel(30, 'weekly')).toBe('light');
      expect(app.getWorkloadLevel(35, 'weekly')).toBe('comfortable');
      expect(app.getWorkloadLevel(45, 'weekly')).toBe('busy');
      expect(app.getWorkloadLevel(55, 'weekly')).toBe('overload');
      expect(app.getWorkloadLevel(65, 'weekly')).toBe('burnout');
    });

    test('should handle edge cases at threshold boundaries', () => {
      expect(app.getWorkloadLevel(5.99, 'daily')).toBe('light');
      expect(app.getWorkloadLevel(6.0, 'daily')).toBe('comfortable');
      expect(app.getWorkloadLevel(7.99, 'daily')).toBe('comfortable');
      expect(app.getWorkloadLevel(8.0, 'daily')).toBe('busy');
    });

    test('should handle zero hours', () => {
      expect(app.getWorkloadLevel(0, 'daily')).toBe('light');
    });

    test('should handle negative hours', () => {
      expect(app.getWorkloadLevel(-1, 'daily')).toBe('light');
    });
  });
});
