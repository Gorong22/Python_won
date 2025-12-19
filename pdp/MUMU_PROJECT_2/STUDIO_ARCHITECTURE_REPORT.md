# Creator Studio Architecture Report

**Project**: MUMU  
**Date**: 2025-01-27  
**Scope**: Creator Studio Implementation Analysis

---

## Executive Summary

This report analyzes the current Creator Studio implementation in the MUMU project. The Studio provides creators with tools to manage works, upload content, track revenue, and handle the approval workflow. The analysis identifies the current data flow, component structure, and potential gaps or mismatches between frontend logic and database structure.

**Key Findings:**

- ✅ Core Studio structure is in place
- ⚠️ Mixed authentication systems (Firebase + Supabase)
- ⚠️ Status transition logic has inconsistencies
- ⚠️ Cut upload flow exists but may have edge cases
- ⚠️ Some database queries use incorrect field mappings

---

## 1. Component Inventory

### 1.1 Pages/Components

#### Primary Studio Page

- **File**: `public/creator_studio.html`
- **Purpose**: Main Creator Studio interface
- **Views**:
  1. Dashboard (대시보드)
  2. Work List (작품 관리)
  3. Work Detail (작품 상세)
  4. Upload Mode Selection (업로드 모드 선택)
  5. Upload Screen (업로드 화면)
  6. Cut Editor (컷 편집)
  7. Revenue (수익)
  8. Store Analytics (스토어 분석)
  9. Analytics (통계)
  10. Profile Settings (프로필 설정)

#### Supporting Pages

- **File**: `public/onboarding_creator.html`
  - Creator registration/onboarding
  - Creates Supabase Auth user + `creators` record
  - Sets initial status to `pending`

#### JavaScript Logic

- **File**: `public/js/creator_studio.js` (1,809 lines)

  - Main Studio logic
  - Supabase integration
  - State management
  - UI rendering

- **File**: `public/js/auth.js`
  - Supabase Auth wrapper
  - User session management
  - Email transformation (`user_id+mumu@gmail.com`)

### 1.2 Access Control

**Location**: `creator_studio.html` (lines 603-693)

**Flow**:

1. Check Supabase Auth session
2. Get current user
3. Query `creators` table by `user_id`
4. Verify `creators.status === 'approved'`
5. Redirect based on status:
   - `approved` → Allow access
   - `pending` → Redirect to `creator_pending.html`
   - `rejected` → Redirect to `creator_rejected.html`
   - No record → Redirect to `index.html`

**Note**: Uses Supabase Auth, but `creator_studio.js` also references Firebase Auth (line 93-99), creating confusion.

---

## 2. Data Flow Analysis

### 2.1 Authentication Flow

```
User Login
  ↓
Supabase Auth (via auth.js)
  ↓
Session Created
  ↓
creator_studio.html Access Control
  ↓
Query creators table (user_id = auth.user.id)
  ↓
Check creators.status
  ↓
Allow/Deny Studio Access
```

**Issues Identified**:

- **Mixed Auth Systems**: `creator_studio.js` line 93-99 references Firebase Auth (`getFirebaseUser()`, `window.firebase.auth()`), but the access control uses Supabase Auth
- **Creator ID Mismatch**: `creator_studio.js` uses `creatorId = firebaseUser.uid` (line 95), but should use Supabase Auth user ID
- **Inconsistent Initialization**: `initializeSupabase()` tries to get Firebase user, but Studio access control uses Supabase Auth

### 2.2 Work Creation Flow

**Location**: `creator_studio.js` functions `handleFormSubmit()` and `handleSaveDraft()`

**Current Flow**:

```
1. User fills upload form
   ↓
2. Selects images (drag-drop or file picker)
   ↓
3. Images stored in state.uploadedImages (client-side)
   ↓
4. User clicks "심사 제출" or "임시저장"
   ↓
5. handleFormSubmit() or handleSaveDraft()
   ↓
6. Create work record:
   - INSERT INTO works (
       creator_id,
       title,
       description,
       genre,
       upload_mode,
       status,  // 'draft' for save, 'under_review' for submit
       is_public
     )
   ↓
7. uploadImagesToSupabase(workId)
   ↓
8. For each image:
   a. Upload to Supabase Storage: works/{creatorId}/{workId}/{index}.{ext}
   b. Get public URL
   c. INSERT INTO cuts (
        work_id,
        order_index,
        image_url,
        width,
        height,
        is_visible
      )
   ↓
9. If submitting (not draft):
   - UPDATE works SET status = 'under_review'
   - INSERT INTO reviews (work_id, status: 'submitted')
```

