# Exports every slide of every deck in design-audit/decks to PNG via PowerPoint's own
# Export API. Read-only with respect to the decks; writes PNGs into design-audit/raw/<deck>/.
# No synthetic input: PowerPoint is opened without a window and closed again.

$ErrorActionPreference = 'Stop'

$root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$decks  = Join-Path $root 'decks'
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
            # 1920x1080 PNG per slide
            $pres.Export($target, 'PNG', 1920, 1080)
            $n = (Get-ChildItem $target -Filter *.PNG -ErrorAction SilentlyContinue).Count
            $exported += $n
            Write-Output ("{0,-38} {1,3} slides" -f $deck.BaseName, $n)
        } finally {
            $pres.Close()
        }
    }
} finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}

Write-Output "TOTAL PNGs: $exported"
