# 놀이터 랭킹 API (Cloudflare Worker + TiDB)

브라우저는 MySQL에 직접 접속 못 하므로, **작은 서버리스 함수 1개**가 브라우저와 TiDB 사이에 필요합니다.
이 폴더가 그 서버입니다. **DB 접속정보는 코드에 없고**, 배포할 때 시크릿(환경변수)으로만 넣습니다.
Manus 불필요 · 무료(Cloudflare Workers 무료 티어) · 한 번만 배포하면 끝.

```
브라우저(놀이터) ──HTTPS──▶ 이 Worker ──HTTPS──▶ TiDB(scores 테이블)
      GET/POST            DATABASE_URL 시크릿
```

## 한 번만 하는 배포 (약 5분)

사전: Node.js 설치돼 있어야 함. 이 폴더에서 진행.

**1) 패키지 설치**
```
cd leaderboard-api
npm install
```

**2) TiDB에 테이블 만들기**
TiDB Cloud 콘솔 → 해당 클러스터 → **SQL Editor(Chat2Query)** 에서 `schema.sql` 내용을 붙여넣고 실행.
(또는 mysql 클라이언트로 접속해 `schema.sql` 실행)

**3) Cloudflare 로그인 + 시크릿 주입 + 배포**
```
npx wrangler login                     # 브라우저 열림 → Cloudflare 로그인(무료 가입)
npx wrangler secret put DATABASE_URL   # 아래 값을 붙여넣기(엔터). 화면/파일에 저장 안 됨
npx wrangler deploy                    # 배포 → URL 출력됨
```
`DATABASE_URL` 에 넣을 값 = TiDB 연결 문자열. `?ssl=...` 뒷부분은 빼고 이 형태로:
```
mysql://<사용자이름>:<비밀번호>@gateway04.us-east-1.prod.aws.tidbcloud.com:4000/<DB이름>
```

**4) 배포되면 이런 URL이 나옵니다**
```
https://nolteo-leaderboard.<당신서브도메인>.workers.dev
```
👉 이 **URL을 알려주시면** 제가 `놀이터/kid.js`의 `LB_URL`에 넣고 재배포합니다. 그 순간 랭킹이 켜집니다.

## 동작 확인(선택)
- 랭킹 조회: 브라우저로 위 URL 열기 → `{"games":{}}` 나오면 정상(아직 점수 없음).
- 점수 넣기 테스트:
```
curl -X POST <URL> -H "Content-Type: text/plain" -d "{\"name\":\"테스트\",\"avatar\":\"🦊\",\"game\":\"snake\",\"score\":10}"
```
다시 URL 열면 `snake`에 기록이 보임.

## ⚠️ 보안
- TiDB 비밀번호가 채팅에 노출됐으니, **작동 확인 후 TiDB Cloud에서 비밀번호 재설정** 권장.
  재설정하면 `npx wrangler secret put DATABASE_URL` 를 새 값으로 한 번 더 실행하면 됩니다.
- `DATABASE_URL` 은 Cloudflare 시크릿에만 있고, 이 repo/코드/브라우저에는 절대 들어가지 않습니다.

## 대안: Vercel로 배포하고 싶다면
같은 `worker.js` 로직을 Vercel Serverless Function(`api/lb.js`)으로 옮기면 됩니다. 요청 시 변환해 드립니다.
규격은 `../LEADERBOARD_API.md` 참고.
