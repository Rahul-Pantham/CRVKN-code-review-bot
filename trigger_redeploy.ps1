#!/usr/bin/env powershell
# Force redeploy by making a small change to trigger Render

Write-Host "🔄 Triggering Render redeploy..."

# Add a timestamp comment to main.py
$mainFile = "backend\main.py"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Read the file
$content = Get-Content $mainFile -Raw

# Add version comment at top (if not already there)
if ($content -notmatch "# DEPLOY_TIMESTAMP") {
    $newContent = "# DEPLOY_TIMESTAMP: $timestamp`n" + $content
    Set-Content $mainFile $newContent
    Write-Host "✅ Added timestamp trigger to main.py"
}

# Commit and push
git add backend/main.py
git commit -m "chore: redeploy trigger - $timestamp"
git push origin odd2

Write-Host "✅ Redeploy triggered!"
Write-Host ""
Write-Host "📌 Manual Deploy on Render:"
Write-Host "1. Go to https://dashboard.render.com"
Write-Host "2. Select service"
Write-Host "3. Click 'Manual Deploy'"
Write-Host "4. Wait for completion"