**Status Transitions**:

- **Draft Save**: `status = 'draft'` (no review record)
- **Submit for Review**: `status = 'draft'` → `status = 'under_review'` + review record created
- **Re-submit**: `status = 'rejected'` → `status = 'under_review'` + new review record

**Issues Identified**:

1. **Initial Status Bug**: Line 1137 creates work with `status: 'draft'` even when submitting, then updates to `under_review` (line 1155-1159). This creates a brief `draft` state.
2. **Missing Validation**: No check if images are uploaded before creating work
3. **Cut Order**: Uses array index (`i`) for `order_index`, but doesn't account for existing cuts if updating

### 2.3 Work Listing Flow

**Location**: `creator_studio.js` function `loadWorks()`

**Current Flow**:

```
1. Query works with cuts:
   SELECT works.*, cuts.*
   FROM works
   INNER JOIN cuts ON cuts.work_id = works.id
   WHERE works.creator_id = creatorId
   ORDER BY works.created_at DESC
   ↓
2. Transform data:
   - Filter cuts by is_visible !== false
   - Sort cuts by order_index
   - Map cuts to work.images array
   ↓
3. Render in UI (filtered by status tabs)
```

**Status Filtering** (line 515-531):

- `public`: `status === 'published' || is_public === true`
- `review`: `status === 'under_review'`
- `rejected`: `status === 'rejected'`
- `draft`: `status === 'draft'`

**Issues Identified**:

1. **Status Mapping Inconsistency**: Frontend uses `under_review`, but `getStatusText()` also maps `pending` to "심사 중" (line 604-612)
2. **Public Filter Logic**: Checks both `status === 'published'` OR `is_public === true`, which may not match database schema expectations
3. **Missing Status**: No handling for `approved` status (work approved but not yet published)

### 2.4 Cut Upload & Linking Flow

**Location**: `creator_studio.js` function `uploadImagesToSupabase()`

**Current Flow**:

```
1. For each image in state.uploadedImages:
   ↓
2. Skip if imageData.cutId exists (already uploaded)
   ↓
3. Upload file to Supabase Storage:
   - Bucket: 'works'
   - Path: {creatorId}/{workId}/{index}.{ext}
   ↓
4. Get public URL from storage
   ↓
5. Load image to get dimensions (img.width, img.height)
   ↓
6. INSERT INTO cuts:
   - work_id: workId
   - order_index: i (array index)
   - image_url: publicUrl
   - width: img.width
   - height: img.height
   - is_visible: true
   ↓
7. Update state.uploadedImages[i].cutId = cut.id
   ↓
8. Update DOM preview item with cutId
```

**Issues Identified**:

1. **Order Index Logic**: Uses array index `i`, but if updating existing work, should account for existing cuts
2. **No Error Recovery**: If cut insert fails, image is uploaded but not linked
3. **Storage Path**: Uses `{creatorId}/{workId}/{index}.{ext}`, but `creatorId` may be Firebase UID (incorrect) instead of Supabase user ID
4. **Duplicate Prevention**: Only checks `imageData.cutId`, but doesn't check if cut already exists in database for this work

### 2.5 Status Transition Flow

**Current Status Values** (from code analysis):

- `draft`: 임시저장
- `under_review`: 심사 중
- `pending`: 심사 중 (legacy?)
- `approved`: 승인됨
- `rejected`: 반려됨
- `published`: 발행됨

**Transitions**:

```
draft → under_review (on submit)
  ↓
under_review → approved (admin action, not in Studio)
  ↓
approved → published (admin action, not in Studio)
  ↓
rejected → under_review (on resubmit)
```

**Issues Identified**:

1. **Missing Admin Transitions**: Studio doesn't handle `approved` → `published` transition
2. **Status Confusion**: Both `pending` and `under_review` exist in code, unclear which is correct
3. **No Status History**: Reviews table tracks timeline, but status changes aren't fully logged
4. **Rejection Handling**: `rejection_reason` stored in `works` table, but no clear update path when resubmitting

---

## 3. Database Schema Mapping

### 3.1 Tables Used

#### `creators`

