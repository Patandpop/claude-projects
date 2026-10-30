# Build ahead: the afternoon run that builds the lessons Patryk asked for in the planner, never past 19:00.
# See lanes/design-build-ahead.md. Rules live in build-ahead.js (checked by planner/tests/build-ahead.test.js).
#
#   .\planner\tools\build-ahead.ps1            one run now (the rules decide whether anything happens)
#   .\planner\tools\build-ahead.ps1 -DryRun    show the decision and the instructions, build nothing, mark nothing
#   .\planner\tools\build-ahead.ps1 -Install   make the Windows scheduled task (weekdays 15:45), once, by Patryk
#   .\planner\tools\build-ahead.ps1 -Remove    remove that task
# Off switch: make an empty file planner\tools\.build-ahead-off (holidays, or whenever he wants quiet).
param([switch]$DryRun, [switch]$Install, [switch]$Remove)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$log = Join-Path $root 'planner\tools\build-ahead.log'
$task = 'Science lessons - build ahead'   # no colon: Windows refuses task names with one
function Say($t) { $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm')  $t"; Add-Content $log $line; Write-Host $line }

if ($Install) {
  $ps = (Get-Command powershell.exe).Source
  $action = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At 15:45
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 4) -MultipleInstances IgnoreNew
  try { Register-ScheduledTask -TaskName $task -Action $action -Trigger $trigger -Settings $settings -Force -ErrorAction Stop | Out-Null }
  catch { Say "install FAILED: $($_.Exception.Message)"; exit 1 }
  Say "installed the scheduled task '$task' (weekdays 15:45; the rules inside decide whether to build)"
  exit
}
if ($Remove) { Unregister-ScheduledTask -TaskName $task -Confirm:$false; Say "removed the scheduled task '$task'"; exit }

Set-Location $root
# another Claude session on this PC means somebody (or another run) is working: stay out of the way
$busy = Get-CimInstance Win32_Process -Filter "Name='node.exe' or Name='claude.exe'" | Where-Object { $_.CommandLine -match 'claude' -and $_.CommandLine -match '-p |--model' }
if ($busy) { $env:BUILD_AHEAD_BUSY = '1' } else { $env:BUILD_AHEAD_BUSY = '0' }

if ($DryRun) {
  $d = node planner/tools/build-ahead.js check | ConvertFrom-Json
  Write-Host ("Decision: " + ($d | ConvertTo-Json -Compress))
  if ($d.run) { Write-Host "`nInstructions the session would get:`n"; node planner/tools/build-ahead.js prompt }
  exit
}

# "start" is the only step that marks today as run; the dry run above used "check", which writes nothing
$d = node planner/tools/build-ahead.js start | ConvertFrom-Json
if (-not $d.run) { Say "no run: $($d.why)"; exit }
Say "run: $($d.why); requests $($d.requests -join ', '); ends by $($d.hardStop)"
$prompt = node planner/tools/build-ahead.js prompt | Out-String
$env:ANTHROPIC_API_KEY = $null     # his subscription login, never the paid API
$out = Join-Path $root 'planner\tools\build-ahead-run.log'
$p = Start-Process -FilePath 'claude' -ArgumentList @('-p', ('"' + $prompt.Replace('"', '\"') + '"'), '--model', 'claude-opus-5-5', '--permission-mode', 'auto') -PassThru -NoNewWindow -RedirectStandardOutput $out
# the hard stop: whatever happens, the session is ended at hardStop so nothing runs past 19:00
$stopAt = Get-Date ("$(Get-Date -Format 'yyyy-MM-dd') $($d.hardStop)")
while (-not $p.HasExited -and (Get-Date) -lt $stopAt) { Start-Sleep -Seconds 30 }
if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force; Say "stopped the session at $($d.hardStop) (hard stop); any unfinished lesson keeps its request open" }
else { Say "the session finished on its own (exit $($p.ExitCode))" }
if (Test-Path $out) { Get-Content $out -Tail 12 | ForEach-Object { Say "  $_" } }
