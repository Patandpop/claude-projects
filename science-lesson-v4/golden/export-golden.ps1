# Exports every slide of every reference deck to PNG.
#
# Uses PowerPoint's own Export API rather than LibreOffice: soffice is not installed
# on this machine, and PowerPoint renders the deck with the exact engine it is authored
# for, with no intermediate PDF (so PyMuPDF is not needed either). Same method as
# design-audit/export-slides.ps1, which this repo already relies on.
#
# Read-only with respect to the decks: each presentation is opened ReadOnly and
# without a window, then closed again. No synthetic input is used.

$ErrorActionPreference = 'Stop'

$root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$decks  = Join-Path $root 'build'
$outDir = Join-Path $root 'raw'

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$ppt = $null
try {
    $ppt = New-Object -ComObject PowerPoint.Application
} catch {
    Write-Error "Could not start PowerPoint: $($_.Exception.Message)"
    exit 1
}

$exported = 0
try {
    foreach ($deck in (Get-ChildItem $decks -Filter *.pptx | Sort-Object Name)) {
        $target = Join-Path $outDir $deck.BaseName
        if (Test-Path $target) { Remove-Item $target -Recurse -Force }

        $pres = $ppt.Presentations.Open($deck.FullName, $true, $false, $false)  # ReadOnly, no window
        try {
            $pres.Export($target, 'PNG', 1920, 1080)
            $n = (Get-ChildItem $target -Filter *.PNG -ErrorAction SilentlyContinue).Count
            $exported += $n
            Write-Output ("{0,-34} {1,3} slides" -f $deck.BaseName, $n)
        } finally {
            $pres.Close()
        }
    }
} finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}

Write-Output "TOTAL PNGs: $exported"
