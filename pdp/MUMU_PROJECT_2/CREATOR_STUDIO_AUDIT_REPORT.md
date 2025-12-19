# 🔍 CREATOR STUDIO — STRUCTURE & FUNCTION AUDIT REPORT

**Project**: MUMU  
**Date**: 2025-01-27  
**Scope**: Complete technical and UX audit of Creator Studio  
**Purpose**: Analysis for upload experience redesign  
**Status**: ANALYSIS ONLY — No code modifications

---

## 1️⃣ FILE & ENTRY STRUCTURE

### 1.1 File Tree (Relevant Files Only)

```
public/
├── creator_studio.html          # Main Studio HTML (1,339 lines)
├── css/
│   └── creator_studio.css        # Studio styles (1,427 lines)
└── js/
    ├── creator_studio.js         # Main Studio logic (2,636 lines)
    ├── auth.js                   # Supabase Auth wrapper (229 lines)
    └── config.js                 # Supabase config (28 lines)
```

### 1.2 HTML Structure

**File**: `creator_studio.html`

**Main Sections**:

- Header (logo + branding)
- Sidebar navigation (7 views)
- Main content area with 10 view sections:
  1. Dashboard View (`#dashboard-view`)
  2. Work List View (`#work-list-view`)
  3. Work Detail View (`#work-detail-view`)
  4. Upload View (`#upload-view`) — **Step-based flow**
  5. Cut Editor View (`#cut-editor-view`)
  6. Revenue View (`#revenue-view`)
  7. Store View (`#store-view`)
  8. Analytics View (`#analytics-view`)
  9. Profile View (`#profile-view`)
  10. Approval Overlay (`#approval-overlay`)

**Upload Flow Steps** (within `#upload-view`):

- Step 0: Entry (`#upload-step-0`)
- Step 1: Work Info (`#upload-step-1`)
- Step 2: Cut Upload (`#upload-step-2`)
- Step 3: Feed Preview (`#upload-step-3`)
- Step 4: Completion (`#upload-step-4`)

### 1.3 JavaScript Entry Points

**File**: `creator_studio.js`

**Initialization Flow**:

```javascript
DOMContentLoaded
  ↓
Wait for Supabase CDN (retry loop, max 50 attempts)
  ↓
initApp()
  ↓
initializeSupabase()          // Get user, set creatorId
  ↓
initializeUpload()            // File input handlers, drag-drop
  ↓
[EARLY RETURN - Line 166]     // ⚠️ Most features disabled
  ↓
// Code below never executes:
initializeNavigation()        // ❌ Disabled
initializeProfile()           // ❌ Disabled
initializeWorkTabs()          // ❌ Disabled
initializeGenres()            // ❌ Disabled
initializeTags()              // ❌ Disabled
initializeUploadSteps()       // ❌ Disabled
setUploadStep(0)              // ❌ Disabled
loadWorks()                   // ❌ Disabled
renderAnalytics()             // ✅ Only this runs (dummy data)
```

**Critical Finding**: Line 165-166 has `return;` that disables most initialization. Only `initializeUpload()` and `renderAnalytics()` execute.

### 1.4 Execution Order Summary

**On Page Load**:

1. **Access Control Script** (inline in `creator_studio.html`, lines 1245-1335):

   - Checks Supabase Auth session
   - Queries `creators` table
   - Verifies `status === 'approved'`
   - Redirects if not approved
   - If approved, hides overlay and calls `loadStudioData()` (if exists)

2. **Main Script** (`creator_studio.js`, deferred):

   - Waits for Supabase CDN
   - Calls `initApp()`
   - Initializes Supabase client
   - Sets up upload handlers
   - **Early return prevents most features from initializing**

3. **Upload Flow** (only active feature):
   - File input handlers
   - Drag-drop handlers
   - Image compression
   - Preview rendering

---

## 2️⃣ AUTH & PERMISSION MODEL

### 2.1 Creator Authentication

**Location**: `creator_studio.html` (lines 1245-1335, inline script)

**Flow**:

```
1. Check Supabase Auth session
   ↓
2. Get current user (auth.user.id)
   ↓
3. Query creators table:
   SELECT user_id, status
   FROM creators
   WHERE user_id = auth.user.id
   ↓
4. Verify user_id matches
   ↓
5. Check status:
   - 'approved' → Allow access
   - 'pending' → Redirect to creator_pending.html
   - 'rejected' → Redirect to creator_rejected.html
   - No record → Redirect to index.html
```

