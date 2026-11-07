param(
  [string]$BucketName = "inburgering",
  [string]$Region = "us-east-1",
  [string]$CloudFrontDistributionId = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI was not found. Install it and run 'aws configure' before deploying."
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Destination = "s3://$BucketName"

# index.html must reference each asset by its current content hash, or returning browsers can mix old assets with new markup.
$IndexHtml = Get-Content -Raw (Join-Path $RepoRoot "index.html")
foreach ($Asset in @("assets/css/style.css", "assets/js/app.js", "assets/data/cards.json")) {
  $Hash = (Get-FileHash -Algorithm SHA256 (Join-Path $RepoRoot $Asset)).Hash.ToLower().Substring(0, 12)
  if (-not $IndexHtml.Contains("${Asset}?v=$Hash")) {
    throw "index.html references a stale version of $Asset. Set its ?v= value to $Hash before deploying."
  }
}

$SyncArgs = @(
  "s3", "sync", $RepoRoot, $Destination,
  "--region", $Region,
  "--delete",
  "--exclude", ".git/*",
  "--exclude", ".github/*",
  "--exclude", "README.md",
  "--exclude", "DEPLOY.md",
  "--exclude", ".gitignore",
  "--exclude", "scripts/*",
  "--exclude", "CLAUDE.md",
  "--exclude", ".claude/*",
  "--exclude", ".idea/*",
  "--exclude", "design/*",
  # Uploaded separately below with a no-cache header.
  "--exclude", "index.html"
)

# index.html goes last with "no-cache", so CloudFront and browsers revalidate it on every visit and pick up
# new deploys immediately; the CSS/JS it references are versioned by content hash and can stay cached.
$IndexArgs = @(
  "s3", "cp", (Join-Path $RepoRoot "index.html"), "$Destination/index.html",
  "--region", $Region,
  "--cache-control", "no-cache",
  "--content-type", "text/html; charset=utf-8"
)

if ($DryRun) {
  $SyncArgs += "--dryrun"
  $IndexArgs += "--dryrun"
}

Write-Host "Deploying $RepoRoot to $Destination..."
aws @SyncArgs
if ($LASTEXITCODE -ne 0) {
  throw "Syncing assets to $Destination failed; index.html was not updated."
}

aws @IndexArgs
if ($LASTEXITCODE -ne 0) {
  throw "Uploading index.html to $Destination failed."
}

if ($CloudFrontDistributionId -and -not $DryRun) {
  Write-Host "Creating CloudFront invalidation for distribution $CloudFrontDistributionId..."
  aws cloudfront create-invalidation `
    --distribution-id $CloudFrontDistributionId `
    --paths "/*"
}

Write-Host "Deployment complete."
