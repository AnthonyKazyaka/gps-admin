# Google API Setup Guide

This guide walks you through setting up the required Google APIs for GPS Admin.

## Prerequisites
- A Google account
- Access to Google Cloud Console

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `GPS Admin` (or your preferred name)
4. Click "Create"
5. Wait for project creation, then select your new project

---

## Step 2: Enable Required APIs

### Enable Google Calendar API

1. In Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on "Google Calendar API"
4. Click **Enable**
5. Wait for activation

### Enable Google Maps APIs

1. Still in **APIs & Services** → **Library**
2. Search for "Distance Matrix API"
3. Click on "Distance Matrix API"
4. Click **Enable**
5. Repeat for "Maps JavaScript API" (optional, for future map visualizations)

---

## Step 3: Create OAuth 2.0 Credentials

### Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have Google Workspace)
3. Click **Create**

4. Fill in required fields:
   - **App name**: GPS Admin
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **Save and Continue**

6. **Scopes** section:
   - Click **Add or Remove Scopes**
   - Search for "Google Calendar API"
   - Select:
     - `.../auth/calendar` (See, edit, share, and permanently delete calendars)
     - `.../auth/calendar.events` (View and edit events)
   - Click **Update**
   - Click **Save and Continue**

7. **Test users** (while in testing mode):
   - Click **Add Users**
   - Add your Google email address
   - Click **Save and Continue**

8. Review and click **Back to Dashboard**

### Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Name: `GPS Admin Web Client`

5. **Authorized JavaScript origins**:
   - For local development, add:
     - `http://localhost`
     - `http://localhost:8080`
     - `http://127.0.0.1`
   - For production, add your domain:
     - `https://yourdomain.com`

6. **Authorized redirect URIs**:
   - For local development:
     - `http://localhost/oauth2callback`
     - `http://localhost:8080/oauth2callback`
   - For production:
     - `https://yourdomain.com/oauth2callback`

7. Click **Create**

8. **Save Your Credentials**:
   - A dialog will show your Client ID and Client Secret
   - Copy the **Client ID** - you'll need this
   - Click **OK**

---

## Step 4: Create API Key (for Maps API)

1. In **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the generated API key
4. Click **Restrict Key** (recommended)

5. **API restrictions**:
   - Select "Restrict key"
   - Check:
     - Distance Matrix API
     - Maps JavaScript API (if enabled)
   - Click **Save**

6. **Application restrictions** (optional but recommended):
   - Select "HTTP referrers"
   - Add:
     - `localhost/*`
     - `yourdomain.com/*`
   - Click **Save**

---

## Step 5: Configure GPS Admin

### Add Credentials to Application

1. Open GPS Admin in your browser
2. Click **Settings** → **API Configuration**
3. Enter your credentials:
   - **Google Calendar OAuth Client ID**: Paste your OAuth Client ID
   - **Google Maps API Key**: Paste your API key
4. Click **Save**

### Test Connection

1. Click **Connect Calendar**
2. You'll be redirected to Google sign-in
3. Select your Google account
4. Review permissions and click **Allow**
5. You'll be redirected back to GPS Admin
6. Your calendars should now appear

---

## Troubleshooting

### "Access blocked: This app's request is invalid"
- Ensure OAuth consent screen is configured
- Check that redirect URIs match exactly (including protocol and port)
- Make sure you're accessing the app from an authorized origin

### "The OAuth client was not found"
- Verify you're using the correct Client ID
- Ensure the project is selected in Cloud Console

### "This app isn't verified"
- Click "Advanced" → "Go to GPS Admin (unsafe)"
- This is expected for personal projects not submitted for verification
- Safe to proceed if it's your own app

### Calendar API Returns 403 Error
- Verify Google Calendar API is enabled
- Check OAuth scopes include calendar access
- Ensure access token hasn't expired

### Maps API Not Working
- Verify Distance Matrix API is enabled
- Check API key is correct and has proper restrictions
- Ensure billing is enabled (Google requires it, but has free tier)

---

## Important Notes

### Billing
- Google Cloud requires billing to be enabled for Maps APIs
- **Free tier includes**:
  - Calendar API: Free unlimited
  - Distance Matrix API: $5/month credit (covers ~1,000 requests)
- Monitor usage in Cloud Console to avoid unexpected charges

### API Quotas
- **Calendar API**: 1,000,000 requests/day (more than enough)
- **Distance Matrix API**:
  - Free tier: 40,000 elements/month
  - Element = one origin-destination pair
  - Example: 1 route calculation with 2 locations = 1 element

### Security Best Practices
1. **Never commit credentials** to version control
2. Use API restrictions to limit key usage
3. Monitor API usage regularly
4. Rotate keys periodically
5. Keep OAuth client secret secure (don't share)

### Publishing Your App
If you want others to use GPS Admin:
1. Complete OAuth consent screen verification
2. Submit for Google's app verification
3. Deploy to a secure HTTPS domain
4. Update authorized origins/redirects

---

## Quick Reference

### Required Credentials
```javascript
// Store these securely in your application
const config = {
  googleCalendarClientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  googleMapsApiKey: 'YOUR_API_KEY'
};
```

### Required Scopes
```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
```

### Useful Links
- [Google Cloud Console](https://console.cloud.google.com/)
- [Calendar API Documentation](https://developers.google.com/calendar/api)
- [Distance Matrix API Documentation](https://developers.google.com/maps/documentation/distance-matrix)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

## Local Development Setup

### Simple HTTP Server
Since OAuth requires proper origins, use a local server (not `file://`):

**Using Python:**
```bash
# Python 3
cd gps-admin
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

**Using Node.js:**
```bash
npm install -g http-server
cd gps-admin
http-server -p 8080
```

**Using PHP:**
```bash
cd gps-admin
php -S localhost:8080
```

Then access: `http://localhost:8080`

---

*Last Updated: January 2025*
*For issues or questions, consult Google Cloud documentation or GPS Admin support*
