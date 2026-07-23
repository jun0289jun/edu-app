# 놀이터 랭킹(리더보드) API 규격 — Manus 작업 요청서

아이 교육앱 "놀이터"에 **기기 간 온라인 랭킹**을 붙입니다.
클라이언트(놀이터 HTML/JS)는 이미 완성되어 있고, **백엔드(DB + API) 하나만** 만들면 됩니다.
아래 규격 그대로 엔드포인트 1개를 만들어 주세요. 완성되면 **엔드포인트 URL**만 알려주시면, 클라이언트에서 `kid.js`의 `LB_URL`에 넣어 연결합니다.

> 백엔드는 무엇으로든 무방합니다(Google Apps Script + Sheet / Firebase / 서버리스 KV 등). 아래 요청·응답 형식만 지키면 됩니다.

---

## 1. 저장 데이터
게임 점수 기록. **(name, game) 조합별로 "최고점 1개"만** 유지(같은 이름·같은 게임은 더 높은 점수로 갱신).

| 필드 | 타입 | 설명 |
|---|---|---|
| `name` | string | 플레이어 이름 (최대 12자, 임의 문자 가능 — 그대로 데이터로 취급) |
| `avatar` | string | 이모지 1개 (예: `🦊`) |
| `game` | string | 게임 키 (아래 목록) |
| `score` | number(정수) | 점수 |
| `ts` | number | 클라이언트 타임스탬프(ms). 참고용 |

### 게임 키 목록
`starcatch`(별잡기) · `snake`(뱀) · `maze`(미로) · `kobasket`(한영바구니) · `mathquiz`(계산기) · `numbers`(숫자키) · `typing`(타자연습) · `trace`(따라쓰기)
※ 목록에 없는 키가 와도 저장은 해주세요(앱이 늘 수 있음).

---

## 2. 점수 제출 — `POST {ENDPOINT}`
- **Content-Type: `text/plain;charset=utf-8`** (⚠️ CORS preflight 회피용. body는 JSON 문자열)
- 본문 예시:
```json
{"name":"하준","avatar":"🦊","game":"snake","score":20,"ts":1720000000000}
```
- 동작: `(name, game)` 기준으로 기존 점수보다 크면 갱신, 없으면 삽입.
- 응답: HTTP 200 (본문은 무엇이든 무방, 클라이언트는 성공 여부만 봄).

## 3. 랭킹 조회 — `GET {ENDPOINT}`
- 응답(JSON): 게임별로 **점수 내림차순** 배열(상위 10명 정도). 형식 고정:
```json
{
  "games": {
    "snake":     [ {"name":"민준","avatar":"🐶","score":25}, {"name":"하준","avatar":"🦊","score":20} ],
    "starcatch": [ {"name":"하준","avatar":"🦊","score":13} ]
  }
}
```
- 기록 없는 게임은 생략해도 되고, 빈 배열이어도 됩니다.

## 4. CORS (필수)
GET·POST **모두** 응답 헤더에:
```
Access-Control-Allow-Origin: *
```
- 클라이언트는 `text/plain`으로 보내 preflight(OPTIONS)를 피합니다. 만약 프레임워크상 OPTIONS가 온다면 200으로 응답해 주세요.
- Google Apps Script를 쓸 경우: `doPost(e)`에서 `e.postData.contents`를 `JSON.parse`, `doGet(e)`에서 위 JSON을 `ContentService.createTextOutput(...).setMimeType(JSON)`으로 반환. "웹 앱으로 배포 → 액세스 권한: 모든 사용자".

## 5. 참고 / 주의
- 가족용(아이+조카) 소규모, 인증 없음. score가 정수인지 정도만 가볍게 검증하면 충분.
- 어뷰징 방지 불필요(비경쟁 가족용). name 길이만 서버에서도 12자로 잘라주면 좋음.
- 완료 후 **엔드포인트 URL** 회신 → 클라이언트 `kid.js`의 `LB_URL`에 반영하면 즉시 동작.

---

## (선택) 프로필 API — 기기 간 프로필 공유
프로필(이름·아바타)을 서버에 두면, 다른 기기·브라우저에서도 "누구야?" 화면에서 골라 쓸 수 있습니다.
※ 이 엔드포인트가 **없어도** 클라이언트는 **랭킹 데이터에서 친구 목록을 유추**해 동작합니다(점수가 있는 아이만 보임).
   아래를 만들면 **점수가 없는 새 프로필도** 모든 기기에서 보입니다.

- **`GET {base}/api/profiles`** → `{ "profiles": [ {"name":"하준","avatar":"🦊"}, ... ] }`
- **`POST {base}/api/profiles`** (Content-Type: text/plain, body JSON `{name, avatar}`) → 이름 기준 upsert(아바타 갱신). 응답 200.
- CORS: `Access-Control-Allow-Origin: *` (레인지 API와 동일). name 최대 12자.
- 테이블 예: `CREATE TABLE IF NOT EXISTS profiles (name VARCHAR(16) PRIMARY KEY, avatar VARCHAR(16) NOT NULL DEFAULT '');`

클라이언트는 `kid.js`의 `PROFILES_URL`(기본 `.../api/profiles`)로 호출합니다.

---
클라이언트 관련 파일: `client/public/놀이터/kid.js`(전송·조회·프로필 로직), `랭킹.html`(랭킹 화면), `index.html`(프로필 선택/생성).
