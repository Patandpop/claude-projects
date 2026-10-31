# cgp-stitch.ps1: puts two page pictures side by side into one picture, the way an online viewer shows a two-page
# spread. Used only by planner/tests/cgp-index.test.js to check that cgp-ocr.ps1 cuts a spread back into its pages.
#   powershell -NoProfile -ExecutionPolicy Bypass -File planner/tests/cgp-stitch.ps1 -Left a.png -Right b.png -Out spread.png
param([Parameter(Mandatory = $true)][string]$Left, [Parameter(Mandatory = $true)][string]$Right, [Parameter(Mandatory = $true)][string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$a = [System.Drawing.Image]::FromFile($Left); $b = [System.Drawing.Image]::FromFile($Right)
$s = New-Object System.Drawing.Bitmap ($a.Width + $b.Width), ([Math]::Max($a.Height, $b.Height))
$g = [System.Drawing.Graphics]::FromImage($s)
$g.Clear([System.Drawing.Color]::White)
$g.DrawImage($a, 0, 0, $a.Width, $a.Height)
$g.DrawImage($b, $a.Width, 0, $b.Width, $b.Height)
$g.Dispose(); $s.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png); $s.Dispose(); $a.Dispose(); $b.Dispose()