**Implementation**: Inline `<script type="module">` in HTML

**Functions Used**:

- `getSession()` from `./js/auth.js`
- `getCurrentUser()` from `./js/auth.js`
- `getSupabase()` from `./js/auth.js`

### 2.2 Approval Status Checks

**Status Values**:

- `pending`: 심사 중 — Creator registered but not approved
- `approved`: 승인됨 — Creator can access Studio
- `rejected`: 반려됨 — Creator application rejected

**Access Control Location**: `creator_studio.html` lines 1308-1328

**Code**:

```javascript
if (status === "approved") {
  // Allow access
  document.getElementById("approval-overlay").style.display = "none";
  if (typeof loadStudioData === "function") {
    loadStudioData();
  }
} else if (status === "pending") {
  window.location.href = "creator_pending.html";
} else if (status === "rejected") {
  window.location.href = "creator_rejected.html";
}
```

### 2.3 Upload Gating

**Question**: Is upload currently gated by approval status?

**Answer**: **YES, but indirectly**

**Enforcement**:

- Upload UI is inside `creator_studio.html`
- Access to `creator_studio.html` requires `status === 'approved'`
- If creator is not approved, they are redirected before seeing upload UI
- **No additional check within upload flow itself**

**Location**: Upload is gated by page-level access control, not function-level.

**Potential Issue**: If upload functions are called directly (e.g., via API), there's no explicit approval check in the upload logic itself.

---

## 3️⃣ DATA MODEL (SUPABASE)

### 3.1 Tables Used by Creator Studio

#### `creators`

**Purpose**: Creator account information and approval status

**Columns Used**:

- `id` (UUID, primary key) — Matches Supabase Auth `user.id`
- `user_id` (UUID) — Referenced in access control (may be redundant with `id`)
- `status` (TEXT) — Values: `'pending'`, `'approved'`, `'rejected'`
- `author_name` (TEXT) — Creator display name
- `author_intro` (TEXT) — Creator bio
- `contact_email` (TEXT) — Contact email
- `sns_links` (TEXT) — Social media links

**Relationships**:

- `id` = Supabase Auth `user.id` (one-to-one)

**Queries**:

- Access control: `SELECT user_id, status FROM creators WHERE user_id = ?`
- Profile load: `SELECT * FROM creators WHERE id = ?`

**Issues**:

- Field confusion: Access control uses `user_id`, but `id` is primary key
- Unclear if `user_id` is redundant or serves different purpose

#### `works`

**Purpose**: Creator's uploaded works/comics

**Columns Used**:

- `id` (UUID, primary key)
- `creator_id` (UUID, FK to `creators.id`)
- `title` (TEXT, required)
- `description` (TEXT, optional)
- `genre` (TEXT) — Primary genre (legacy, for backward compatibility)
- `genres` (TEXT[] or JSON) — Array of genres (max 2)
- `tags` (TEXT[] or JSON) — Array of tags (max 10)
- `upload_mode` (TEXT) — **Values: `'cut'` (only value currently used)**
- `status` (TEXT) — Values: `'draft'`, `'under_review'`, `'approved'`, `'rejected'`, `'published'`
- `is_public` (BOOLEAN) — Public visibility flag
- `rejection_reason` (TEXT) — Admin rejection reason
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Constraints**:

- `upload_mode` — Currently hardcoded to `'cut'` in all inserts
- `status` — Enum-like constraint (exact values unclear from code)

**Relationships**:

- `creator_id` → `creators.id` (many-to-one)
- `id` → `cuts.work_id` (one-to-many)

**Queries**:

- List works: `SELECT works.*, cuts.* FROM works INNER JOIN cuts WHERE creator_id = ?`
- Create work: `INSERT INTO works (...)`
- Update work: `UPDATE works SET ... WHERE id = ?`

#### `cuts`

**Purpose**: Individual images/panels within a work

**Columns Used**:

- `id` (UUID, primary key)
- `work_id` (UUID, FK to `works.id`)
- `order_index` (INTEGER) — Display order (0-based)
- `image_url` (TEXT) — Public URL from Supabase Storage
- `width` (INTEGER) — Image width in pixels
- `height` (INTEGER) — Image height in pixels
- `is_visible` (BOOLEAN) — Visibility flag (default: `true`)
- `created_at` (TIMESTAMP)

