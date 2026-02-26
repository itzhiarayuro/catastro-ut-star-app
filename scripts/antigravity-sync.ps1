# Antigravity Sync Script
# This script backs up your local Antigravity conversation history and knowledge items to your project folder.
# This ensures you have a permanent copy that can be committed to Git.

$antigravityDir = "C:\Users\ICA2025\.gemini\antigravity"
$backupDir = Join-Path (Get-Location) ".antigravity"

# Create backup directories if they don't exist
$conversationsDest = Join-Path $backupDir "conversations"
$knowledgeDest = Join-Path $backupDir "knowledge"

if (-not (Test-Path $conversationsDest)) { New-Item -ItemType Directory -Path $conversationsDest -Force }
if (-not (Test-Path $knowledgeDest)) { New-Item -ItemType Directory -Path $knowledgeDest -Force }

Write-Host "🔄 Syncing Antigravity History..." -ForegroundColor Cyan

# Copy Conversations (.pb files)
$convSource = Join-Path $antigravityDir "conversations"
if (Test-Path $convSource) {
    Copy-Item -Path (Join-Path $convSource "*.pb") -Destination $conversationsDest -Force
    Write-Host "✅ Conversations backed up to $conversationsDest" -ForegroundColor Green
} else {
    Write-Warning "Conversations source not found: $convSource"
}

# Copy Knowledge Items
$knowledgeSource = Join-Path $antigravityDir "knowledge"
if (Test-Path $knowledgeSource) {
    Copy-Item -Path $knowledgeSource -Destination $backupDir -Recurse -Force
    Write-Host "✅ Knowledge items backed up to $knowledgeDest" -ForegroundColor Green
} else {
    Write-Warning "Knowledge source not found: $knowledgeSource"
}

Write-Host "🚀 Sync Complete! You can now commit the .antigravity/ folder to your Git repository." -ForegroundColor Yellow
