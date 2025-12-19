# Creator Studio Upload Flow Verification Report

**Date**: 2025-01-27  
**Scope**: Verification of upload flow data integrity  
**Focus**: Field mapping, value preservation, data consistency

---

## Executive Summary

This report verifies the Creator Studio upload flow to identify:

- ✅ What is working correctly
- ❌ What is incorrect or broken
- ⚠️ Where values are lost or mismatched

**Critical Issues Found**: 2  
**Warning Issues Found**: 3  
**Correct Implementations**: 2

---

## 1. Upload Mode Selection → `works.upload_mode`

### Verification Flow

```
User selects mode (Light/Pro)
  ↓
state.currentUploadMode = mode (line 204)
  ↓
Work creation: upload_mode: state.currentUploadMode || "light" (line 1063, 1136)
```

### ✅ CORRECT

**Evidence**:

- Mode selection correctly sets `state.currentUploadMode` (line 204)
- Work insert includes `upload_mode: state.currentUploadMode || "light"` (line 1063, 1136)
- Default fallback to "light" if mode not set

**Status**: ✅ **VERIFIED CORRECT**

---

## 2. `works.creator_id` vs Supabase Auth `user.id`

### Verification Flow

**Access Control** (creator_studio.html, line 632-644):

```
getCurrentUser() → user.id (Supabase Auth)
  ↓
Query: creators.user_id = user.id
```

**Studio Logic** (creator_studio.js, line 89-95):

```
getFirebaseUser() → firebaseUser.uid (Firebase Auth)
  ↓
creatorId = firebaseUser.uid
  ↓
Work insert: creator_id: creatorId
```

### ❌ INCORRECT - CRITICAL MISMATCH

**Problem**:

1. **Access control** uses Supabase Auth `user.id`
2. **Studio logic** uses Firebase Auth `firebaseUser.uid`
3. These are **different ID systems** and will not match

**Evidence**:

- Line 95: `creatorId = firebaseUser.uid` (Firebase UID)
- Line 1059, 1132: `creator_id: creatorId` (uses Firebase UID)
- Line 644: Access control queries `creators.user_id = user.id` (Supabase user.id)
- Line 124: `ensureCreatorExists()` queries `creators.id = creatorId` (Firebase UID)

**Impact**:

- Works may be created with wrong `creator_id` (Firebase UID instead of Supabase user.id)
- Database foreign key constraints may fail
- Works won't be linked to correct creator record
- Queries filtering by `creator_id` will return wrong results

**Status**: ❌ **VERIFIED INCORRECT - CRITICAL**

---

## 3. `works.status` (draft vs under_review)

### Verification Flow

**Draft Save** (handleSaveDraft, line 1044-1109):

```
Create work: status = "draft" (line 1064)
  ↓
Upload images
  ↓
Status remains "draft"
```

**Submit for Review** (handleFormSubmit, line 1111-1186):

```
Create work: status = "draft" (line 1137)
  ↓
Upload images
  ↓
Update: status = "under_review" (line 1157)
```

**Update Existing Work** (line 1077-1086):

```
Update work metadata
  ↓
Status NOT updated (only title, description, genre, is_public)
```

### ⚠️ PARTIALLY INCORRECT

**Issues Found**:

1. **Unnecessary Draft State on Submit**:

   - Line 1137: Creates work with `status: "draft"`
   - Line 1157: Immediately updates to `"under_review"`
   - **Result**: Work briefly exists as `draft` even when submitting
   - **Impact**: Minor - creates unnecessary status transition

2. **Update Path Doesn't Update Status**:

   - Line 1078-1086: When updating existing work, only updates metadata
   - **Missing**: If user updates a draft and then submits, status update happens (line 1157)
   - **But**: If user saves draft after updating, status stays as-is
   - **Impact**: Low - draft stays draft (correct), but no way to change status via update

3. **Status Transition Logic**:
   - ✅ Draft save correctly sets `status = "draft"`
   - ✅ Submit correctly sets `status = "under_review"`
   - ⚠️ Creates work as draft first, then updates (inefficient but functional)

**Status**: ⚠️ **VERIFIED WITH WARNINGS**

- Functionally works but has inefficiency
- Update path doesn't handle status changes (may be intentional)

---

## 4. `cuts.work_id` Linking

### Verification Flow

```
uploadImagesToSupabase(workId) called with workId
  ↓
For each image:
  Upload to storage
  ↓
Insert cut: work_id: workId (line 1227)
```

### ✅ CORRECT

**Evidence**:

- `uploadImagesToSupabase()` receives `workId` parameter (line 1188)
- Cut insert uses `work_id: workId` (line 1227)
- `workId` comes from work creation (line 1075, 1148) or existing work

**Status**: ✅ **VERIFIED CORRECT**

---

## 5. Frontend Payload vs Database Fields

### Field Mapping Analysis

#### Work Creation Payload (Line 1058-1066, 1131-1139)

**Frontend Sends**:

```javascript
{
  creator_id: creatorId,           // ❌ Firebase UID (wrong)
  title: formData.get("work-title"),
  description: formData.get("work-description"),
  genre: formData.get("work-genre"),
  upload_mode: state.currentUploadMode || "light",  // ✅ Correct
  status: "draft",                // ⚠️ Always draft initially
  is_public: formData.get("work-visibility") === "public"
}
```

**Database Expects** (inferred):

```sql
works {
  id: UUID (auto)
  creator_id: UUID (should match Supabase Auth user.id)
  title: TEXT
  description: TEXT
  genre: TEXT
  upload_mode: TEXT ('light' | 'pro')
  status: TEXT ('draft' | 'under_review' | 'approved' | 'rejected' | 'published')
  is_public: BOOLEAN
  created_at: TIMESTAMP (auto)
  updated_at: TIMESTAMP (auto)
}
```

#### Work Update Payload (Line 1078-1086)

**Frontend Sends**:

```javascript
{
  title: formData.get("work-title"),
  description: formData.get("work-description"),
  genre: formData.get("work-genre"),
  is_public: formData.get("work-visibility") === "public"
  // ❌ Missing: upload_mode (not updated)
  // ⚠️ Missing: status (intentional? stays as-is)
}
```

#### Cut Creation Payload (Line 1224-1233)

**Frontend Sends**:

```javascript
{
  work_id: workId,                // ✅ Correct
  order_index: i,                 // ✅ Array index
  image_url: imageUrl,            // ✅ Public URL
  width: img.width,               // ✅ Image dimensions
  height: img.height,             // ✅ Image dimensions
  is_visible: true                // ✅ Default
}
```

**Database Expects** (inferred):

```sql
cuts {
  id: UUID (auto)
  work_id: UUID (FK to works.id)
  order_index: INTEGER
  image_url: TEXT
  width: INTEGER
  height: INTEGER
  is_visible: BOOLEAN
  memo: TEXT? (UI has field but not sent)
  created_at: TIMESTAMP (auto)
}
```

### ❌ FIELD MISMATCHES FOUND

1. **`creator_id` Type Mismatch**:

   - **Frontend**: Sends Firebase UID (string, different format)
   - **Database**: Expects Supabase Auth user.id (UUID)
   - **Impact**: CRITICAL - Foreign key constraint may fail

2. **`upload_mode` Not Updated**:

   - **Frontend**: Updates work metadata but doesn't include `upload_mode`
   - **Database**: Field exists but won't be updated if work is edited
   - **Impact**: Medium - Mode can't be changed after initial creation

3. **Cut `memo` Field Missing**:

   - **Frontend UI**: Has textarea for cut memo (creator_studio.html line 299-305)
   - **Frontend Payload**: Doesn't send memo field
   - **Database**: Unknown if field exists
   - **Impact**: Low - Data collected but not saved

4. **Status Always Draft Initially**:
   - **Frontend**: Always creates work as `"draft"`, then updates if submitting
   - **Database**: Accepts status, but creates unnecessary transition
   - **Impact**: Low - Works but inefficient

**Status**: ❌ **VERIFIED WITH MISMATCHES**

---

## 6. Value Loss Points

### Where Values Are Lost

1. **Upload Mode on Update**:

   - **Location**: Line 1078-1086
   - **Loss**: `upload_mode` not included in update payload
   - **Impact**: Cannot change upload mode after work creation

2. **Cut Memo**:

   - **Location**: creator_studio.html line 299-305 (UI exists)
   - **Loss**: Value never sent to backend
   - **Impact**: User input is lost

3. **Creator ID**:

   - **Location**: Line 95, 1059, 1132
   - **Loss**: Wrong ID system used (Firebase vs Supabase)
   - **Impact**: CRITICAL - Data integrity broken

4. **Status Transition**:
   - **Location**: Line 1137 → 1157
   - **Loss**: Brief `draft` state created unnecessarily
   - **Impact**: Low - Works but inefficient

---

## 7. Summary Table