**Missing Fields** (UI exists but not saved):

- `memo` (TEXT) — Cut memo field exists in UI but not in inserts

**Relationships**:

- `work_id` → `works.id` (many-to-one)

**Queries**:

- Create cut: `INSERT INTO cuts (work_id, order_index, image_url, width, height, is_visible)`
- Load with work: `SELECT cuts.* FROM cuts WHERE work_id = ? ORDER BY order_index`

#### `reviews`

**Purpose**: Review timeline for works

**Columns Used**:

- `work_id` (UUID, FK to `works.id`)
- `status` (TEXT) — Values: `'submitted'` (only value used in code)
- `comment` (TEXT) — Review comment
- `created_at` (TIMESTAMP)

**Queries**:

- Create review: `INSERT INTO reviews (work_id, status: 'submitted')`
- Get timeline: `SELECT * FROM reviews WHERE work_id = ? ORDER BY created_at`

### 3.2 Upload Mode

**What is `upload_mode`?**

`upload_mode` is a field in the `works` table that indicates how the work was uploaded.

**Current Values**:

- `'cut'` — **Only value currently used** (hardcoded in all inserts)

**Where Set**:

- Line 1708: `upload_mode: "cut"` (hardcoded)
- Line 1793: `upload_mode: "cut"` (hardcoded)
- Line 1881: `upload_mode: "cut"` (hardcoded)

**What Causes Upload Failures**:

1. **Constraint Violation** (Line 1718-1722):

   - Code checks for error code `23514` (PostgreSQL constraint violation)
   - If `upload_mode` has enum constraint and value doesn't match, insert fails
   - Error message: "업로드 모드 오류가 발생했습니다"

2. **Missing Field**:

   - If `upload_mode` is required (NOT NULL) and not provided, insert fails

3. **Invalid Value**:
   - If database has enum constraint and value is not `'cut'`, insert fails

**Current State**: All uploads use `'cut'` mode. No other modes are implemented.

---

## 4️⃣ CURRENT UPLOAD FLOW (AS-IS)

### 4.1 Step-by-Step Flow

**Entry Point**: User clicks "작품 업로드" button or navigates to upload view

**Step 0: Entry** (`#upload-step-0`)

- User sees: Large "+" button with "새 작품 업로드" text
- User action: Clicks button
- JS function: `initializeUploadSteps()` → `btn-new-work` click handler
- Result: `setUploadStep(1)` — Move to Step 1

**Step 1: Work Info** (`#upload-step-1`)

- User sees: Form with title, description, genre chips, tag input
- User actions:
  1. Enter title (required)
  2. Enter description (optional)
  3. Select genres (1-2 required)
  4. Add tags (0-10 optional)
- JS functions:
  - `initializeGenres()` — Genre chip selection (max 2)
  - `initializeTags()` — Tag input/preset selection (max 10)
  - `btn-next-to-cuts` click handler — Validates and moves to Step 2
- Validation:
  - Title required
  - At least 1 genre required
- Data stored: `state.selectedGenres[]`, `state.selectedTags[]`
- Result: `setUploadStep(2)` — Move to Step 2

**Step 2: Cut Upload** (`#upload-step-2`)

- User sees: Large upload area with drag-drop or file picker
- User actions:
  1. Click upload area or drag files
  2. Select multiple images (JPG, PNG only)
  3. Images are compressed and previewed
  4. Can reorder via drag-drop
  5. Can remove individual images
- JS functions:
  - `handleFileSelect()` — File input change handler
  - `handleFiles()` — Process multiple files
  - `compressImageFile()` — Compress each image (max 10MB input, 3MB output, 1440px width)
  - `renderImagePreview()` — Show preview grid
  - `initializeImageReorder()` — Drag-drop reordering
  - `removeImage()` — Remove from preview
- Data stored: `state.uploadedImages[]` (array of image objects with file, url, dimensions)
- Result: User clicks "미리보기" → `setUploadStep(3)`

**Step 3: Feed Preview** (`#upload-step-3`)

- User sees: Preview of how work will appear in feed (full-width images, no gaps)
- User actions:
  1. Review preview
  2. Click "수정하기" to go back to Step 2
  3. Click "게시하기" to publish
