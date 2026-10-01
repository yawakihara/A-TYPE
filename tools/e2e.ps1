# E2Eテスト: Edgeヘッドレスで tools/e2e.html を実行し、結果を表示する。
# 事前に `node tools/serve.mjs` でローカルサーバーを起動しておくこと。
param([int]$TimeoutSec = 240)
$edge = @("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", "C:\Program Files\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Error "Edge が見つかりません"; exit 2 }
$report = Join-Path $env:TEMP "voidlance-report-e2e.json"
if (Test-Path $report) { Clear-Content $report }
$profileDir = Join-Path $env:TEMP "voidlance-edge-profile-e2e"
$p = Start-Process -FilePath $edge -ArgumentList "--headless=new", "--disable-gpu", "--no-sandbox", "--autoplay-policy=no-user-gesture-required", "--user-data-dir=$profileDir", "http://localhost:8123/tools/e2e.html" -PassThru
$sw = [Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
  if ((Test-Path $report) -and (Get-Item $report).Length -gt 10) { break }
  Start-Sleep -Milliseconds 500
}
& taskkill /T /F /PID $p.Id 2>&1 | Out-Null
if (-not (Test-Path $report) -or (Get-Item $report).Length -le 10) { Write-Host "レポートが取得できませんでした"; exit 2 }
$results = Get-Content $report -Raw | ConvertFrom-Json
$fail = 0
foreach ($r in $results) {
  if ($r.ok) { $mark = "PASS" } else { $mark = "FAIL"; $fail++ }
  Write-Host ("[{0}] {1} : {2}" -f $mark, $r.name, $r.detail)
}
Write-Host ("結果: {0} 件中 {1} 件失敗" -f $results.Count, $fail)
exit $fail
