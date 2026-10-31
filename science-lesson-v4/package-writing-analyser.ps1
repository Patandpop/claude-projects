# Packages writing-analyser.skill from source files in writing-analyser/
# Run from PowerShell: .\package-writing-analyser.ps1
# Output: writing-analyser.skill in this directory. Upload it in claude.ai by replacing the old file
# (Settings > Capabilities > Skills), not through Projects.

$ErrorActionPreference = 'Stop'

$ROOT      = $PSScriptRoot
$SKILL_DIR = Join-Path $ROOT "writing-analyser"
$OUT       = Join-Path $ROOT "writing-analyser.skill"
$MANIFEST  = Join-Path $SKILL_DIR "manifest.json"

if (-not (Test-Path $MANIFEST)) {
    Write-Error "manifest.json not found at $MANIFEST"
    exit 1
}
$ENTRIES = (Get-Content $MANIFEST -Raw | ConvertFrom-Json).entries

$missing = $ENTRIES | Where-Object { -not (Test-Path (Join-Path $SKILL_DIR $_)) }
if ($missing) {
    Write-Error "Missing source files:`n  $($missing -join "`n  ")"
    exit 1
}

# Patryk's rule: no em dashes in anything he reads. Refuse to pack a text file that has one.
$dashed = $ENTRIES | Where-Object { $_ -match '\.(md|js|json)$' } | Where-Object {
    (Get-Content (Join-Path $SKILL_DIR $_) -Raw) -match ([char]0x2014)
}
if ($dashed) {
    Write-Error "Em dash found in:`n  $($dashed -join "`n  ")"
    exit 1
}

if (Test-Path $OUT) { Remove-Item $OUT -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($OUT, 'Create')

foreach ($entry in $ENTRIES) {
    $src  = Join-Path $SKILL_DIR $entry
    $dest = $entry -replace '\\', '/'   # same layout as science-lesson.skill: SKILL.md at the top
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $zip, $src, $dest, [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
    Write-Host "  + $dest"
}

$zip.Dispose()

$date = Get-Date -Format 'yyyy-MM-dd'
$size = [math]::Round((Get-Item $OUT).Length / 1KB, 1)
Write-Host ""
Write-Host "Packed writing-analyser.skill - $date ($($size) KB)"
Write-Host ""
Write-Host "Next: in claude.ai, replace the old writing-analyser.skill file with this one (not via Projects)"
