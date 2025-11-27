# Genie's Pet Sitting - Administration Dashboard

A smart calendar management and workload analysis tool for pet sitting businesses.

## Overview

GPS Admin helps pet sitting professionals optimize their scheduling by:
- Analyzing calendar events to identify potential overbooking and burnout risks
- Providing quantitative metrics for decision-making on new clients
- Suggesting optimal times for breaks and vacations
- Streamlining appointment creation with intelligent templates
- Incorporating travel time automatically using Google Maps

## Key Features

### 📊 Workload Analysis
- **Burnout Detection**: Visual indicators showing high-risk periods
- **Capacity Metrics**: Real-time calculation of daily/weekly workload
- **Smart Recommendations**: Data-driven suggestions for scheduling decisions
- **Tooltip Insights**: Detailed explanations of why each time period is flagged

### 📅 Calendar Integration
- Sync with multiple Google Calendars
- Real-time event analysis
- Visual calendar with color-coded risk levels
- Week/month/custom range views

### 🎯 Appointment Templates
- **Overnights**: Multi-day pet sitting appointments
- **Drop-ins**: Configurable duration (15min, 30min, 45min, 1hr+)
- **Meet & Greets**: Initial client consultations
- **Dog Walking**: Standard or extended walks
- **Custom Templates**: Create your own appointment types

### 🗺️ Travel Time Integration
- Automatic drive time calculation via Google Maps API
- Option to include travel time in appointment duration
- Route optimization suggestions for multiple appointments
- Buffer time recommendations

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **APIs**:
  - Google Calendar API
  - Google Maps Distance Matrix API
- **Storage**: Local storage with optional cloud backup
- **Architecture**: Progressive Web App (PWA) with offline support

## Project Status

**Phase**: Initial Development (Phase 1 - MVP)
**Version**: 0.1.0
**Last Updated**: January 2025

See [PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md) for detailed development plan.

## Getting Started

### Prerequisites
- Google Cloud Project with Calendar API and Maps API enabled
- API credentials (OAuth 2.0 Client ID and API Key)

### Setup
1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Configure API credentials in Settings
4. Connect your Google Calendar(s)
5. Start analyzing your schedule!

### Configuration
On first launch, you'll need to:
1. **Authenticate**: Grant access to your Google Calendar
2. **Select Calendars**: Choose which calendars to analyze
3. **Set Preferences**: Define your work capacity thresholds
4. **Create Templates**: Set up your common appointment types

## Usage

### Analyzing Your Schedule
1. Navigate to the Calendar view
2. Color-coded indicators show workload levels:
   - 🟢 **Green**: Comfortable capacity
   - 🟡 **Yellow**: Approaching capacity
   - 🟠 **Orange**: High workload
   - 🔴 **Red**: Burnout risk
3. Hover over any day for detailed metrics

### Creating Appointments
1. Click "New Appointment" or use a template
2. Select appointment type and duration
3. Choose client/location
4. System automatically calculates travel time
5. Preview total time commitment
6. Confirm to add to calendar

### Workload Metrics
The system considers:
- **Daily Hours**: Total working hours per day
- **Travel Time**: Cumulative drive time
- **Appointment Density**: Number of appointments
- **Rest Periods**: Time between appointments
- **Weekly Load**: Rolling 7-day workload average
- **Consecutive Days**: Days worked without break

## Privacy & Data

- All data stored locally in your browser
- No external servers (except Google APIs)
- You maintain full control of your calendar data
- API credentials never shared or transmitted

## Development

### Project Structure
```
gps-admin/
├── index.html              # Main application
├── css/
│   ├── styles.css         # Core styles
│   └── calendar.css       # Calendar-specific styles
├── js/
│   ├── app.js             # Main application logic
│   ├── calendar-api.js    # Google Calendar integration
│   ├── maps-api.js        # Google Maps integration
│   ├── workload-analyzer.js # Burnout analysis algorithms
│   └── templates.js       # Appointment templates
└── docs/
    ├── PROJECT_ROADMAP.md # Development plan
    └── API_SETUP.md       # Google API configuration guide
```

### Contributing
This is a personal project, but suggestions and feedback are welcome!

## Roadmap Highlights

- **Phase 1**: MVP with basic calendar sync and workload visualization
- **Phase 2**: Advanced metrics and appointment templates
- **Phase 3**: Travel time optimization and route planning
- **Phase 4**: Client management and business analytics

See [PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md) for complete details.

## License

Private use for Genie's Pet Sitting business.

---

*Built with ❤️ for smarter pet care scheduling*