- **Fields Used**:

  - `id` (primary key, matches Supabase Auth user.id)
  - `user_id` (referenced in access control, but may be redundant with `id`)
  - `status` ('pending', 'approved', 'rejected')
  - `author_name`, `author_intro`, `contact_email`, `sns_links` (profile)

- **Issues**:
  - Access control queries `user_id` (line 644), but `creator_studio.js` uses `id` (line 124, 130)
  - Inconsistent field usage

#### `works`

- **Fields Used**:

  - `id`, `creator_id`, `title`, `description`, `genre`
  - `status` ('draft', 'under_review', 'approved', 'rejected', 'published')
  - `is_public`, `upload_mode`, `rejection_reason`
  - `created_at`

- **Issues**:
  - Status values may not match database enum/constraints
  - `rejection_reason` field exists but unclear when/how it's set

#### `cuts`

- **Fields Used**:

  - `id`, `work_id`, `order_index`, `image_url`
  - `width`, `height`, `is_visible`

- **Issues**:
  - No `memo` field in insert (line 1226-1233), but UI has cut memo field (line 299-305)
  - Cut editor tools (crop, rotate, flip) not implemented (line 762-764)

#### `reviews`

- **Fields Used**:

  - `work_id`, `status` ('submitted'), `comment`, `created_at`

- **Issues**:
  - Only `submitted` status used, unclear if other statuses exist
  - Timeline rendering assumes `status === 'submitted'` means "제출 완료" (line 718)

#### `earnings`

- **Fields Used**:

  - `creator_id`, `work_id`, `amount`, `created_at`

- **Queries**: Joined with `works` to get work titles

#### `settlements`

- **Fields Used**:
  - `creator_id`, `month`, `year`, `status`, `expected_amount`, `total_revenue`, `platform_fee`, `payout_date`

### 3.2 Field Mismatches

1. **Creator ID Field**:

   - Access control: `creators.user_id`
   - Studio logic: `creators.id`
   - **Resolution Needed**: Clarify which field is primary key

2. **Cut Memo Field**:

   - UI has input for cut memo (line 299-305)
   - Database insert doesn't include memo
   - **Resolution Needed**: Add `memo` field to cuts insert or remove UI

3. **Status Values**:
   - Frontend uses: `draft`, `under_review`, `pending`, `approved`, `rejected`, `published`
   - Unclear which are valid in database
   - **Resolution Needed**: Verify database enum/constraints

---

## 4. Missing or Broken Flows

### 4.1 Missing Flows

1. **Work Update Flow**:

   - Can update work metadata (title, description, genre) when editing draft
   - Cannot update images after initial upload
   - Cannot change cut order after upload (UI has drag-drop, but `updateCutOrder()` only works if `currentWorkId` exists)

2. **Cut Editing Flow**:

   - Cut editor UI exists (crop, rotate, flip tools)
   - Tools not implemented (`handleCutTool()` just logs message)
   - No way to save edited cuts back to storage

3. **Status Transition Notifications**:

   - No real-time updates when work status changes
   - Creator must refresh to see status updates

4. **Image Replacement**:

   - UI has "교체" (replace) button in cut editor
   - Not implemented

5. **Cut Deletion**:
   - Can remove from preview during upload
   - Cannot delete cuts from existing works

### 4.2 Broken Flows

1. **Authentication Initialization**:

   - `creator_studio.js` tries to use Firebase Auth (line 93-99)
   - But access control uses Supabase Auth
   - **Result**: `creatorId` may be wrong, causing data access issues

2. **Work Creation with Existing Cuts**:

   - If updating existing draft work, `uploadImagesToSupabase()` doesn't check for existing cuts
   - May create duplicate cuts or wrong order_index

3. **Status Filter Logic**:

   - Public filter checks `status === 'published' || is_public === true`
   - But `is_public` is a boolean, not a status
   - May show works that aren't actually published

4. **Review Timeline**:
   - Assumes `reviews.status === 'submitted'` means "제출 완료"
   - But review status may have other values (approved, rejected)
   - Timeline may not show full review history

---

## 5. Frontend-Backend Mismatches

### 5.1 Status Handling

**Frontend Expectations**:

- `getStatusText()` maps: `pending`, `under_review` → "심사 중"
- Work list filters by: `published`, `under_review`, `rejected`, `draft`

**Backend Reality** (inferred):

- `works.status` likely has enum/constraint
- Unclear if `pending` and `under_review` are both valid
- `published` status may not exist (could be `approved` + `is_public = true`)