- JS functions:
  - `renderFeedPreview()` — Render preview from `state.uploadedImages`
  - `btn-publish` click handler → `handlePublish()`
- Result: `handlePublish()` executes

**Step 4: Completion** (`#upload-step-4`)

- User sees: Success message with completion icon
- User actions:
  1. Click "내 작품 보러가기" → Navigate to work preview
  2. Click "다음 작품 업로드" → Reset and go to work list
- JS functions:
  - `btn-view-work` → Navigate to `creator_work_preview.html?workId=...`
  - `btn-upload-next` → Reset form and show work list

### 4.2 Publish Flow (`handlePublish()`)

**Location**: `creator_studio.js` lines 1668-1770

**Order of Operations**:

```
1. Validate:
   - creatorId exists
   - Title exists
   - At least 1 image uploaded
   ↓
2. Show loading state:
   - Disable publish button
   - Change text to "업로드 중..."
   ↓
3. Get form data:
   - title, description
   - state.selectedGenres, state.selectedTags
   ↓
4. Create work record (if new):
   INSERT INTO works (
     creator_id,
     title,
     description,
     genre: state.selectedGenres[0],  // Primary genre (legacy)
     genres: state.selectedGenres,    // Array (new)
     tags: state.selectedTags,
     upload_mode: "cut",
     status: "draft",                 // ⚠️ Created as draft first
     is_public: false
   )
   ↓
5. Get workId from insert result
   ↓
6. Upload images:
   uploadImagesToSupabase(workId)
   ↓
7. Update work status:
   UPDATE works SET status = "under_review" WHERE id = workId
   ↓
8. Create review record:
   INSERT INTO reviews (work_id, status: "submitted")
   ↓
9. Move to completion step:
   setUploadStep(4)
```

**Blocking Points**:

- Image compression (can be slow for large files)
- Storage upload (network dependent)
- Database inserts (can fail on constraint violations)

**Failure Points**:

- Line 1715-1726: Work creation fails → Error shown, flow stops
- Line 1735-1738: Image upload fails → Error shown, flow stops
- Line 1740-1745: Status update fails → Work created but status wrong
- Line 1747-1750: Review creation fails → Work created but no review record

### 4.3 Image Upload Flow (`uploadImagesToSupabase()`)

**Location**: `creator_studio.js` lines 1923-2003

**Order of Operations**:

```
For each image in state.uploadedImages:
  ↓
1. Skip if imageData.cutId exists (already uploaded)
  ↓
2. Upload to Supabase Storage:
   Bucket: "works"
   Path: "{creatorId}/{workId}/{index}.webp"
   File: compressed image (WebP format)
  ↓
3. Get public URL:
   supabase.storage.from("works").getPublicUrl(filePath)
  ↓
4. Load image to get dimensions:
   Create Image object, wait for onload
  ↓
5. Create cut record:
   INSERT INTO cuts (
     work_id: workId,
     order_index: i,           // Array index
     image_url: publicUrl,
     width: img.width,
     height: img.height,
     is_visible: true
   )
  ↓
6. Update state:
   imageData.cutId = cut.id
   imageData.url = publicUrl
  ↓
7. Update DOM preview with cutId
```

**Critical Details**:

- Images are uploaded **sequentially** (one at a time)
- File extension is **always `.webp`** (compression converts to WebP)
- Storage path: `{creatorId}/{workId}/{index}.webp`
- `order_index` uses array index `i` (0-based)
- If cut insert fails, image is uploaded but not linked

---

## 5️⃣ IMAGE HANDLING

### 5.1 Image Processing on Upload

**Function**: `compressImageFile()` (lines 935-1046)

**Compression Logic**:

```
1. Validate input:
   - Max size: 10MB
   - Type: image/jpeg, image/png, image/jpg
   ↓
2. Read file as DataURL:
   FileReader.readAsDataURL(file)
   ↓
3. Load into Image object:
   img.onload → Process
   ↓
4. Calculate dimensions:
   - If width > 1440px: Scale down maintaining aspect ratio
   - Height calculated proportionally
   ↓
5. Create Canvas:
   canvas.width = newWidth
   canvas.height = newHeight
   ctx.drawImage(img, 0, 0, newWidth, newHeight)
   ↓
6. Convert to WebP (if supported):
   - Test: canvas.toDataURL("image/webp", 0.5)
   - If WebP supported: outputMimeType = "image/webp"
   - Else: Keep original format
   ↓
7. Convert to Blob:
   canvas.toBlob(blob, outputMimeType, quality: 0.8)
   ↓
8. Validate output:
   - Max size: 3MB
   - If too large: Reject with error
   ↓
9. Create File object:
   new File([blob], "{originalName}.{ext}", { type: outputMimeType })
```

