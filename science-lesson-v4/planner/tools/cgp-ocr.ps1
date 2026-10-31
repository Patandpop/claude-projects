# cgp-ocr.ps1: read the words off page pictures with the OCR that is built into Windows 10 and 11 (free, local,
# nothing leaves the PC). Used by planner/tools/cgp-index.js (lanes/design-cgp-scanner.md). One JSON file comes out
# per page picture: the picture's size, every line of text, and where each word sits on the page (so the tool can
# tell a big title at the top from the small print, and find the page number in a corner).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File planner/tools/cgp-ocr.ps1 -Folder <pages folder> [-Out <json folder>]
#
# Pictures: *.png or *.jpg in the folder, in page order by name (page-0004.png ...). Already-read pages are skipped
# unless -Force is given, so a long book can be read in several sittings.
param(
  [Parameter(Mandatory = $true)][string]$Folder,
  [string]$Out = '',
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Folder)) { throw "No such folder: $Folder" }
if (-not $Out) { $Out = Join-Path $Folder 'ocr' }
New-Item -ItemType Directory -Force $Out | Out-Null

[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime] | Out-Null
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $t) { $m = $asTask.MakeGenericMethod($t); $task = $m.Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }

[Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime] | Out-Null
$engine = $null
try { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language 'en-GB')) } catch { $engine = $null }
if (-not $engine) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
if (-not $engine) { throw 'Windows OCR is not available on this PC (Settings > Time and language > Language: add English (United Kingdom) with the Optical character recognition feature).' }

$files = Get-ChildItem -Path $Folder -File | Where-Object { $_.Extension -match '^\.(png|jpe?g)$' } | Sort-Object Name
$done = 0; $skipped = 0
foreach ($f in $files) {
  $target = Join-Path $Out ($f.BaseName + '.json')
  if ((Test-Path $target) -and -not $Force) { $skipped++; continue }
  $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($f.FullName)) ([Windows.Storage.StorageFile])
  $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bmp = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $res = Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
  $lines = @()
  foreach ($ln in $res.Lines) {
    $words = @()
    $x0 = [double]::MaxValue; $y0 = [double]::MaxValue; $x1 = 0; $y1 = 0
    foreach ($w in $ln.Words) {
      $r = $w.BoundingRect
      $words += [ordered]@{ t = $w.Text; x = [math]::Round($r.X); y = [math]::Round($r.Y); w = [math]::Round($r.Width); h = [math]::Round($r.Height) }
      if ($r.X -lt $x0) { $x0 = $r.X }; if ($r.Y -lt $y0) { $y0 = $r.Y }
      if ($r.X + $r.Width -gt $x1) { $x1 = $r.X + $r.Width }; if ($r.Y + $r.Height -gt $y1) { $y1 = $r.Y + $r.Height }
    }
    if ($words.Count -eq 0) { continue }
    $lines += [ordered]@{ text = $ln.Text; x = [math]::Round($x0); y = [math]::Round($y0); w = [math]::Round($x1 - $x0); h = [math]::Round($y1 - $y0); words = $words }
  }
  $page = [ordered]@{ file = $f.Name; width = $bmp.PixelWidth; height = $bmp.PixelHeight; angle = $res.TextAngle; lines = $lines }
  $json = $page | ConvertTo-Json -Depth 6 -Compress
  [System.IO.File]::WriteAllText($target, $json, (New-Object System.Text.UTF8Encoding $false))
  $stream.Dispose(); $bmp.Dispose()
  $done++
  if ($done % 10 -eq 0) { Write-Host ("read {0} pages" -f $done) }
}
Write-Host ("OCR done: {0} pages read, {1} already read, JSON in {2}" -f $done, $skipped, $Out)
