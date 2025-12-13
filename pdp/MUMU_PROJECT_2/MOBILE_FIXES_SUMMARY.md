# Mobile & Firebase Hosting Fixes - Summary

## Overview

Fixed all mobile rendering issues and Firebase hosting path problems for the MUMU_PROJECT_2 static website.

## Issues Fixed

### 1. Viewport Meta Tags

**Problem:** Mobile browsers were not properly handling viewport, causing layout issues and reload loops.

**Solution:** Updated all HTML files with proper viewport meta tags:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover"
/>
```

**Files Fixed:**

- `public/community.html`
- `public/explore.html`
- `public/signup.html`
- `public/mypage_reader.html`
- `public/mypage_creator.html`
- `public/store.html`
- `public/login.html`
- `public/upload.html`
- `public/creator_dashboard.html`
- `public/onboarding_reader.html`
- `public/feed_upload.html`
- `public/creator_feed.html`

### 2. CSS Path Fixes

**Problem:** Absolute paths like `/public/css/...` were breaking on mobile browsers and Firebase Hosting.

**Solution:** Changed all absolute paths to relative paths:

- `/public/css/...` → `./css/...` (for files inside /public)
- `/public/js/...` → `./js/...` (for files inside /public)
- `/public/assets/...` → `./assets/...` (for files inside /public)

**Files Fixed:**

- `public/store.html`
- `public/mypage_creator.html`
- `public/upload.html`
- `public/creator_dashboard.html`
- `public/onboarding_reader.html`
- `public/feed_upload.html`
- `public/creator_feed.html`

### 3. JavaScript Path Fixes

**Problem:** Image paths in JS files were missing leading `./`, causing 404 errors on mobile.

**Solution:** Fixed image paths in JavaScript files:

- `public/assets/...` → `./assets/...` (for files inside /public)

**Files Fixed:**

- `public/js/mypage_reader.js` (2 instances)
- `public/js/mypage_creator.js` (1 instance)

### 4. Image Error Handling

**Problem:** Failed image loads were causing reload loops on mobile browsers.

**Solution:** Added `onerror` handlers to prevent infinite reload loops:

```html
<img src="..." onerror="this.style.display='none'" />
```

**Files Fixed:**

- `index.html` (splash logo)
- `public/js/feed.js` (header logo)
- `public/js/community.js` (header logo)
- `public/explore.html` (header logo)

### 5. Mobile Layout CSS Fixes

**Problem:** Tabbar was not properly handling iOS safe-area-inset, causing layout issues.

**Solution:** Updated `public/css/tabbar.css`:

- Changed fixed height to `min-height: 64px`
- Improved `padding-bottom` calculation with `env(safe-area-inset-bottom)`
- Removed redundant padding values

### 6. Firebase.json Configuration

**Status:** Already correctly configured:

```json
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}
```

This configuration is correct because:

- `index.html` is at the root
- All other files are in `/public/`
- No SPA rewrites needed (pure static site)

## Path Structure Summary

### From Root (`index.html`):

- CSS: `./public/css/...`
- JS: `./public/js/...`
- Assets: `./public/assets/...`
- Components: `./public/components/...`
- Other pages: `./public/community.html`, etc.

### From Inside `/public/` (e.g., `community.html`):

- CSS: `./css/...`
- JS: `./js/...`
- Assets: `./assets/...`
- Components: `./components/...`
- Root index: `../index.html`
- Other pages: `./community.html`, etc.

## Testing Checklist

✅ All viewport meta tags updated
✅ All CSS paths fixed (relative paths)
✅ All JS paths fixed (relative paths)
✅ All image paths fixed (relative paths)
✅ Image error handling added
✅ Mobile layout CSS optimized
✅ Firebase.json verified
✅ Tabbar safe-area-inset support
✅ Header safe-area-inset support

## Expected Results

After these fixes:

1. ✅ Mobile Safari and Chrome should load all pages without errors
2. ✅ No more "반복적으로 문제가 발생했습니다" errors
3. ✅ No more reload loops
4. ✅ Header and tabbar appear on all pages
5. ✅ All images load correctly
6. ✅ All includes (header, tabbar) work properly
7. ✅ Navigation between pages works correctly

## Notes

- The project structure is correct: `index.html` at root, everything else in `/public/`
- All paths are now relative, which works correctly on both desktop and mobile
- Mobile browsers are stricter about path resolution, so relative paths are essential
- The `viewport-fit=cover` ensures proper display on devices with notches (iPhone X+)
- Safe-area-inset CSS variables ensure content doesn't overlap with system UI
