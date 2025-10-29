# SENDGRID SETUP - COMPLETE AUTOMATED GUIDE

## Step 1: Create SendGrid Account

Go to: https://sendgrid.com/signup

Fill in:
- Email: panthamr14@gmail.com
- Password: (create a strong one)
- Company: CRVKN
- Click **Create Account**

Verify your email from the link SendGrid sends.

---

## Step 2: Create API Key

After login to SendGrid:

1. Left sidebar → **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `render-app`
4. Select **Full Access**
5. Click **Create & Close**
6. **COPY THE API KEY** (you'll only see it once!)

Example: `SG.abc123xyz789def456ghi789jkl...`

---

## Step 3: Verify Sender Email

1. Left sidebar → **Sender Authentication** 
2. Click **Verify a Single Sender**
3. Enter: `panthamr14@gmail.com`
4. Click **Create**
5. Check your email for verification link
6. Click the link to verify

---

## Step 4: Update Render Environment Variables

Once you have the API key:

1. Go to Render Dashboard
2. Select your backend service
3. Click **Environment**
4. Update these 5 variables:

```
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=[PASTE YOUR API KEY HERE]
FROM_EMAIL=panthamr14@gmail.com
```

5. Click **Save Changes**

---

## Step 5: Redeploy on Render

1. Click **Manual Deploy**
2. Wait for "Your service is live"

---

## Step 6: Test Registration

1. Go to: https://crvkn-code-review-bot.onrender.com
2. Register with real email
3. Check inbox for OTP email
4. Verify and login

**DONE!** ✅

---

## Need Help?

If anything is unclear, tell me and I'll help!
