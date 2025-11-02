# 🐛 Bug Report - Camera Capture Freezing Issue

## 📦 Repository Information

**Repository URL**: https://github.com/jisook325/daily-color-hunt  
**Branch**: `main`  
**Latest Commit**: `84c6ab8` - 🐛 Fix: Declare animationFrameId + Fix UI update timing  
**Deployment**: Cloudflare Pages

---

## 🏗️ Technology Stack

### Framework/Bundler
- **Framework**: Hono (v4.9.8) - Edge runtime web framework
- **Bundler**: Vite (v6.3.5)
- **Runtime**: Cloudflare Workers/Pages
- **TypeScript**: v5.0.0
- **Build Tool**: @hono/vite-build + @hono/vite-dev-server

### State Management
- **Global State**: Plain JavaScript global variables
  - `currentSession` - Current collage session object
  - `currentUser` - User ID string
  - `currentColor` - Selected color string
  - `photoCount` - Number of photos taken
  - `mediaStream` - MediaStream object
  - `videoTrack` - VideoTrack for zoom control
- **No Redux/Zustand/Recoil** - Vanilla JS state management only

### Storage
- **Primary**: Cloudflare D1 (SQLite) - Server-side database
  - Tables: `collage_sessions`, `photos`, `completed_collages`, `users`
- **Secondary**: Cloudflare R2 - Object storage for images
- **Client-side**: 
  - IndexedDB (ColorHuntSessionDB) - Safari ITP protection
  - localStorage - Session backup
  - NO file system API usage

### Camera Implementation
- **Method**: `navigator.mediaDevices.getUserMedia()` + Canvas snapshot
- **Capture Flow**:
  1. getUserMedia with `facingMode: 'environment'`
  2. Draw video to canvas with `ctx.drawImage()`
  3. Generate JPEG with `canvas.toDataURL('image/jpeg', 0.85)`
  4. Create thumbnail (200x200) with separate canvas
- **NOT using**: ImageCapture API, `<input capture>`

### Zoom Implementation
- **Hardware Zoom**: 
  - Check: `videoTrack.getCapabilities().zoom`
  - Apply: `videoTrack.applyConstraints({ advanced: [{ zoom: level }] })`
  - Fallback: CSS `transform: scale()`
- **Two-stage zoom**:
  1. Instant CSS zoom for smooth gesture
  2. Debounced hardware zoom (300ms delay)
- **Performance**: requestAnimationFrame + debouncing

### PWA Configuration
- **Manifest**: `/public/static/manifest.json`
  - `display: "standalone"`
  - `orientation: "portrait"`
  - Icons: 192x192, 512x512 (maskable)
- **Service Worker**: ❌ NO custom service worker
  - Only Cloudflare Workers (`dist/_worker.js`)
  - NO Workbox, NO client-side caching
  - NO offline support via SW
- **Cache Strategy**: Browser default + cache busting (`app.js?v=20251029-2`)

---

## 🐛 Bug Description

### Symptoms
1. **First photo**: Captures successfully, appears in slot 1
2. **Second photo**: Captures successfully  
3. **UI Issue**: First photo disappears, only second photo remains
4. **Freezing**: After capture button click, UI becomes unresponsive

### Error Messages
```javascript
app.js?v=20251029-2:1374 Uncaught ReferenceError: animationFrameId is not defined
    at stopCamera (app.js?v=20251029-2:1374:3)
    at app.js?v=20251029-2:1467:9
```

**Error occurs every photo capture**

### Reproduction Steps (100% reproducible)

