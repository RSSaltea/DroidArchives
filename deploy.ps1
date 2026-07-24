# Deploy the Droid Archives site to BOTH GitHub Pages repos in one step.
#
#   origin   -> RSSaltea/DroidArchives           (custom domain droidarchives.co.uk, keeps CNAME)
#   fallback -> RSSaltea/DroidArchives-Fallback   (rssaltea.github.io/DroidArchives-Fallback/, NO CNAME)
#
# The fallback deliberately omits the CNAME file: that file is what makes GitHub
# Pages redirect the github.io URL to droidarchives.co.uk, which some users' IT
# filters block. Without it the fallback serves directly from the github.io URL.
#
# Usage: commit your changes on main, then run  .\deploy.ps1
#        (or `git deploy` if the alias below has been set up).

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Refuse to deploy a dirty tree so both repos always match a real commit.
if (git status --porcelain) {
  Write-Error 'Working tree has uncommitted changes. Commit or stash them before deploying.'
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()

Write-Host "1/2  Pushing $branch -> origin (droidarchives.co.uk)..."
git push origin $branch

Write-Host '2/2  Pushing CNAME-stripped mirror -> fallback (github.io)...'
$work = Join-Path $env:TEMP ('da-fallback-' + [guid]::NewGuid().ToString('N'))
git worktree add --detach $work HEAD | Out-Null
try {
  $cname = Join-Path $work 'CNAME'
  if (Test-Path $cname) { Remove-Item $cname -Force }
  git -C $work add -A
  # --allow-empty so a run with CNAME already absent still produces a commit to push.
  git -C $work commit --allow-empty -m 'Deploy fallback mirror (no custom domain)' | Out-Null
  git -C $work push --force fallback HEAD:main
} finally {
  git worktree remove --force $work
}

Write-Host ''
Write-Host 'Done. Live at:'
Write-Host '  https://droidarchives.co.uk/                             (origin)'
Write-Host '  https://rssaltea.github.io/DroidArchives-Fallback/       (fallback, no redirect)'
