// 놀이터 랭킹 API — Cloudflare Worker + TiDB Cloud (serverless HTTP driver)
// DB 접속정보는 코드에 없음. 배포 시 시크릿으로 주입: wrangler secret put DATABASE_URL
import { connect } from '@tidbcloud/serverless';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (!env.DATABASE_URL) return json({ error: 'DATABASE_URL secret not set' }, 500);

    const conn = connect({ url: env.DATABASE_URL });
    try {
      // ---- 점수 제출: (name, game)별 최고점만 유지 ----
      if (request.method === 'POST') {
        let b;
        try { b = JSON.parse(await request.text()); } catch { return json({ error: 'bad json' }, 400); }
        const name = String(b.name ?? '').slice(0, 16);
        const game = String(b.game ?? '').slice(0, 32);
        const avatar = String(b.avatar ?? '').slice(0, 16);
        const score = Math.max(0, Math.min(1e9, parseInt(b.score, 10) || 0));
        const ts = parseInt(b.ts, 10) || Date.now();
        if (!name || !game) return json({ error: 'name and game required' }, 400);
        await conn.execute(
          'INSERT INTO scores (name, game, avatar, score, ts) VALUES (?, ?, ?, ?, ?) ' +
          'ON DUPLICATE KEY UPDATE avatar = VALUES(avatar), score = GREATEST(score, VALUES(score)), ts = VALUES(ts)',
          [name, game, avatar, score, ts]
        );
        return json({ ok: true });
      }

      // ---- 랭킹 조회: 게임별 상위 10명(점수 내림차순) ----
      const rows = await conn.execute(
        'SELECT name, avatar, game, score FROM scores ORDER BY game ASC, score DESC'
      );
      const games = {};
      for (const r of rows) {
        (games[r.game] = games[r.game] || []);
        if (games[r.game].length < 10) games[r.game].push({ name: r.name, avatar: r.avatar, score: Number(r.score) });
      }
      return json({ games });
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, 500);
    }
  },
};
