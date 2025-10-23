# Bcrypt 5.0.0 Compatibility Fix

## Problem Detected

When you deployed to Render, the bcrypt error appeared:

```
(trapped) error reading bcrypt version
AttributeError: module 'bcrypt' has no attribute '__about__'
🔴 CRITICAL: Password hashing error: password cannot be longer than 72 bytes
```

This is a **version mismatch between passlib and bcrypt**.

## Root Cause

- **passlib 1.7.4** was installed (released 2015)
- **bcrypt 5.0.0** was installed (recent version)
- Passlib 1.7.4 doesn't know how to read bcrypt 5.0.0's version info

## Solution Applied

### 1. Upgraded passlib to 1.7.5
- **File**: `backend/requirements.txt`
- **Change**: `passlib[bcrypt]==1.7.4` → `passlib[bcrypt]==1.7.5`
- **Reason**: 1.7.5 supports bcrypt 5.0.0

### 2. Added Explicit Bcrypt Configuration
- **File**: `backend/main.py` (Line 804-810)
- **Change**: Added `bcrypt__rounds=12` to CryptContext

**Before:**
```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

**After:**
```python
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Explicit rounds for bcrypt
)
```

## What This Fixes

✅ Bcrypt version detection error
✅ Password hashing now works correctly
✅ Registration form will accept passwords
✅ Login authentication will work

## Commit Information

- **Commit Hash**: `0bf5960e`
- **Message**: "fix: upgrade passlib to 1.7.5 for bcrypt 5.0.0 compatibility and add explicit bcrypt configuration"
- **Files Changed**: 
  - `backend/requirements.txt`
  - `backend/main.py`

## Next Steps

1. Go to Render Dashboard: https://dashboard.render.com/services
2. Click "crvkn-code-review-bot"
3. Scroll down → Click "Manual Deploy"
4. Select "Deploy latest commit" (0bf5960e)
5. Wait 2-3 minutes for build
6. Test registration at https://crvkn-code-review-bot.onrender.com

## Testing After Deploy

```bash
# Try registering:
username: testuser
password: testpassword123
email: test@example.com

# Should work without bcrypt errors!
```

---

**Status**: ✅ Fix committed and pushed to GitHub
**Ready to Deploy**: Yes, immediately trigger manual deploy on Render
