# SENDGRID SETUP - GET EMAIL WORKING IN 5 MINUTES

## The Problem

Render's network blocks direct SMTP connections to gmail.com (port 587).
- This is why you saw: `Failed to send OTP email: [Errno 101] Network is unreachable`
- Diagnostic script confirmed: SMTP not reachable from Render

## The Solution: SendGrid

SendGrid is a transactional email service that works reliably from any cloud provider. **Free tier includes 100 emails/day** (more than enough for testing).

---

## Step 1: Create SendGrid Account (2 minutes)

1. Go to **https://sendgrid.com/signup**
2. Sign up with your email
3. Verify email address
4. You're done!

---

## Step 2: Create API Key (1 minute)

In SendGrid dashboard:
1. Left sidebar → **Settings** → **API Keys**
2. Click **Create API Key**
3. Name: `render-app` (or any name)
4. Select **Full Access** (easiest for testing)
5. Click **Create & Close**
6. **Copy the API key** (you'll need it next)
7. Save it safely

---

## Step 3: Verify Sender Email (1 minute)

SendGrid requires you to verify at least one sender email.

In SendGrid dashboard:
1. Left sidebar → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter your email address (e.g., your@gmail.com)
4. Click **Create**
5. Check your email for verification link
6. Click the link to verify

---

## Step 4: Update Render Environment Variables (1 minute)

In Render dashboard (https://dashboard.render.com):

1. Select your backend service
2. Click **Environment** in left sidebar
3. Update these environment variables:

| Variable | Value |
|----------|-------|
| `SMTP_SERVER` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | `apikey` |
| `SMTP_PASSWORD` | **[PASTE YOUR SENDGRID API KEY HERE]** |
| `FROM_EMAIL` | **[THE EMAIL YOU VERIFIED ABOVE]** |

Example:
```
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.abc123xyz789...
FROM_EMAIL=your@gmail.com
```

4. Click **Save Changes**

---

## Step 5: Redeploy (2 minutes)

1. In Render dashboard, click **Manual Deploy**
2. Wait until "Application startup complete" appears in logs
3. You should see in logs: `Email configured: Yes`

---

## Step 6: Test It! (1 minute)

1. Go to **https://crvkn-code-review-bot.onrender.com**
2. Click **Register**
3. Use a test email you can access
4. Create password
5. **YOU SHOULD NOW RECEIVE THE OTP EMAIL** 🎉
6. Enter OTP on website
7. Click **Login** with your credentials

---

## Troubleshooting

**"Email not received?"**
- Check spam/junk folder
- Wait 30 seconds (SendGrid may be slow on free tier)
- Check Render logs for errors: look for "email sent successfully" or SMTP errors
- Verify the FROM_EMAIL is the one you verified in SendGrid

**"Still having issues?"**
- Run the diagnostic script again:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\test_and_fix_auto.ps1
  ```
- This will show current SMTP status
- Paste any errors here

---

## Summary

After SetUpGrid is configured, registration/OTP/login should work perfectly because:
- SendGrid SMTP is reachable from Render (no network blocks)
- Your emails are delivered reliably
- Users can verify and login

This is a production-ready setup!

---

## Cost

- **Free tier**: 100 emails/day forever
- You're well under this limit for testing/demo
- Upgrade to paid only if you go live with thousands of users

---

**Questions? Run the test script and paste the output!**
