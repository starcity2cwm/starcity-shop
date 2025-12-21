# Quick Start - Next Steps

## ⚡ 5-Minute Setup

Follow these steps IN ORDER:

---

## STEP 1: Get Your Google Apps Script URL

1. Go to https://script.google.com
2. Open your "Starcity" project
3. Click **Deploy** → **New deployment**
4. Choose type: **Web app**
5. Set:
   - Execute as: **Me**
   - Access: **Anyone**
6. Click **Deploy** → Allow permissions
7. **COPY THE URL** (looks like: `https://script.google.com/macros/s/AKfycby.../exec`)

---

## STEP 2: Update syncManager.js

1. Open: `c:\Users\STAR CITY\.gemini\starcity-shop\syncManager.js`
2. Find line 3:
   ```javascript
   this.scriptUrl = 'YOUR_GOOGLE_APPS_SCRIPT_URL';
   ```
3. Replace with YOUR URL:
   ```javascript
   this.scriptUrl = 'https://script.google.com/macros/s/YOUR-URL-HERE/exec';
   ```
4. Save file (`Ctrl+S`)

---

## STEP 3: Update Code.gs

**Good news**: I already added the code! Just copy it:

1. Open: `c:\Users\STAR CITY\.gemini\starcity-shop-project\google-apps-script\Code.gs`
2. Select all (`Ctrl+A`) and copy (`Ctrl+C`)
3. Go to https://script.google.com
4. Open your project → Click `Code.gs`
5. Select all (`Ctrl+A`) and paste (`Ctrl+V`)
6. Click **Save** (💾)

---

## STEP 4: Deploy to GitHub Pages

### If you have GitHub Desktop:

1. Open GitHub Desktop
2. **File** → **New Repository**:
   - Name: `starcity-shop`
   - Path: `C:\Users\STAR CITY\.gemini\starcity-shop`
3. **Publish repository** (top right)
4. Go to https://github.com → Your repository
5. **Settings** → **Pages**:
   - Source: **main** branch
   - Folder: **/ (root)**
   - Click **Save**
6. Wait 2 minutes, refresh page
7. **Copy your app URL**: `https://USERNAME.github.io/starcity-shop/`

### Don't have GitHub?

**Alternative - Use local testing first:**
1. Open: `c:\Users\STAR CITY\.gemini\starcity-shop\index.html`
2. Test locally in browser
3. Deploy to GitHub later

---

## STEP 5: Test the App

1. Open your GitHub Pages URL (or local index.html)
2. Press `F12` to see console
3. Login:
   - Username: `manager`
   - Password: `admin123`
4. Check if data loads from Google Sheets

**If it works**: Proceed to Step 6!
**If not**: See troubleshooting below

---

## STEP 6: Install on Phone

### Android (Chrome):
1. Open your app URL in Chrome
2. Menu ⋮ → **"Install app"**
3. Confirm

### iOS (Safari):
1. Open your app URL in Safari
2. Share button → **"Add to Home Screen"**
3. Add

---

## STEP 7: Share with Technician

Send them:
- **URL**: `https://YOUR-USERNAME.github.io/starcity-shop/`
- **Login**: `tech1` / `tech123`

They follow Step 6 to install!

---

## ⚠️ Troubleshooting

### "Data not loading"
- ✅ Check syncManager.js has correct URL
- ✅ In Google Sheets, run `setupSheets()` then `loadSampleData()`
- ✅ Redeploy Apps Script with "Anyone" access

### "Can't install on phone"
- ✅ Must use HTTPS (GitHub Pages provides this)
- ✅ On iOS, must use Safari browser
- ✅ Local files won't install (need web hosting)

### "Service Worker failed"
- ✅ Normal for localhost, works on GitHub Pages
- ✅ Check service-worker.js is in same folder as index.html

---

## 📁 Files Ready for You

I've copied everything to:
`C:\Users\STAR CITY\.gemini\starcity-shop\`

Files included:
- ✅ index.html
- ✅ styles.css
- ✅ app.js
- ✅ syncManager.js ← **UPDATE THIS (Step 2)**
- ✅ storageAdapter.js
- ✅ service-worker.js
- ✅ manifest.json

---

## 🎯 Summary

1. ✅ Get Google Apps Script URL
2. ✅ Edit syncManager.js (add your URL)
3. ✅ Copy updated Code.gs to Apps Script
4. ✅ Deploy to GitHub Pages
5. ✅ Test in browser
6. ✅ Install on phone
7. ✅ Share with technician

**Total time**: 5-10 minutes

---

## Need Detailed Help?

See the full deployment guide: `deployment_steps.md`

**You're almost there!** 🚀
