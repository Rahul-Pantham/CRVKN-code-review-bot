# 🔧 Testing Section Reject Functionality

## Problem Fixed
**Issue**: When clicking "Reject" button on sections, the rejection wasn't reflecting in admin dashboard analytics.

**Root Cause**: Race condition bug in `ReviewCard.js` - was using old state before React updated it.

**Fix Applied**: 
- Created `updatedStates` object BEFORE calling `setSectionStates()`
- Added comprehensive logging throughout the data flow
- Enhanced backend logging to show exact values being saved

---

## 🧪 How to Test

### Step 1: Start Fresh
1. Backend should already be running on http://127.0.0.1:8000
2. Open http://localhost:3000 in your browser
3. Open Browser Console (F12)

### Step 2: Submit Code for Review
Use this test code:
```python
def calculate_sum(a, b):
    result = a + b
    return result

print(calculate_sum(5, 3))
```

### Step 3: Test REJECT Functionality
1. After review appears, find the **"Key Findings"** section
2. Click the **"✗ Reject"** button
3. **Check Browser Console** - You should see:
   ```
   🔘 Section action: keyFindings = rejected
   📝 Updated section states: { keyFindings: 'rejected', ... }
   📤 Calling onAccept with review ID: 123
   🔍 handleFeedbackSubmitForReview called with: { reviewId: 123, feedback: 'positive', sectionStates: {...} }
   📤 Sending section feedback to backend: { key_findings: 'rejected', ... }
   ✅ Feedback submission response: { section_feedback_id: 1 }
   ```

4. **Check Backend Terminal** - You should see:
   ```
   DEBUG: Received feedback data:
   DEBUG: Section feedback data received: {'key_findings': 'rejected', ...}
   ✓ Setting key_findings_section = 'rejected'
   DEBUG: Final section_feedback_record state before commit:
     - key_findings_section: rejected
   DEBUG: Successfully committed to database
   DEBUG: Section feedback record ID: 1
   ```

### Step 4: Test ACCEPT Functionality
1. Click **"✓ Accept"** on the **"Architecture & Design"** section
2. **Check Browser Console** for:
   ```
   🔘 Section action: architecture = accepted
   ```
3. **Check Backend Terminal** for:
   ```
   ✓ Setting architecture_section = 'accepted'
   ```

### Step 5: Mix Both
1. Accept some sections (e.g., Recommendations, Optimized Code)
2. Reject other sections (e.g., Syntax Errors, Semantic Errors)
3. Verify backend logs show BOTH accepted and rejected values

### Step 6: Check Admin Dashboard
1. Navigate to **Admin Dashboard** (click Admin role on home page)
2. Login with: `admin` / `admin123`
3. Click the **"Refresh"** button in the header
4. **Check Browser Console** for:
   ```
   📊 Section feedback analytics data: {
     chart_data: [
       { section: "Key Findings", accepted: 0, rejected: 1 },
       { section: "Architecture & Design", accepted: 1, rejected: 0 },
       ...
     ]
   }
   ```
5. **Look at the charts** - Should show:
   - Green bars for accepted sections
   - Red bars for rejected sections
   - Summary cards showing X A / Y R (e.g., "1A / 1R")

---

## 🐛 If Charts Still Show 0

### Option A: Check Diagnostics Endpoint
1. In browser, copy your `adminToken` from LocalStorage (F12 → Application → Local Storage)
2. Open new tab and call:
   ```
   http://localhost:8000/admin/diagnostics/section-feedback
   ```
   (You'll need to add the Authorization header with Bearer token)

3. Or use PowerShell:
   ```powershell
   $token = "YOUR_ADMIN_TOKEN_HERE"
   Invoke-WebRequest -Uri "http://localhost:8000/admin/diagnostics/section-feedback" -Headers @{ Authorization = "Bearer $token" } | Select-Object -ExpandProperty Content
   ```

### Option B: Check Database Directly (PostgreSQL)
```sql
SELECT 
  id, 
  review_id, 
  key_findings_section, 
  architecture_section, 
  recommendations_section,
  optimized_code_section,
  syntax_errors_section,
  semantic_errors_section,
  created_at
FROM section_feedback 
ORDER BY created_at DESC 
LIMIT 5;
```

### Expected Result:
- `table_exists`: true
- `required_columns_present`: All should be `true`
- `total_rows`: > 0
- `recent`: Should show your accept/reject values

---

## ✅ Success Criteria

- ✅ Clicking "Reject" button changes section border to **red**
- ✅ Browser console shows `rejected` in section states
- ✅ Backend logs show `Setting X_section = 'rejected'`
- ✅ Admin dashboard charts show **red bars** for rejected sections
- ✅ Admin dashboard summary shows correct counts (e.g., "2A / 3R")

---

## 📊 Expected Behavior

When you accept/reject sections:
1. **Visual feedback**: Button highlights (green/red)
2. **State update**: React state updates immediately
3. **API call**: Data sent to backend with correct values
4. **Database save**: Values stored as 'accepted' or 'rejected'
5. **Analytics query**: Admin endpoint counts both types
6. **Dashboard display**: Charts show correct green/red bars

---

## 🔍 Debug Commands

If something doesn't work:

1. **Check backend is running**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check section feedback is being saved**:
   ```bash
   # Check backend logs for these lines:
   # ✓ Setting key_findings_section = 'rejected'
   # DEBUG: Successfully committed to database
   ```

3. **Verify frontend is sending correct data**:
   ```javascript
   // In browser console, check for:
   // 📤 Sending section feedback to backend: { key_findings: 'rejected' }
   ```

4. **Test analytics endpoint directly**:
   ```bash
   # Use Postman or curl with admin token
   curl http://localhost:8000/admin/analytics/section-feedback \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## 🎯 Summary

The fix ensures that when you click Accept OR Reject, the correct value is:
1. ✅ Captured in React state
2. ✅ Sent to backend API
3. ✅ Saved to database
4. ✅ Retrieved by analytics
5. ✅ Displayed in admin charts

Both accepts AND rejects should now work perfectly! 🚀
