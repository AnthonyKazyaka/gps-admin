# GPS Admin - Deployment Guide

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [OAuth Configuration](#oauth-configuration)
3. [Secrets Management](#secrets-management)
4. [Deployment Options](#deployment-options)
5. [CI/CD Pipeline Integration](#cicd-pipeline-integration)

---

## Local Development Setup

### 1. Configure Your API Credentials

**You have your credentials ready! Here's how to use them:**

#### Edit `config.local.js`:

```javascript
window.GPSConfig = {
    calendar: {
        clientId: 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com',
        // NOTE: Client Secret is NOT needed for client-side OAuth!
        // The secret stays in Google Cloud Console and is never used in the browser
    },

    maps: {
        apiKey: 'YOUR_ACTUAL_MAPS_API_KEY',
    },

    app: {
        useMockData: false, // Set to false to use real APIs
        debug: true,
    }
};
```

#### Alternative: Use the Settings Page

1. Open http://localhost:8080
2. Go to Settings (bottom of sidebar)
3. Enter your OAuth Client ID
4. Enter your Maps API Key
5. Click "Save API Settings"
6. Settings are stored in browser LocalStorage

### 2. Test OAuth Connection

1. Click "Connect Calendar" in the sidebar
2. You'll be redirected to Google OAuth consent screen
3. Sign in and grant permissions
4. You'll be redirected back to the app
5. Your real calendar events will load!

---

## OAuth Configuration

### Understanding OAuth 2.0 for Client-Side Apps

**Important:** This app uses **OAuth 2.0 Implicit Flow** which is designed for client-side JavaScript applications.

#### What You Need:
- ✅ **OAuth 2.0 Client ID** (you have this)
- ❌ **Client Secret** (NOT used in browser apps - it stays in Google Cloud Console)

#### Why No Secret?
The client secret would be visible in the browser's source code, which defeats its purpose. Google's OAuth for JavaScript uses a different security model:
- Your domain is whitelisted in Google Cloud Console
- OAuth flow happens via popup/redirect
- Tokens are short-lived and scope-limited
- User must explicitly grant permission

### Google Cloud Console Setup

1. **Create OAuth 2.0 Client ID:**
   - Go to https://console.cloud.google.com/apis/credentials
   - Create credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:8080` (for development)
     - `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:8080`
     - `https://yourdomain.com`

2. **Enable APIs:**
   - Google Calendar API
   - Google Maps Distance Matrix API (optional, for travel time)

3. **Configure OAuth Consent Screen:**
   - User type: External (for testing) or Internal (for Google Workspace)
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events`

---

## Secrets Management

### ⚠️ Security Best Practices

**NEVER commit secrets to git!**

The `.gitignore` is already configured to exclude:
- `config.local.js` (your actual credentials)
- `.env` and `.env.local` files
- `secrets.js`
- `credentials.json`

### File Structure:

```
gps-admin/
├── config.example.js      ← Committed to git (template)
├── config.local.js        ← NOT in git (your real credentials)
└── .gitignore             ← Ensures config.local.js is never committed
```

### For Team Collaboration:

1. **Share `config.example.js`** - This is committed to git
2. **Each developer creates their own `config.local.js`**
3. **Use different OAuth Client IDs for dev/staging/production**

---

## Deployment Options

### Option 1: Static Hosting (Recommended)

Best for: Simple deployment, low cost

**Platforms:**
- **Netlify** (easiest)
- **Vercel**
- **GitHub Pages**
- **Cloudflare Pages**
- **AWS S3 + CloudFront**

#### Netlify Deployment Example:

1. **Push code to GitHub** (config.local.js won't be included due to .gitignore)

2. **Create Netlify site:**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli

   # Deploy
   netlify deploy --dir=gps-admin --prod
   ```

3. **Configure Environment Variables in Netlify:**
   - Go to Site settings → Environment variables
   - Add:
     - `CALENDAR_CLIENT_ID`: Your OAuth Client ID
     - `MAPS_API_KEY`: Your Maps API Key

4. **Create build script** (optional):

   Create `gps-admin/build.sh`:
   ```bash
   #!/bin/bash
   # Generate config from environment variables
   cat > config.local.js << EOF
   window.GPSConfig = {
       calendar: { clientId: '${CALENDAR_CLIENT_ID}' },
       maps: { apiKey: '${MAPS_API_KEY}' },
       app: { useMockData: false, debug: false }
   };
   EOF
   ```

5. **Update `netlify.toml`:**
   ```toml
   [build]
     command = "cd gps-admin && chmod +x build.sh && ./build.sh"
     publish = "gps-admin"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

### Option 2: GitHub Pages

1. **Create deployment script** `deploy-gh-pages.sh`:
   ```bash
   #!/bin/bash
   # Build config (manually or from environment)
   # WARNING: Never commit the generated file!

   # Deploy to gh-pages branch
   git subtree push --prefix gps-admin origin gh-pages
   ```

2. **Important:** GitHub Pages URLs must be whitelisted in Google Cloud Console

### Option 3: Self-Hosted (VPS/Server)

1. **Use nginx or Apache to serve static files**
2. **Store secrets in environment variables**
3. **Use a startup script to generate config.local.js**

Example nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/gps-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## CI/CD Pipeline Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy GPS Admin

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Generate config from secrets
      run: |
        cat > gps-admin/config.local.js << EOF
        window.GPSConfig = {
            calendar: { clientId: '${{ secrets.CALENDAR_CLIENT_ID }}' },
            maps: { apiKey: '${{ secrets.MAPS_API_KEY }}' },
            app: { useMockData: false, debug: false }
        };
        EOF

    - name: Deploy to Netlify
      uses: netlify/actions/cli@master
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
      with:
        args: deploy --dir=gps-admin --prod
```

### Setting Up GitHub Secrets:

1. Go to your repo → Settings → Secrets and variables → Actions
2. Add repository secrets:
   - `CALENDAR_CLIENT_ID`: Your OAuth Client ID
   - `MAPS_API_KEY`: Your Maps API Key
   - `NETLIFY_AUTH_TOKEN`: Your Netlify token
   - `NETLIFY_SITE_ID`: Your Netlify site ID

---

## Environment-Specific Configurations

### Development
- Use `config.local.js` with localhost OAuth origins
- `useMockData: false` to test with real APIs
- `debug: true` for console logging

### Staging
- Separate OAuth Client ID for staging domain
- Environment variables in CI/CD
- `debug: true` for testing

### Production
- Production OAuth Client ID
- Environment variables in CI/CD
- `debug: false` to reduce console noise
- Enable HTTPS (required for OAuth)

---

## Quick Start Commands

### Local Development:
```bash
# 1. Edit config.local.js with your credentials
# 2. Start server
python3 -m http.server 8080

# 3. Open browser
# http://localhost:8080
```

### Deploy to Netlify:
```bash
# First time setup
netlify init

# Deploy
netlify deploy --prod
```

### Deploy to GitHub Pages:
```bash
git subtree push --prefix gps-admin origin gh-pages
```

---

## Troubleshooting

### "OAuth popup blocked"
- Allow popups for your domain
- Check browser console for errors

### "Invalid client ID"
- Verify client ID is correct in config.local.js
- Check authorized JavaScript origins in Google Cloud Console
- Make sure your domain matches exactly (including http/https)

### "Calendar events not loading"
- Check browser console for API errors
- Verify Calendar API is enabled in Google Cloud
- Check OAuth scopes include calendar permissions

### "Config not loading"
- Check browser console for JavaScript errors
- Verify config.local.js is being loaded (Network tab in DevTools)
- Make sure config.local.js has valid JavaScript syntax

---

## Security Checklist

- ✅ `.gitignore` includes `config.local.js`
- ✅ Never commit API keys to version control
- ✅ Use environment variables in CI/CD
- ✅ Different credentials for dev/staging/prod
- ✅ HTTPS enabled in production
- ✅ OAuth redirect URIs properly configured
- ✅ Regularly rotate API keys
- ✅ Monitor Google Cloud Console for unusual activity

---

## Need Help?

- **Google OAuth Documentation:** https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow
- **Google Calendar API:** https://developers.google.com/calendar/api/guides/overview
- **Google Maps API:** https://developers.google.com/maps/documentation/distance-matrix/overview

---

**Last Updated:** November 9, 2025
**Version:** 1.0.0
