# Renders drinks one after another, waiting for any Blender render already running.
# Safe to re-run any time: finished frames are skipped, half-written (0-byte) frames are redone.
#   powershell -File blender\scripts\render_queue.ps1
param([string[]]$Drinks = @("classic-margarita", "tommys-margarita", "paloma", "ranch-water"), [int]$Samples = 160)

$dir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)   # ...\blender
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$queueLog = "$dir\renders\queue.log"

while (Get-Process blender -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 20 }

foreach ($d in $Drinks) {
    New-Item -ItemType Directory -Force "$dir\renders\$d" | Out-Null
    Get-ChildItem "$dir\renders\$d\*.png" -ErrorAction SilentlyContinue | Where-Object Length -eq 0 | Remove-Item
    "$(Get-Date -Format s) START $d" | Add-Content $queueLog
    & $blender -b "$dir\$d.blend" -P "$dir\scripts\render_frames.py" -- $Samples *> "$dir\renders\$d-render.log"
    $n = (Get-ChildItem "$dir\renders\$d\*.png" | Where-Object Length -gt 0).Count
    "$(Get-Date -Format s) DONE $d ($n frames)" | Add-Content $queueLog
}
"$(Get-Date -Format s) QUEUE FINISHED" | Add-Content $queueLog