**Device**: iPhone (iOS Safari) / Android (Chrome)  
**Browser**: Mobile Safari 17.x / Chrome Mobile 120.x  
**Network**: Any (local server: https://3000-xxx.e2b.dev)

1. Open app in mobile browser
2. Click "Start Hunt" → Select random color
3. Grant camera permissions
4. **First photo**:
   - Pinch-to-zoom on camera (optional)
   - Click capture button (white circle)
   - ✅ Photo appears in grid slot 1
5. Click "Take Photo" again
6. **Second photo**:
   - Pinch-to-zoom on camera (optional)
   - Click capture button
   - ❌ Slot 1 photo disappears
   - ✅ Slot 2 photo appears
   - ❌ UI freezes (cannot interact)

---

## 📊 Server Logs Analysis

### Successful Server Operations
```
Image sizes: Original=105KB, Thumbnail=11KB
Successfully saved images to R2: photos/155wqf890afmhbv6by0_original.jpg
[wrangler:info] POST /api/photo/add 200 OK (472ms)
```

**✅ Backend is working correctly**
- Photos are saved to R2 storage
- Database inserts succeed
- API returns 200 OK

**❌ Frontend has issues**
- UI not updating properly
- JavaScript errors blocking execution
- Race condition in DOM manipulation

---

## 🔍 Code Analysis

### Problem Areas Identified

#### 1. Missing Variable Declaration
**File**: `public/static/app.js:1374`
```javascript
// ❌ ERROR: animationFrameId never declared
function stopCamera() {
  // ...
  if (animationFrameId) {  // ReferenceError!
    cancelAnimationFrame(animationFrameId);
  }
}
```

**Should be**:
```javascript
// At top of file with other zoom variables
let animationFrameId = null;
```

#### 2. Race Condition in UI Updates
**File**: `public/static/app.js:1461-1473`
```javascript
async function savePhotoSimple(position, imageData, thumbnailData) {
  const response = await axios.post('/api/photo/add', {...});
  
  showSuccess('Photo saved');
  
  stopCamera(); // Immediate
  
  requestAnimationFrame(() => {
    showCollageScreen(); // Rebuilds entire DOM (226 lines)
  });
  
  setTimeout(() => {
    const slot = document.getElementById(`slot-${position}`);
    slot.innerHTML = `<img src="${thumbnailData}">`; // ❌ DOM might not exist yet!
  }, 300);
}
```

**Issue**: `getElementById` happens after `showCollageScreen()` which replaces entire `#app` innerHTML. Timing race condition.

#### 3. Heavy Synchronous DOM Rendering
**File**: `public/static/app.js:875` (showUnlimitedCollageScreen)
- **226 lines** of template literal
- Generates 15 photo slots + complex HTML
- Synchronous `app.innerHTML = ...` blocks main thread
- No progressive rendering

---

## 🎯 Root Causes

### Primary Issues
1. **Undefined Variable**: `animationFrameId` not declared
2. **Race Condition**: UI update happens before DOM is ready
3. **Blocking Rendering**: 226-line innerHTML assignment blocks thread
4. **State Desync**: Global `currentSession.photos` not updated before screen refresh

### Contributing Factors
- No UI framework (React/Vue) for efficient updates
- Manual DOM manipulation with timing dependencies
- Heavy HTML generation without chunking
- Browser aggressive caching (`app.js?v=xxx` added but may not help in-flight)

---

## 💡 Proposed Solutions

### Immediate Fixes
1. ✅ Declare `let animationFrameId = null` with zoom variables
2. ✅ Increase UI update delay (100ms → 300ms)
3. ⚠️ Still problematic - race condition remains

### Proper Solutions
1. **Update state before screen transition**:
   ```javascript
   // Update global state first
   currentSession.photos.push({...photoData});
   photoCount++;
   
   // Then rebuild UI
   showCollageScreen();
   ```

2. **Use DOM manipulation instead of innerHTML**:
   ```javascript
   const slot = document.getElementById(`slot-${position}`);
   if (slot && !slot.classList.contains('filled')) {
     slot.innerHTML = `<img...>`;
     slot.classList.add('filled');
   }
   ```

3. **Defer heavy rendering**:
   ```javascript
   requestIdleCallback(() => {
     showCollageScreen();
   }, { timeout: 500 });
   ```

4. **Consider React/Vue for reactive updates**

---

## 📝 Additional Notes

### Zoom Functionality
- ✅ Pinch-to-zoom works correctly
- ✅ Hardware zoom detection works
- ✅ CSS fallback works
- No zoom-related errors

### Network/Storage
- ✅ All API calls succeed (200 OK)
- ✅ R2 uploads work
- ✅ D1 database inserts work
- NO network errors

### Browser Compatibility
- ❌ Safari iOS (primary target) - freezing occurs
- ❌ Chrome Android - freezing occurs  
- Likely affects all mobile browsers

---

## 🔗 Related Files

- `public/static/app.js` - Main application logic (2800+ lines)
- `src/renderer.tsx` - HTML template
- `public/static/sessionDB.js` - IndexedDB wrapper
- `wrangler.jsonc` - Cloudflare configuration
- `ecosystem.config.cjs` - PM2 development server

---

**Generated**: 2025-10-29  
**Sandbox**: e2b.dev  
**Test URL**: https://3000-ixqtm590ly8ollkd242bj-6532622b.e2b.dev
