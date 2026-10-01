# オーディオ検証: Edgeヘッドレスで tools/audiocheck.html を実行し、全BGM/SEの音量統計を表示する。
# 事前に `node tools/serve.mjs` でローカルサーバーを起動しておくこと。
param([int]$TimeoutSec = 180)
$edge = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", "C:\Program Files\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Error "Edge が見つかりません"; exit 2 }
$report = Join-Path $env:TEMP "voidlance-report-audio.json"
if (Test-Path $report) { Clear-Content $report }
$profileDir = Join-Path $env:TEMP "voidlance-edge-profile-audio"
$p = Start-Process -FilePath $edge -ArgumentList "--headless=new", "--disable-gpu", "--no-sandbox", "--user-data-dir=$profileDir", "http://localhost:8123/tools/audiocheck.html" -PassThru
$sw = [Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
  if ((Test-Path $report) -and (Get-Item $report).Length -gt 10) { break }
  Start-Sleep -Milliseconds 500
}
& taskkill /T /F /PID $p.Id 2>&1 | Out-Null
if (-not (Test-Path $report) -or (Get-Item $report).Length -le 10) { Write-Host "レポートが取得できませんでした"; exit 2 }
$j = Get-Content $report -Raw | ConvertFrom-Json
Write-Host "--- BGM (peak / rms / clip% / nan / quiet% / sec) ---"
$j.songs.PSObject.Properties | ForEach-Object { $v = $_.Value; Write-Host ("{0,-9} peak={1} rms={2} clip={3}% nan={4} quiet={5}% sec={6}" -f $_.Name, $v.peak, $v.rms, $v.clipPct, $v.nan, $v.quietPct, $v.sec) }
Write-Host "--- SE ---"
$j.sfx.PSObject.Properties | ForEach-Object { $v = $_.Value; Write-Host ("{0,-12} peak={1} rms={2} clip={3}% nan={4} quiet={5}%" -f $_.Name, $v.peak, $v.rms, $v.clipPct, $v.nan, $v.quietPct) }
