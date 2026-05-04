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

$SyncArgs = @(
  "s3", "sync", $RepoRoot, $Destination,
  "--region", $Region,
  "--delete",
  "--exclude", ".git/*",
  "--exclude", ".github/*",
  "--exclude", "README.md",
  "--exclude", "DEPLOY.md",
  "--exclude", ".gitignore",
  "--exclude", "scripts/*"
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
