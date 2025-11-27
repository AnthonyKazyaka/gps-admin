# Quick Start - Set Up OAuth in 5 Minutes

## What You Need

You mentioned you have:
- ✅ OAuth 2.0 Client ID
- ✅ OAuth 2.0 Client Secret

**Good news:** For this client-side app, you **only need the Client ID**!
The secret stays in Google Cloud Console and is never used in the browser.

---

## Step 1: Add Your Credentials (Choose One Method)

### Method A: Edit config.local.js (Recommended)

1. **Open the file:**
   ```bash
   # File is already created at:
   gps-admin/config.local.js
   ```

2. **Edit it and paste your Client ID:**
   ```javascript
   window.GPSConfig = {
       calendar: {
           clientId: 'PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
       },

       maps: {
           apiKey: 'PASTE_YOUR_MAPS_KEY_HERE', // Optional
       },

       app: {
           useMockData: false, // Important: Set to false for real data
           debug: true,
       }
   };
   ```

3. **Save the file**

4. **Verify it won't be committed:**
   ```bash
   git status
   # config.local.js should NOT appear (it's in .gitignore)
   ```

### Method B: Use the Settings Page

1. Open http://localhost:8080
2. Click "Settings" in the sidebar
3. Paste your Client ID in the first field
4. Click "Save API Settings"
5. Click "Connect Calendar" in the sidebar

---

## Step 2: Configure Google Cloud Console

Before OAuth will work, you need to whitelist your domain:

1. **Go to:** https://console.cloud.google.com/apis/credentials

2. **Find your OAuth 2.0 Client ID** (the one you're using)

3. **Click "Edit"**

4. **Add Authorized JavaScript origins:**
   ```
   http://localhost:8080
   ```

5. **Add Authorized redirect URIs:**
   ```
   http://localhost:8080
   ```

6. **For production later, add:**
   ```
   https://your-actual-domain.com
   ```

7. **Click "Save"**

---

## Step 3: Test It!

1. **Reload the page:**
   ```
   http://localhost:8080
   ```

2. **Click "Connect Calendar"** in the sidebar

3. **You should see:**
   - Google OAuth popup window
   - Sign-in prompt
   - Permission request screen
   - Success message
   - Your real calendar events loading!

---

## Current File Structure

```
gps-admin/
├── config.example.js      ← Template (committed to git) ✅
├── config.local.js        ← Your credentials (NOT in git) ✅
├── .gitignore            ← Protects your secrets ✅
├── DEPLOYMENT.md         ← Full deployment guide ✅
└── QUICK_START.md        ← This file ✅
```

---

## Troubleshooting

### "Invalid OAuth Client ID"
**Fix:** Add `http://localhost:8080` to Authorized JavaScript origins in Google Cloud Console

### "Popup was blocked"
**Fix:** Allow popups for localhost in your browser

### "Not seeing config.local.js changes"
**Fix:** Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### "Config file not loading"
**Fix:** Check browser console (F12) for errors. Make sure there are no syntax errors in config.local.js

---

## What About the Client Secret?

**You don't need it for this app!** Here's why:

- **Client Secret** = Used for server-side OAuth flows
- **This app** = Uses client-side OAuth (implicit flow)
- **Security model** = Domain whitelisting + user consent + short-lived tokens

The secret stays safely in Google Cloud Console and is never exposed to the browser.

### When would you need the secret?
- If you build a backend server component
- If you need server-to-server authentication
- If you use a different OAuth flow (authorization code flow)

For now, just use the Client ID! 🎉

---

## Quick Reference

### Your credentials go here:
```bash
gps-admin/config.local.js
```

### Test the app:
```bash
python3 -m http.server 8080
# Then open: http://localhost:8080
```

### Verify secrets are protected:
```bash
git status
# config.local.js should NOT appear
```

---

**You're all set!** The OAuth integration is ready to go. Just add your Client ID and test! 🚀