| Verification Point           | Status          | Issue                                                         | Impact                    |
| ---------------------------- | --------------- | ------------------------------------------------------------- | ------------------------- |
| Upload mode saved            | ✅ Correct      | None                                                          | None                      |
| creator_id matches user.id   | ❌ **CRITICAL** | Uses Firebase UID instead of Supabase user.id                 | **Data integrity broken** |
| Status draft vs under_review | ⚠️ Warning      | Creates draft first, then updates                             | Minor inefficiency        |
| cuts.work_id linking         | ✅ Correct      | None                                                          | None                      |
| Field payload mapping        | ❌ Mismatches   | creator_id wrong type, upload_mode not updated, memo not sent | **Critical + Medium**     |

---

## 8. Detailed Issue Breakdown

### Critical Issues

#### Issue #1: `creator_id` Uses Wrong Authentication System

- **Location**: `creator_studio.js` line 95, 1059, 1132
- **Problem**: Uses Firebase Auth UID instead of Supabase Auth user.id
- **Expected**: `creator_id` should match Supabase Auth `user.id`
- **Actual**: `creator_id` = Firebase `firebaseUser.uid`
- **Impact**:
  - Foreign key constraints may fail
  - Works not linked to correct creator
  - Queries return wrong results
  - Data integrity compromised

#### Issue #2: Field Type Mismatch

- **Location**: Work insert operations
- **Problem**: `creator_id` sent as Firebase UID (string format) vs expected UUID
- **Impact**: Database may reject inserts or create orphaned records

### Warning Issues

#### Issue #3: Upload Mode Not Updated

- **Location**: Line 1078-1086 (work update)
- **Problem**: `upload_mode` not included in update payload
- **Impact**: Cannot change upload mode after initial creation

#### Issue #4: Unnecessary Status Transition

- **Location**: Line 1137 → 1157
- **Problem**: Creates work as `draft`, then immediately updates to `under_review`
- **Impact**: Minor inefficiency, but functionally works

#### Issue #5: Cut Memo Not Saved

- **Location**: UI exists but payload doesn't include memo
- **Problem**: User input collected but never sent to backend
- **Impact**: Low - feature may not be implemented yet

---

## 9. Verification Checklist

- [x] Upload mode selection saved to `works.upload_mode` → ✅ **VERIFIED CORRECT**
- [x] `works.creator_id` matches Supabase auth `user.id` → ❌ **VERIFIED INCORRECT**
- [x] `works.status` correctly set (draft vs under_review) → ⚠️ **VERIFIED WITH WARNINGS**
- [x] `cuts.work_id` correctly linked to `works.id` → ✅ **VERIFIED CORRECT**
- [x] Frontend payload matches database fields → ❌ **VERIFIED WITH MISMATCHES**

---

## 10. Recommendations

### Immediate Actions Required

1. **Fix Creator ID Source**:

   - Replace Firebase Auth with Supabase Auth in `creator_studio.js`
   - Use `getCurrentUser()` from `auth.js` to get Supabase user.id
   - Update `creatorId` initialization (line 89-99)
   - Verify `creators.id` or `creators.user_id` matches Supabase user.id

2. **Verify Database Schema**:
   - Confirm `creators.id` is primary key matching Supabase Auth user.id
   - Confirm `creators.user_id` field purpose (redundant or legacy?)
   - Standardize on one field (`id` or `user_id`)

### Medium Priority

3. **Fix Status Creation**:

   - Create work with correct status immediately (don't create as draft then update)
   - For submit: `status = "under_review"` directly
   - For draft: `status = "draft"` directly

4. **Add Upload Mode to Update**:
   - Include `upload_mode` in work update payload if mode can be changed

### Low Priority

5. **Implement or Remove Cut Memo**:
   - Either add `memo` field to cuts insert
   - Or remove memo UI if not needed

---

## 11. Code References

### Critical Code Locations

- **Creator ID Issue**: `creator_studio.js` line 89-99, 1059, 1132
- **Access Control**: `creator_studio.html` line 632-644
- **Status Creation**: `creator_studio.js` line 1064, 1137, 1157
- **Upload Mode**: `creator_studio.js` line 204, 1063, 1136
- **Cut Linking**: `creator_studio.js` line 1227
- **Work Update**: `creator_studio.js` line 1078-1086

---

## Conclusion

The upload flow has **2 critical issues** that must be fixed:

1. Wrong authentication system used for `creator_id`
2. Field type mismatch causing data integrity issues

Additionally, there are **3 warning-level issues** that should be addressed for optimal functionality.

**Overall Status**: ❌ **VERIFICATION FAILED** - Critical issues prevent correct data storage.

---

**Report Generated**: 2025-01-27  
**Verification Method**: Code analysis and flow tracing  
**Status**: Complete - No code changes made



