**Parameters**:

- `MAX_INPUT_SIZE`: 10MB
- `MAX_OUTPUT_SIZE`: 3MB
- `MAX_WIDTH`: 1440px
- `QUALITY`: 0.8 (80%)

**File Naming**:

- Original: `{originalName}.{ext}`
- Compressed: `{originalName}.webp` (if WebP) or `{originalName}.{originalExt}`

### 5.2 Storage Bucket & Path

**Bucket**: `works`

**Path Structure**: `{creatorId}/{workId}/{index}.webp`

**Example**: `abc123/def456/0.webp`

**Implementation** (line 1936):

```javascript
const filePath = `${creatorId}/${workId}/${i}.webp`;
```

**Upload Options**:

- `cacheControl: "3600"` (1 hour cache)
- `upsert: false` (don't overwrite existing)

### 5.3 Database Storage

**What is Saved in DB**:

**`cuts` table**:

- `image_url` (TEXT) — Full public URL from Supabase Storage
- `width` (INTEGER) — Compressed image width
- `height` (INTEGER) — Compressed image height
- `order_index` (INTEGER) — Display order

**Not Saved**:

- Original file name
- Original file size
- Compression ratio
- Original dimensions (only compressed dimensions saved)

### 5.4 Original Image Preservation

**Question**: Is original image preserved?

**Answer**: **NO**

**Evidence**:

- Compression happens **before** upload
- Only compressed image is uploaded to storage
- Original file is discarded after compression
- No separate "original" storage location

### 5.5 Preview Image Generation

**Question**: Is preview image generated?

**Answer**: **NO separate preview**

**Evidence**:

- Compressed image is used directly for preview
- Preview uses same URL as final display
- No thumbnail generation
- Preview is rendered from `state.uploadedImages[].url` (DataURL from compressed file)

### 5.6 1:1 Logic

**Question**: Where does 1:1 logic currently exist (if any)?

**Answer**: **NO 1:1 logic exists**

**Evidence**:

- Images are scaled to max width 1440px
- Aspect ratio is maintained, but no 1:1 (square) enforcement
- No cropping to square
- No separate square thumbnail generation

---

## 6️⃣ UI STATES & SCREENS

### 6.1 Default / Empty State

**Location**: `#upload-step-0` (Entry step)

**HTML Section**: `creator_studio.html` lines 145-152

**JS Control**: `setUploadStep(0)` shows this step

**Visibility**: Controlled by `upload-step` `display: none/block` style

**Reachable**: ✅ Yes — Initial state when entering upload view

### 6.2 Upload in Progress

**Location**: Multiple states

**States**:

1. **Image Compression** (Step 2):

   - Shows: "이미지 최적화 중... (X / Y)" in preview item
   - HTML: `cut-preview-name` element
   - JS: Lines 1106-1110 (updates preview during compression)

2. **Publishing** (Step 3):
   - Shows: Button disabled, text "업로드 중..."
   - HTML: `#btn-publish` button
   - JS: Lines 1686-1690 (sets disabled state and text)

**Reachable**: ✅ Yes — During active upload

### 6.3 Upload Success

**Location**: `#upload-step-4` (Completion step)

**HTML Section**: `creator_studio.html` lines 424-447

**JS Control**: `setUploadStep(4)` shows this step

**Visibility**: Controlled by step display logic

**Reachable**: ✅ Yes — After successful publish

### 6.4 Error States

**Location**: `#upload-error` element

**HTML Section**: `creator_studio.html` lines 450-454

**JS Control**: `showUploadError(message)` function (lines 1396-1405)

**Error Types**:

1. **File too large**: "파일 용량이 너무 큽니다"
2. **Unsupported format**: "지원하지 않는 파일 형식입니다 (JPG, PNG만 가능)"
3. **ZIP file**: "ZIP 파일은 업로드할 수 없습니다"
4. **Network error**: "네트워크가 불안정합니다. 다시 시도해주세요"
5. **Upload mode error**: "업로드 모드 오류가 발생했습니다"
6. **Work creation error**: "작품 생성에 실패했습니다"
7. **Image upload error**: "이미지 업로드에 실패했습니다"
8. **Validation errors**: "작품 제목을 입력해주세요", "최소 1개 이상의 이미지를 업로드해주세요", etc.

**Visibility**:

- `display: block` when error occurs
- Auto-hides after 5 seconds (line 1402)

**Reachable**: ✅ Yes — When errors occur

### 6.5 Other UI States

**Work List Empty State**:

- Location: `#work-list-container`
- Shows: "등록된 작품이 없습니다" + "작품 업로드하기" button
- JS: Lines 555-569

**Image Preview Grid**:

- Location: `#image-preview-list`
- Shows: Grid of uploaded images with numbers, remove buttons
- JS: `renderImagePreview()` function

**Feed Preview**:

- Location: `#feed-preview-container`
- Shows: Full-width images matching real feed display
- JS: `renderFeedPreview()` function

---

## 7️⃣ DEAD / DISABLED FEATURES

### 7.1 Hard Disabled Features

**Location**: `creator_studio.js` line 165-166

**Code**:

```javascript
// 🚫 HARD DISABLE BELOW (DO NOT CALL)
return;

// All code below is disabled
initializeNavigation();
initializeProfile();
initializeWorkTabs();
initializeGenres();
initializeTags();
initializeUploadSteps();
setUploadStep(0);
await loadWorks();
```

**Impact**: Most Studio features are disabled. Only `initializeUpload()` and `renderAnalytics()` run.

**Status**: ⚠️ **Should remain as placeholder** — Code exists but intentionally disabled

### 7.2 Temporarily Disabled Features

**Location**: Multiple functions with early returns

**Functions**:

1. **`renderDashboard()`** (line 269-270):

   ```javascript
   // TEMPORARILY DISABLED - Silencing Supabase query errors
   return;
   ```

   - Returns dummy data instead
   - Status: Safe to delete later if not needed

2. **`getCurrentMonthPayout()`** (line 366-367):

   ```javascript
   // TEMPORARILY DISABLED - Silencing Supabase query errors
   return state.dummyData.payout;
   ```

   - Returns dummy data
   - Status: Safe to delete later

3. **`getRevenueWorks()`** (line 446-447):

   ```javascript
   // TEMPORARILY DISABLED - Silencing Supabase query errors
   return [];
   ```

   - Returns empty array
   - Status: Safe to delete later

4. **`renderRevenue()`** (line 2132-2133):

   ```javascript
   // TEMPORARILY DISABLED - Silencing Supabase query errors
   return;
   ```

   - Status: Safe to delete later

5. **`getRevenueByWork()`** (line 2206-2207):

   ```javascript
   // TEMPORARILY DISABLED - Silencing Supabase query errors
   return [];
   ```

   - Status: Safe to delete later

6. **`getSettlementHistory()`** (line 2257-2258):

   ```javascript
   // TEMPORARILY DISABLED - Silencing Supabase query errors
   return [];
   ```

   - Status: Safe to delete later

7. **`renderStore()`** (line 2290-2291):

   ```javascript
   // TEMPORARILY DISABLED - Silencing Supabase query errors
   return;
   ```

   - Status: Safe to delete later

8. **`getStoreData()`** (line 2342-2343):

   ```javascript
   // TEMPORARILY DISABLED - Silencing Supabase query errors
   return { revenue: 0, itemsSold: 0, bestSeller: "없음" };
   ```

   - Status: Safe to delete later

9. **`getFanBehavior()`** (line 2385-2386):

   ```javascript
   // TEMPORARILY DISABLED - Silencing Supabase query errors
   return [];
   ```

   - Status: Safe to delete later

10. **`getWorkGoodsConversion()`** (line 2435-2436):
    ```javascript
    // TEMPORARILY DISABLED - Silencing Supabase query errors
    return [];
    ```
    - Status: Safe to delete later

**Status**: ⚠️ **Safe to delete later** — All return early with dummy/empty data

### 7.3 UI That Exists But Has No Logic

**Cut Editor Tools**:

- Location: `creator_studio.html` lines 471-476
- UI: Buttons for "자르기", "회전", "좌우 반전", "상하 반전", "교체", "삭제"
- Logic: `handleCutTool()` (line 784-786) just logs "기능은 추후 구현 예정입니다"
- Status: ⚠️ **Should remain as placeholder** — UI ready, logic not implemented

**Cut Memo Field**:

- Location: `creator_studio.html` lines 479-486
- UI: Textarea for "컷 메모 (관리자 검토용)"
- Logic: Not saved to database (cuts insert doesn't include memo)
- Status: ⚠️ **Should remain as placeholder** — UI exists, backend not implemented

**Profile Picture Upload**:

- Location: `creator_studio.html` lines 609-645
- UI: Profile picture preview and upload button
- Logic: `initializeProfile()` is disabled (line 170)
- Status: ⚠️ **Should remain as placeholder** — Code exists but disabled

**Work Detail View**:

- Location: `#work-detail-view`
- UI: Full work detail with timeline, rejection reason
- Logic: `renderWorkDetail()` exists but may not be called (navigation disabled)
- Status: ⚠️ **Should remain as placeholder** — Code exists but navigation disabled

### 7.4 Code That Is Never Executed

**Navigation Functions**:

- `initializeNavigation()` — Disabled by early return
- `switchView()` — May not be called if navigation disabled
- `renderWorks()` — May not be called if work list not initialized

**Profile Functions**:

- `initializeProfile()` — Disabled by early return
- `loadProfile()` — May not be called

**Work Management Functions**:

- `loadWorks()` — Disabled by early return
- `renderWorkDetail()` — May not be called
- `resubmitWork()` — May not be called

**Revenue/Store Functions**:

- All revenue/store functions return early with dummy data
- UI exists but shows dummy data only

**Status**: ⚠️ **Should remain as placeholder** — Code exists for future use

---

## 8️⃣ UX PAIN POINTS (ENGINEER PERSPECTIVE)

### 8.1 Where Creators Are Likely to Get Confused

1. **No Clear Progress Indication**:

   - Image compression happens silently (only shows in preview item name)
   - No overall progress bar for multiple images
   - **Impact**: Creators don't know how long upload will take

2. **Error Messages Are Generic**:

   - "네트워크가 불안정합니다" for many error types
   - Doesn't specify which image failed
   - **Impact**: Hard to diagnose and fix issues

3. **No Draft Recovery**:

   - If upload fails partway through, work may be created but images not linked
   - No way to resume failed upload
   - **Impact**: Creators must start over

4. **Genre/Tag Limits Not Clear**:

   - Max 2 genres, max 10 tags — shown in hint text but easy to miss
   - No visual indication when limit reached
   - **Impact**: Creators try to add more and get error

5. **Image Order Confusion**:

   - Drag-drop reordering exists but not obvious
   - No clear indication that order matters
   - **Impact**: Creators may upload in wrong order

6. **Status Confusion**:
   - Work created as "draft" then immediately updated to "under_review"
   - Status may briefly show as draft
   - **Impact**: Creators may think submission failed

### 8.2 Where Too Many Decisions Are Forced

1. **Genre Selection**:

   - Must select 1-2 genres (required)
   - 12 genre options presented at once
   - **Impact**: Decision paralysis, especially for works that span genres

2. **Tag Selection**:

   - Can add up to 10 tags
   - Mix of preset tags and manual input
   - **Impact**: Creators may overthink tag selection

3. **Image Upload**:
   - Must upload all images at once (no way to add more later)
   - Must decide order upfront
   - **Impact**: Hard to iterate or make changes

### 8.3 Where Future UX Changes Would Be Hard

1. **Hardcoded Upload Mode**:

   - `upload_mode` is hardcoded to `'cut'`
   - No UI for mode selection
   - **Impact**: Adding new upload modes requires code changes in multiple places

2. **Step-Based Flow**:

   - Steps are hardcoded (0-4)
   - No way to skip steps or change order
   - **Impact**: Adding/removing steps requires refactoring

3. **Image Compression Logic**:

   - Compression parameters hardcoded (1440px, 0.8 quality, 3MB max)
   - No user control over compression
   - **Impact**: Can't adjust quality/size per use case

4. **Status Transitions**:

   - Status changes are hardcoded in functions
   - No state machine or configurable transitions
   - **Impact**: Adding new statuses or transitions requires code changes

5. **Storage Path Structure**:

   - Path format hardcoded: `{creatorId}/{workId}/{index}.webp`
   - No configuration or versioning
   - **Impact**: Can't change storage structure without migration

6. **Cut Order Logic**:
   - Uses array index for `order_index`
   - No way to handle gaps or reordering after upload
   - **Impact**: Reordering requires deleting and re-uploading

---

## 9️⃣ SUMMARY

### 9.1 Current Architecture Strengths

1. **Clear Separation of Concerns**:

   - HTML structure is well-organized
   - CSS is separate and maintainable
   - JS functions are modular

2. **Step-Based Upload Flow**:

   - Clear progression through upload steps
   - Good visual feedback at each step
   - Easy to understand flow

3. **Image Compression**:

   - Automatic compression reduces storage costs
   - WebP conversion for better performance
   - Size limits prevent abuse

4. **Access Control**:

   - Proper approval status checking
   - Redirects for unauthorized access
   - Clear separation of creator vs reader

5. **Error Handling**:
   - Error messages displayed to user
   - Validation before submission
   - Graceful failure handling

### 9.2 Biggest Technical Constraints

1. **Early Return Disables Most Features**:

   - Line 166 has `return;` that prevents most initialization
   - Only upload flow is active
   - Other features exist but don't run

2. **Mixed Authentication Systems**:

   - Access control uses Supabase Auth
   - Studio logic references Firebase Auth (though disabled)
   - Potential for ID mismatches

3. **Hardcoded Values**:

   - `upload_mode` always `'cut'`
   - Compression parameters fixed
   - Storage path structure fixed

4. **No Draft Recovery**:

   - Failed uploads leave orphaned records
   - No way to resume or clean up

5. **Sequential Image Upload**:
   - Images uploaded one at a time
   - Slow for large works
   - No parallel upload option

### 9.3 What MUST Stay Unchanged

1. **Database Schema**:

   - `works`, `cuts`, `creators`, `reviews` table structures
   - Field names and types
   - Foreign key relationships

2. **Storage Structure**:

   - Bucket name: `works`
   - Path format: `{creatorId}/{workId}/{index}.webp`
   - Public URL generation

3. **Access Control Logic**:

   - Approval status checking
   - Redirect behavior
   - Session validation

4. **Status Values**:

   - `'draft'`, `'under_review'`, `'approved'`, `'rejected'`, `'published'`
   - Status transition logic

5. **Image Compression**:
   - Compression is required (can't remove)
   - WebP conversion (can adjust but must maintain format)

### 9.4 What Is Safe to Redesign

1. **Upload Flow UI**:

   - Step order and content
   - Form layout and fields
   - Preview display

2. **Image Upload UX**:

   - Drag-drop behavior
   - Preview grid layout
   - Reordering interface

3. **Genre/Tag Selection**:

   - UI presentation
   - Selection mechanism
   - Validation feedback

4. **Error Messages**:

   - Message text and tone
   - Display location and style
   - Recovery suggestions

5. **Progress Indication**:

   - Progress bars
   - Loading states
   - Completion feedback

6. **Disabled Features**:

   - Dashboard, Revenue, Store views (currently disabled)
   - Can be redesigned or removed

7. **Cut Editor**:
   - Tools are not implemented
   - Can redesign UI and implement new logic

---

## 📋 APPENDIX: Code References

### Key File Locations

- **Access Control**: `creator_studio.html` lines 1245-1335
- **Upload Flow**: `creator_studio.js` lines 1540-1666 (step handlers), 1668-1770 (publish)
- **Image Upload**: `creator_studio.js` lines 1923-2003
- **Image Compression**: `creator_studio.js` lines 935-1046
- **Early Return**: `creator_studio.js` line 165-166
- **Disabled Features**: Multiple functions with `TEMPORARILY DISABLED` comments

### Function Index

- `initApp()` — Main initialization (line 161)
- `initializeUpload()` — Upload handlers (line 788)
- `handlePublish()` — Publish flow (line 1668)
- `uploadImagesToSupabase()` — Image upload (line 1923)
- `compressImageFile()` — Image compression (line 935)
- `setUploadStep()` — Step navigation (line 1368)
- `showUploadError()` — Error display (line 1396)

---

**Report Generated**: 2025-01-27  
**Analyst**: AI Code Review  
**Status**: Analysis Complete — No Code Changes Made  
**Next Steps**: Use this report to inform upload experience redesign
