# Packages science-lesson.skill from source files in science-lesson/
# Run from PowerShell: .\package-skill.ps1
# Output: science-lesson.skill in this directory

$ErrorActionPreference = 'Stop'

$ROOT      = $PSScriptRoot
$SKILL_DIR = Join-Path $ROOT "science-lesson"
$OUT       = Join-Path $ROOT "science-lesson.skill"
$MANIFEST  = Join-Path $ROOT "skill-manifest.json"

# The packed-file list lives in skill-manifest.json — the ONE place it is written.
# package-skill.js and .claude/hooks/auto-package-skill.js read the same file, so
# the three can no longer drift apart (they used to hold three hand-synced copies).
if (-not (Test-Path $MANIFEST)) {
    Write-Error "skill-manifest.json not found at $MANIFEST"
    exit 1
}
$ENTRIES = (Get-Content $MANIFEST -Raw | ConvertFrom-Json).entries

# Verify all source files exist
$missing = $ENTRIES | Where-Object { -not (Test-Path (Join-Path $SKILL_DIR $_)) }
if ($missing) {
    Write-Error "Missing source files:`n  $($missing -join "`n  ")"
    exit 1
}

# Delete old .skill so ZipFile::Open('Create') starts fresh
if (Test-Path $OUT) { Remove-Item $OUT -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($OUT, 'Create')

foreach ($entry in $ENTRIES) {
    $src  = Join-Path $SKILL_DIR $entry
    $dest = $entry -replace '\\', '/'
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, $src, $dest, [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
    Write-Host "  + $dest"
}

$zip.Dispose()

$date = Get-Date -Format 'yyyy-MM-dd'
$size = [math]::Round((Get-Item $OUT).Length / 1KB, 1)
Write-Host ""
Write-Host "Packed science-lesson.skill - $date ($($size) KB)"
Write-Host ""
Write-Host "Next: replace the old science-lesson.skill file in claude.ai with this one"
