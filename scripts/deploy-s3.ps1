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
foreach ($Asset in @("assets/css/style.css", "assets/js/app.js")) {
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
  "--exclude", "design/*"
)

if ($DryRun) {
  $SyncArgs += "--dryrun"
}

Write-Host "Deploying $RepoRoot to $Destination..."
aws @SyncArgs

if ($CloudFrontDistributionId -and -not $DryRun) {
  Write-Host "Creating CloudFront invalidation for distribution $CloudFrontDistributionId..."
  aws cloudfront create-invalidation `
    --distribution-id $CloudFrontDistributionId `
    --paths "/*"
}

Write-Host "Deployment complete."
