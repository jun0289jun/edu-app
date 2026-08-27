# edu-app DB 백업 - Windows 작업 스케줄러용 래퍼
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup.ps1
#
# 로컬과 네트워크 공유 두 곳에 SQL 덤프를 저장하고, 날짜별 로그를 남긴다.
# 종료코드: 0 = 성공, 2 = 공유 저장 실패(로컬은 정상), 그 외 = 실패

$ErrorActionPreference = 'Continue'

# 스케줄러의 비대화형 세션은 콘솔 인코딩이 OEM 코드페이지라 node 의 UTF-8 출력이 깨진다.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 스크립트 위치 기준으로 프로젝트 루트를 잡는다 (스케줄러의 작업 폴더에 의존하지 않도록)
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$logDir = Join-Path $root 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("backup-" + (Get-Date -Format 'yyyy-MM-dd') + ".log")

function Write-Log([string]$msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
    Add-Content -Path $logFile -Value $line -Encoding utf8
}

Add-Content -Path $logFile -Value "" -Encoding utf8
Write-Log "===== 백업 시작 ====="

# node 가 PATH 에 없을 수 있으므로(스케줄러 환경) 확인 후 진행
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
    Write-Log "실패: node 를 찾을 수 없습니다. PATH 를 확인하세요."
    exit 1
}

$output = & $node --env-file=.env scripts\backup-db.mjs 2>&1
$code = $LASTEXITCODE

foreach ($line in $output) { Add-Content -Path $logFile -Value "    $line" -Encoding utf8 }

switch ($code) {
    0 { Write-Log "결과: 성공 (로컬 + 공유)" }
    2 { Write-Log "결과: 부분 성공 - 공유 경로 저장 실패, 로컬은 정상" }
    default { Write-Log "결과: 실패 (종료코드 $code)" }
}

# 로그도 90일치만 보관한다.
Get-ChildItem $logDir -Filter 'backup-*.log' -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-90) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

exit $code
