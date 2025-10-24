param(
    [string]$AppUrl = "https://crvkn-code-review-bot.onrender.com",
    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "admin123"
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "CODE REVIEW BOT - SMTP DIAGNOSTIC & USER VERIFICATION" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "STEP 1: Getting admin token..." -ForegroundColor Yellow

try {
    $tokenResponse = Invoke-RestMethod -Uri "$AppUrl/admin/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body (@{ username = $AdminUsername; password = $AdminPassword } | ConvertTo-Json) `
        -TimeoutSec 10
    
    $token = $tokenResponse.access_token
    Write-Host "[OK] Admin token obtained" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to get admin token: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "STEP 2: Testing SMTP connectivity..." -ForegroundColor Yellow

try {
    $networkTest = Invoke-RestMethod -Uri "$AppUrl/admin/debug/network" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $token" } `
        -TimeoutSec 10
    
    Write-Host "  SMTP Server: $($networkTest.smtp_server):$($networkTest.smtp_port)" -ForegroundColor Gray
    
    $dnsTest = $networkTest.tests.dns_resolution
    $tcpTest = $networkTest.tests.tcp_connection
    
    if ($dnsTest.status -eq "success") {
        Write-Host "  [OK] DNS Resolution: $($dnsTest.message)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] DNS Resolution: $($dnsTest.error)" -ForegroundColor Red
    }
    
    if ($tcpTest.status -eq "success") {
        Write-Host "  [OK] TCP Connection: $($tcpTest.message)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] TCP Connection: $($tcpTest.error)" -ForegroundColor Red
    }
    
    $dnsOk = $dnsTest.status -eq "success"
    $tcpOk = $tcpTest.status -eq "success"
    
} catch {
    Write-Host "[ERROR] Failed to test SMTP: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "STEP 3: Retrieving users from database..." -ForegroundColor Yellow

try {
    $usersResponse = Invoke-RestMethod -Uri "$AppUrl/admin/debug/users" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $token" } `
        -TimeoutSec 10
    
    $users = $usersResponse.users
    
    if ($users.Count -eq 0) {
        Write-Host "[INFO] No users found. Register a test user first, then re-run this script." -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Found $($users.Count) user(s)" -ForegroundColor Green
        Write-Host ""
        
        $users | ForEach-Object {
            $status = if ($_.is_verified) { "VERIFIED" } else { "NOT VERIFIED" }
            Write-Host "  Email: $($_.email) [$status]" -ForegroundColor Cyan
            Write-Host "    Username: $($_.username)" -ForegroundColor Gray
            Write-Host "    OTP: $($_.otp_code)" -ForegroundColor Gray
            Write-Host "    Expires: $($_.otp_expires_at)" -ForegroundColor Gray
        }
        
        Write-Host ""
        $unverifiedUser = $users | Where-Object { -not $_.is_verified } | Select-Object -First 1
        
        if ($unverifiedUser) {
            Write-Host "STEP 4: Auto-verifying unverified user..." -ForegroundColor Yellow
            
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
                
                Write-Host "[OK] User verified: $($unverifiedUser.email)" -ForegroundColor Green
                Write-Host "     $($verifyResponse.message)" -ForegroundColor Gray
                
            } catch {
                Write-Host "[ERROR] Verification failed: $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "[OK] All users already verified!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "[ERROR] Failed to get users: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "DIAGNOSIS AND ACTIONS" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

if ($dnsOk -and $tcpOk) {
    Write-Host "[OK] SMTP SERVER IS REACHABLE" -ForegroundColor Green
    Write-Host ""
    Write-Host "If emails still not sending:" -ForegroundColor Yellow
    Write-Host "  FIX: Create Gmail App Password" -ForegroundColor Green
    Write-Host "  1. Go to https://myaccount.google.com/security" -ForegroundColor Gray
    Write-Host "  2. Generate App Password" -ForegroundColor Gray
    Write-Host "  3. In Render: update SMTP_PASSWORD" -ForegroundColor Gray
    Write-Host "  4. Manual Deploy" -ForegroundColor Gray
} else {
    Write-Host "[FAIL] SMTP SERVER NOT REACHABLE FROM RENDER" -ForegroundColor Red
    Write-Host ""
    Write-Host "This is why: 'Failed to send OTP email: [Errno 101] Network is unreachable'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "FIX: Use SendGrid instead (works everywhere)" -ForegroundColor Green
    Write-Host "  1. Create free account: https://sendgrid.com/signup" -ForegroundColor Gray
    Write-Host "  2. Create API Key" -ForegroundColor Gray
    Write-Host "  3. Update Render environment variables:" -ForegroundColor Gray
    Write-Host "     SMTP_SERVER = smtp.sendgrid.net" -ForegroundColor Gray
    Write-Host "     SMTP_PORT = 587" -ForegroundColor Gray
    Write-Host "     SMTP_USERNAME = apikey" -ForegroundColor Gray
    Write-Host "     SMTP_PASSWORD = [your-api-key]" -ForegroundColor Gray
    Write-Host "     FROM_EMAIL = [your-verified-email]" -ForegroundColor Gray
    Write-Host "  4. Manual Deploy" -ForegroundColor Gray
}

Write-Host ""
Write-Host "TEST: Go to https://crvkn-code-review-bot.onrender.com and try login!" -ForegroundColor Yellow
Write-Host ""
