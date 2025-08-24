# webOS Deployment Guide

## Issue Resolution: `ares-package` Minification Errors

### Problem
The `ares-package` tool was failing with minification errors on `electron-portal-test.js`:
```
ares-package ERR! [Tips]: Failed to minify code. Please check the source code <electron-portal-test.js>
```

### Root Cause
The `electron-portal-test.js` file contained Node.js-specific code (`module.exports`, `typeof module`) that the webOS packaging tool's minifier couldn't handle.

### Solution
1. **Created webOS-compatible version**: `webos-portal-test.js` without Node.js dependencies
2. **Updated index.html**: Now uses the webOS-compatible version instead of the Electron version
3. **Added .webosignore**: Excludes Electron-specific files from webOS packaging
4. **Created packaging script**: `prepare-webos.sh` that creates a clean build for webOS

## Quick Fix Steps

### Option 1: Use the Prepared Build (Recommended)
```bash
# Prepare clean webOS build
./prepare-webos.sh

# Package for webOS
cd webos-build
ares-package .
```

### Option 2: Manual Packaging with No-Minify
If minification still causes issues:
```bash
cd webos-build
ares-package . --no-minify
```

### Option 3: Exclude Problematic Files
If using the original directory:
```bash
# Create/update .webosignore to exclude:
echo "electron-portal-test.js" >> .webosignore
echo "electron-main.js" >> .webosignore
echo "node_modules/" >> .webosignore
echo "*.md" >> .webosignore

# Then package
ares-package .
```

## Issue Resolution: "API not enabled" Error

### Problem
After clicking login, the app displays "API not enabled" in LG webOS emulator 6.0.0.

### Root Cause
1. Portal servers may not be accessible from the emulator environment
2. Portal error messages were not being displayed properly
3. Missing required parameters in the handshake request

### Solution
Enhanced the authentication system to:
1. **Better error handling**: Now displays actual portal error messages instead of generic "No token received"
2. **Improved parameters**: Added required Stalker portal parameters (`type=stb`, `action=handshake`, etc.)
3. **Enhanced endpoints**: Added more comprehensive portal endpoint patterns

### Troubleshooting Steps

#### 1. Check Network Connectivity
The webOS emulator may have network restrictions:
```javascript
// Open browser console in emulator and test:
fetch('http://play.b4u.live/stalker_portal/server/load.php?type=stb&action=handshake&mac=AA:7A:10:57:C1:00')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
```

#### 2. Try Different Portal URLs
Test with portals that might be more accessible:
```
http://play.b4u.live
http://glotv.me  
http://play.suntv.biz
```

#### 3. Check Console for Detailed Errors
The improved error handling now shows:
- Actual portal error messages
- Portal response details
- Specific authentication failures

#### 4. Test on Real webOS Device
The emulator may have restrictions that don't exist on real webOS TVs:
```bash
# Deploy to real device
ares-setup-device --add webos-tv --host <TV_IP>
ares-install com.iptv.webos_1.0.0_all.ipk --device webos-tv
ares-launch com.iptv.webos --device webos-tv
```

## Expected Behavior After Fixes

### Successful Packaging
✅ `ares-package .` should complete without minification errors
✅ Generated IPK file should install correctly
✅ App should launch on webOS emulator/device

### Improved Error Messages
❌ Instead of: "No token received from portal"
✅ Now shows: "Portal Error: API not enabled" (or actual portal message)

### Better Authentication Flow
✅ Tries multiple endpoint patterns automatically
✅ Uses proper Stalker portal parameters
✅ Provides detailed logging in console

## Development vs Production

### For Development (Electron)
```bash
npm run electron
# Uses electron-portal-test.js with full Node.js features
```

### For webOS Deployment
```bash
./prepare-webos.sh
cd webos-build
ares-package .
# Uses webos-portal-test.js (browser-compatible)
```

## Testing Commands

```bash
# Test minification
npx terser webos-portal-test.js -o test.min.js

# Test packaging
./prepare-webos.sh
cd webos-build && ares-package .

# Test installation
ares-install *.ipk --device <device-name>

# Test launch
ares-launch com.iptv.webos --device <device-name>
```