**Mismatch**: Frontend assumes `published` status exists, but database may use `approved` + `is_public`.

### 5.2 Creator ID

**Frontend**:

- `creator_studio.js`: Uses Firebase UID as `creatorId` (line 95)
- Access control: Uses Supabase Auth user.id to query `creators.user_id` (line 644)

**Backend**:

- `creators.id` should match Supabase Auth user.id
- `creators.user_id` may be redundant or legacy

**Mismatch**: Studio logic uses wrong ID source, may cause "creator not found" errors.

### 5.3 Cut Memo

**Frontend**:

- UI has cut memo textarea (line 299-305)
- Label: "컷 메모 (관리자 검토용)"

**Backend**:

- `cuts` insert doesn't include memo field (line 1226-1233)

**Mismatch**: UI collects data that isn't saved.

### 5.4 Image Storage Path

**Frontend**:

- Storage path: `{creatorId}/{workId}/{index}.{ext}` (line 1198)
- Uses `creatorId` from Firebase Auth

**Backend**:

- Should use Supabase Auth user.id or `creators.id`

**Mismatch**: Storage path may use wrong ID, causing permission issues or wrong file locations.

---

## 6. Recommendations Summary

### 6.1 Critical Issues

1. **Fix Authentication System**:

   - Remove Firebase Auth references from `creator_studio.js`
   - Use Supabase Auth consistently
   - Use `creators.id` (Supabase user.id) as `creatorId`

2. **Clarify Status Values**:

   - Document valid `works.status` values
   - Remove `pending` if `under_review` is correct
   - Clarify `published` vs `approved` + `is_public`

3. **Fix Creator ID Field**:
   - Standardize on `creators.id` (primary key)
   - Remove `creators.user_id` if redundant
   - Update all queries to use `id`

### 6.2 High Priority

1. **Implement Cut Editing**:

   - Add cut memo field to database or remove UI
   - Implement cut editor tools (crop, rotate, flip)
   - Add image replacement functionality

2. **Fix Work Update Flow**:

   - Handle existing cuts when updating work
   - Fix cut order update logic
   - Add cut deletion for existing works

3. **Improve Status Transitions**:
   - Add proper status validation
   - Handle `approved` status in UI
   - Add status change notifications

### 6.3 Medium Priority

1. **Add Missing Features**:

   - Real-time status updates
   - Cut deletion from existing works
   - Image replacement in cut editor

2. **Improve Error Handling**:
   - Better error messages for failed uploads
   - Recovery for partial uploads
   - Validation before work creation

---

## 7. Data Flow Diagrams

### 7.1 Current Work Creation Flow

```
[User] → [Upload Form] → [Select Images]
  ↓
[Client State: uploadedImages[]]
  ↓
[Submit/Save Draft]
  ↓
[Create Work Record: status='draft']
  ↓
[Upload Images to Storage]
  ↓
[Create Cuts Records]
  ↓
[If Submit: Update status='under_review' + Create Review]
  ↓
[If Draft: Keep status='draft']
```

### 7.2 Current Work Listing Flow

```
[Load Works Query]
  ↓
[SELECT works + cuts WHERE creator_id = ?]
  ↓
[Transform: Filter cuts, Sort by order_index]
  ↓
[Map cuts to work.images[]]
  ↓
[Render in UI with Status Tabs]
```

### 7.3 Current Status Transition Flow

```
[Work Created: status='draft']
  ↓
[User Submits: status='under_review']
  ↓
[Admin Reviews: status='approved' or 'rejected']
  ↓
[If Approved: status='published'? OR is_public=true?]
  ↓
[If Rejected: User can resubmit → status='under_review']
```

---

## 8. Conclusion

The Creator Studio has a solid foundation with comprehensive UI and core functionality. However, there are several architectural inconsistencies that need to be addressed:

1. **Authentication**: Mixed Firebase/Supabase Auth systems cause confusion
2. **Status Management**: Unclear status values and transitions
3. **Data Mapping**: Field mismatches between frontend and backend
4. **Missing Features**: Cut editing, work updates, and status notifications

**Next Steps**:

1. Standardize on Supabase Auth throughout
2. Document and validate database schema constraints
3. Fix field mappings and queries
4. Implement missing features based on UX requirements

---

**Report Generated**: 2025-01-27  
**Analyst**: AI Code Review  
**Status**: Analysis Complete - No Code Changes Made



















