import { type Express, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { getDb } from "./db";

// CORS 헤더 공통 설정
function setCorsHeaders(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function registerLeaderboardRoutes(app: Express) {
  // OPTIONS preflight
  app.options("/api/leaderboard", (req, res) => {
    setCorsHeaders(res);
    res.sendStatus(200);
  });

  // POST /api/leaderboard — 점수 저장 (name, game) 기준 최고점 upsert
  app.post("/api/leaderboard", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    try {
      // Content-Type: text/plain 으로 오므로 raw body를 직접 파싱
      let body: string = "";
      if (typeof req.body === "string") {
        body = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        body = req.body.toString("utf-8");
      } else if (req.body && typeof req.body === "object") {
        // express.json() 이 먼저 파싱한 경우
        body = JSON.stringify(req.body);
      }

      const data = JSON.parse(body);
      const name: string = String(data.name ?? "").slice(0, 12);
      const game: string = String(data.game ?? "").slice(0, 32);
      const avatar: string = String(data.avatar ?? "").slice(0, 16);
      const score: number = Math.floor(Number(data.score ?? 0));
      const ts: number = Math.floor(Number(data.ts ?? Date.now()));

      if (!name || !game || !Number.isInteger(score)) {
        res.status(400).send("invalid payload");
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).send("db unavailable");
        return;
      }

      // (name, game) 기준 최고점만 유지 — 현재 점수보다 높을 때만 갱신
      await db.execute(
        sql`INSERT INTO scores (name, game, avatar, score, ts)
         VALUES (${name}, ${game}, ${avatar}, ${score}, ${ts})
         ON DUPLICATE KEY UPDATE
           avatar = VALUES(avatar),
           score  = IF(VALUES(score) > score, VALUES(score), score),
           ts     = IF(VALUES(score) > score, VALUES(ts), ts)`
      );

      res.status(200).send("ok");
    } catch (err) {
      console.error("[Leaderboard POST]", err);
      res.status(500).send("server error");
    }
  });

  // GET /api/leaderboard — 게임별 상위 10명 랭킹 조회
  app.get("/api/leaderboard", async (_req: Request, res: Response) => {
    setCorsHeaders(res);
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ games: {} });
        return;
      }

      const rows = await db.execute(
        sql`SELECT game, name, avatar, score
         FROM (
           SELECT game, name, avatar, score,
                  ROW_NUMBER() OVER (PARTITION BY game ORDER BY score DESC) AS rn
           FROM scores
         ) ranked
         WHERE rn <= 10
         ORDER BY game, score DESC`
      );

      // rows[0] 은 RowDataPacket[] 형태
      const records = (rows as unknown[][])[0] as Array<{
        game: string;
        name: string;
        avatar: string;
        score: number;
      }>;

      const games: Record<string, Array<{ name: string; avatar: string; score: number }>> = {};
      for (const row of records) {
        if (!games[row.game]) games[row.game] = [];
        games[row.game].push({ name: row.name, avatar: row.avatar, score: row.score });
      }

      res.status(200).json({ games });
    } catch (err) {
      console.error("[Leaderboard GET]", err);
      res.status(500).json({ games: {} });
    }
  });
}
