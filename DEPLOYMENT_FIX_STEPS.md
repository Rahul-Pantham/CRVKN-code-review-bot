# DEPLOYMENT & FIX - SIMPLE STEPS

## What I Did
✅ Added a network diagnostic endpoint (`/admin/debug/network`) that tests if Render can reach your SMTP server.  
✅ Created a PowerShell script that automates the diagnosis and fix.  
✅ Pushed all changes to the repository (branch: `odd2`).

## What You Need To Do Now

### Step 1: Redeploy on Render
1. Open https://dashboard.render.com/services
2. Select your backend service (codegem-code-review-bot)
3. Click **Manual Deploy** button
4. Wait for the service to show "Live" (green status) — this takes ~2-3 minutes
5. In Render logs, you should see "Application startup complete" and "Your service is live 🎉"

### Step 2: Run the Diagnostic Script
Open PowerShell and run this command from the repo root:

```powershell
cd "d:\new folder aibott\newodd\CODE-REVIEW-BOT"
.\test_and_fix.ps1
```

The script will:
- Confirm Render is running
- Get admin credentials
- Test if Render can reach your SMTP server (Gmail or whatever is configured)
- Tell you exactly what's wrong and how to fix it

### Step 3: Follow the Script's Recommendation

**If DNS and TCP both PASS ✅:**
- SMTP server is reachable
- The issue is likely authentication (wrong password)
- Create a Gmail App Password:
  1. Go to https://myaccount.google.com/security
  2. Enable 2-Step Verification if not already done
  3. Go to App passwords → Select Mail & Windows Computer → Generate
  4. Copy the 16-character password
  5. In Render dashboard: Settings → Environment → SMTP_PASSWORD → paste the App Password
  6. Click Deploy → Manual Deploy
  7. Test registration again

**If DNS or TCP FAIL ❌:**
- Render cannot reach your SMTP server (network blocked)
- This is why you saw: "Failed to send OTP email: [Errno 101] Network is unreachable"
- **Solution: Use SendGrid** (works everywhere, very reliable)
  1. Sign up free: https://sendgrid.com/signup
  2. Create API key: Settings → API Keys → Create
  3. In Render dashboard: Settings → Environment → Update:
     - SMTP_SERVER = smtp.sendgrid.net
     - SMTP_PORT = 587
     - SMTP_USERNAME = apikey
     - SMTP_PASSWORD = `<your-sendgrid-api-key>`
     - FROM_EMAIL = `<your-email@domain.com>`
  4. Click Deploy → Manual Deploy
  5. Test registration again

### Step 4: Test Registration & Login
Once SMTP is fixed:
1. Go to https://codegem-code-review-bot.onrender.com
2. Click Register
3. Use a real email you can access
4. You should receive the OTP email in seconds
5. Use the OTP to verify
6. Click Login and verify it works

## Need a Quick Unblock?

If you don't want to set up SendGrid right now, you can manually verify users:
1. Run the script: `.\test_and_fix.ps1`
2. When it asks "Would you like to verify a test user manually? (Y/N):" type **Y**
3. The script will:
   - List all users in the database
   - Show their OTP codes
   - Automatically verify the first unverified user
4. Now that user can log in even though email wasn't delivered

This is a **temporary** solution for testing — for production, fix SMTP or use SendGrid.

## Summary

| Issue | Status | Solution |
|-------|--------|----------|
| Redeploy latest code | Do Step 1 | Manual Deploy on Render |
| Diagnose SMTP | Do Step 2 | Run PowerShell script |
| Fix SMTP | Do Step 3 | Gmail App Password OR SendGrid |
| Test user login | Do Step 4 | Try registering on website |
| Quick unblock (temp) | Optional | Script can verify users manually |

---

**Questions?** Paste any error output from the script and I will help troubleshoot.
