# ============================================================================
# COMPREHENSIVE DEPLOYMENT + SMTP DIAGNOSIS + FIX SCRIPT
# ============================================================================
# This script will:
# 1. Deploy the latest commit to Render
# 2. Test SMTP connectivity using the admin debug endpoint
# 3. If SMTP fails, provide options to:
#    a) Use admin debug flow to verify users manually
#    b) Switch to SendGrid for reliable email
# ============================================================================

param(
    [string]$AppUrl = "https://crvkn-code-review-bot.onrender.com",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "admin123",
    [string]$TestEmail = "test@example.com",
    [string]$TestPassword = "Test@123456"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "CODE REVIEW BOT - DEPLOYMENT & SMTP DIAGNOSTIC SCRIPT" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# ============================================================================
# STEP 1: REDEPLOY ON RENDER
# ============================================================================
Write-Host "STEP 1: Redeploying latest commit on Render..." -ForegroundColor Yellow
Write-Host "Note: You must manually trigger 'Manual Deploy' on Render dashboard now." -ForegroundColor Gray
Write-Host "URL: https://dashboard.render.com/services" -ForegroundColor Gray
Write-Host "`nAfter you click 'Manual Deploy' and the service turns green, press Enter to continue..." -ForegroundColor Gray
Read-Host "Press Enter when the Render service is live"

Write-Host "`n✅ Continuing with diagnostics...`n" -ForegroundColor Green

# ============================================================================
# STEP 2: GET ADMIN TOKEN
# ============================================================================
Write-Host "STEP 2: Obtaining admin token..." -ForegroundColor Yellow

try {
    $tokenResponse = Invoke-RestMethod -Uri "$AppUrl/token" `
        -Method Post `
        -ContentType "application/x-www-form-urlencoded" `
        -Body @{ username = $AdminUsername; password = $AdminPassword } `
        -TimeoutSec 10
    
    $token = $tokenResponse.access_token
    Write-Host "✅ Admin token obtained successfully`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get admin token: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nTroubleshooting:"
    Write-Host "- Ensure the Render service is fully started (green status)"
    Write-Host "- Verify admin credentials are correct (default: admin/admin123)"
    Write-Host "- Check Render logs for startup errors"
    exit 1
}

# ============================================================================
# STEP 3: TEST SMTP CONNECTIVITY
# ============================================================================
Write-Host "STEP 3: Testing SMTP connectivity from Render container..." -ForegroundColor Yellow

try {
    $networkTest = Invoke-RestMethod -Uri "$AppUrl/admin/debug/network" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $token" } `
        -TimeoutSec 10
    
    Write-Host "`nSMTP Configuration:"
    Write-Host "  Server: $($networkTest.smtp_server)" -ForegroundColor Gray
    Write-Host "  Port: $($networkTest.smtp_port)" -ForegroundColor Gray
    
    # Check DNS resolution
    $dnsTest = $networkTest.tests.dns_resolution
    if ($dnsTest.status -eq "success") {
        Write-Host "`n✅ DNS Resolution: PASSED" -ForegroundColor Green
        Write-Host "   $($dnsTest.message)" -ForegroundColor Gray
    } else {
        Write-Host "`n❌ DNS Resolution: FAILED" -ForegroundColor Red
        Write-Host "   $($dnsTest.error)" -ForegroundColor Gray
    }
    
    # Check TCP connection
    $tcpTest = $networkTest.tests.tcp_connection
    if ($tcpTest.status -eq "success") {
        Write-Host "`n✅ TCP Connection: PASSED" -ForegroundColor Green
        Write-Host "   $($tcpTest.message)" -ForegroundColor Gray
    } else {
        Write-Host "`n❌ TCP Connection: FAILED" -ForegroundColor Red
        Write-Host "   $($tcpTest.error)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Failed to test SMTP connectivity: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 4: DETERMINE NEXT ACTION
# ============================================================================

$dnsOk = $networkTest.tests.dns_resolution.status -eq "success"
$tcpOk = $networkTest.tests.tcp_connection.status -eq "success"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "DIAGNOSIS COMPLETE" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

if ($dnsOk -and $tcpOk) {
    Write-Host "✅ SMTP SERVER IS REACHABLE" -ForegroundColor Green
    Write-Host "`nPossible reasons OTP emails still didn't send:"
    Write-Host "  1. SMTP authentication failed (wrong password)"
    Write-Host "  2. FROM_EMAIL is invalid"
    Write-Host "  3. Email provider rejected the message"
    Write-Host "`nNext step: Check Render logs for SMTP auth errors." -ForegroundColor Yellow
    Write-Host "If you see 'SMTPAuthenticationError', create a Gmail App Password:" -ForegroundColor Yellow
    Write-Host "  - Google Account → Security → App passwords"
    Write-Host "  - Select 'Mail' and 'Windows Computer'"
    Write-Host "  - Update Render env: SMTP_PASSWORD=<16-char-app-password>"
    Write-Host "  - Redeploy and test again" -ForegroundColor Yellow
} else {
    Write-Host "❌ SMTP SERVER IS NOT REACHABLE FROM RENDER" -ForegroundColor Red
    Write-Host "`nThis is why OTP emails are failing with '[Errno 101] Network is unreachable'" -ForegroundColor Yellow
    Write-Host "`nSolution: Use SendGrid (recommended - works everywhere)" -ForegroundColor Green
    Write-Host "`nOption A: Switch to SendGrid SMTP (2 minutes setup)" -ForegroundColor Cyan
    Write-Host "==========================================================="
    Write-Host "1. Create free SendGrid account: https://sendgrid.com/signup"
    Write-Host "2. Verify sender email in SendGrid (or use a SendGrid domain)"
    Write-Host "3. Create API key: Settings → API Keys → Create Key"
    Write-Host "4. In Render dashboard, update environment variables:"
    Write-Host "   - SMTP_SERVER = smtp.sendgrid.net"
    Write-Host "   - SMTP_PORT = 587"
    Write-Host "   - SMTP_USERNAME = apikey"
    Write-Host "   - SMTP_PASSWORD = <your-sendgrid-api-key>"
    Write-Host "   - FROM_EMAIL = <your-verified-sender-email>"
    Write-Host "5. Manual Deploy on Render"
    Write-Host "6. Test registration again" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option B: Manually verify users (immediate unblock, not permanent)" -ForegroundColor Cyan
    Write-Host "==========================================================="
}

# ============================================================================
# STEP 5: OPTION B - MANUAL USER VERIFICATION
# ============================================================================

Write-Host "`nWould you like to verify a test user manually right now? (Y/N): " -ForegroundColor Yellow -NoNewline
$choice = Read-Host

if ($choice -eq "Y" -or $choice -eq "y") {
    Write-Host "`n" -ForegroundColor Cyan
    Write-Host "STEP 5: Retrieving user OTPs..." -ForegroundColor Yellow
    
    try {
        $usersResponse = Invoke-RestMethod -Uri "$AppUrl/admin/debug/users" `
            -Method Get `
            -Headers @{ Authorization = "Bearer $token" } `
            -TimeoutSec 10
        
        $users = $usersResponse.users
        
        if ($users.Count -eq 0) {
            Write-Host "❌ No users found in database" -ForegroundColor Red
            Write-Host "Register a test user first on the website, then run this script again." -ForegroundColor Yellow
        } else {
            Write-Host "`n✅ Found $($users.Count) user(s):`n" -ForegroundColor Green
            
            $users | ForEach-Object {
                $verified = if ($_.is_verified) { "✅ YES" } else { "❌ NO" }
                Write-Host "  Email: $($_.email)" -ForegroundColor Gray
                Write-Host "    - Username: $($_.username)" -ForegroundColor Gray
                Write-Host "    - Verified: $verified" -ForegroundColor Gray
                Write-Host "    - OTP Code: $($_.otp_code)" -ForegroundColor Gray
                Write-Host "    - OTP Expires: $($_.otp_expires_at)" -ForegroundColor Gray
                Write-Host ""
            }
            
            # Verify first unverified user
            $unverifiedUser = $users | Where-Object { -not $_.is_verified } | Select-Object -First 1
            
            if ($unverifiedUser) {
                Write-Host "Verifying user: $($unverifiedUser.email)" -ForegroundColor Yellow
                
                try {
                    $verifyBody = @{ 
                        email = $unverifiedUser.email
                        otp_code = $unverifiedUser.otp_code
                    } | ConvertTo-Json
                    
                    $verifyResponse = Invoke-RestMethod -Uri "$AppUrl/verify-otp" `
                        -Method Post `
                        -Body $verifyBody `
                        -ContentType "application/json" `
                        -TimeoutSec 10
                    
                    Write-Host "✅ User verified successfully!" -ForegroundColor Green
                    Write-Host "   Message: $($verifyResponse.message)" -ForegroundColor Gray
                    
                    # Now test login
                    Write-Host "`nTesting login with verified account..." -ForegroundColor Yellow
                    
                    $loginBody = @{
                        username = $unverifiedUser.username
                        password = "TestPassword123!"  # Note: You need to know the actual password
                    }
                    
                    Write-Host "(Note: Login test skipped - you need the actual password used during registration)" -ForegroundColor Gray
                    
                } catch {
                    Write-Host "❌ Verification failed: $($_.Exception.Message)" -ForegroundColor Red
                }
            } else {
                Write-Host "✅ All users are already verified!" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "❌ Failed to retrieve users: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "SCRIPT COMPLETE" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

if (-not ($dnsOk -and $tcpOk)) {
    Write-Host "⚡ RECOMMENDED NEXT STEP: Set up SendGrid (Option A above)" -ForegroundColor Yellow
    Write-Host "`nOnce you complete the SendGrid setup, run this script again to verify it works." -ForegroundColor Gray
}
