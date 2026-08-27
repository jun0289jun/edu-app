# DB 백업 · 복원

## 요약

매일 21:00 에 Windows 작업 스케줄러가 자동 실행한다.
SQL 덤프(`CREATE TABLE` + `INSERT`)를 gzip 압축해 **두 곳**에 저장한다.

| 위치 | 경로 |
|------|------|
| 로컬 | `C:\WORK\edu-app\backups\` |
| 네트워크 공유 | `\\MJ-YJ_Home\YJ\정리완료\업무\dideum\02.Agency\개발\db_backups\` |

파일명은 `edu-app_YYYYMMDD_HHMMSS.sql.gz` (dideum 프로젝트와 동일한 규칙).
백업은 30일, 로그는 90일 보관 후 자동 삭제된다.

## 왜 JSON 이 아니라 SQL 인가

JSON 백업은 전용 복원 스크립트가 있어야 쓸 수 있다. 프로젝트가 통째로
사라지는 상황에서는 그 스크립트도 함께 없어진다.
SQL 덤프는 파일 안에 `CREATE TABLE` 이 들어 있어 아무 MySQL 클라이언트로도
복구되고, `PRIMARY KEY (name, game)` 같은 스키마 정보가 파일 자체에 남는다.

## 수동 실행

```powershell
cd C:\WORK\edu-app
node --env-file=.env scripts/backup-db.mjs
```

## 복원

먼저 미리보기로 무엇이 복원되는지 확인한다. `--apply` 없이는 아무것도 쓰지 않는다.

```powershell
node --env-file=.env scripts/restore-db.mjs backups\edu-app_20260828_030016.sql.gz
```

실제 복원:

```powershell
node --env-file=.env scripts/restore-db.mjs backups\edu-app_20260828_030016.sql.gz --apply
```

복원은 **덮어쓰기(upsert)** 방식이다. 같은 키가 있으면 백업 내용으로 갱신하고,
백업에 없는 행은 그대로 둔다. 여러 번 실행해도 안전하다.

### 스크립트 없이 복원하기

`.sql.gz` 압축을 풀면 평범한 SQL 파일이다. MySQL 클라이언트에 그대로 넣어도 된다.

```powershell
# 압축 해제
node -e "require('fs').writeFileSync('dump.sql', require('zlib').gunzipSync(require('fs').readFileSync('backups/edu-app_20260828_030016.sql.gz')))"
```

## 스케줄러 관리

```powershell
# 상태 확인 (LastTaskResult 0 = 성공, 2 = 공유 저장 실패, 그 외 = 실패)
Get-ScheduledTaskInfo -TaskName "edu-app DB backup"

# 즉시 실행
Start-ScheduledTask -TaskName "edu-app DB backup"

# 시간 변경 (예: 매일 23시)
$t = New-ScheduledTaskTrigger -Daily -At "23:00"
Set-ScheduledTask -TaskName "edu-app DB backup" -Trigger $t
```

로그: `logs\backup-YYYY-MM-DD.log`

PC 가 꺼져 있어 실행을 놓치면, 켜진 뒤 곧바로 자동 실행된다(`StartWhenAvailable`).

## 주의

- `backups/` 와 `*.sql.gz` 는 `.gitignore` 에 있다.
  백업에는 아이들 그림·메모·PIN 이 들어 있으므로 **GitHub 에 올리지 않는다.**
- `scripts\backup.ps1` 은 UTF-8 **BOM 포함**으로 저장해야 한다.
  Windows PowerShell 5.1 은 BOM 없는 `.ps1` 을 ANSI 로 읽어 한글이 깨진다.
