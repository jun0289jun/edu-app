import { connect } from "@tidbcloud/serverless";
import type { Express, Request, Response } from "express";

function cors(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function bodyOf(req: Request) {
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body || {};
}

export function registerProfileRoutes(app: Express) {
  app.options("/api/profiles", (_req, res) => {
    cors(res);
    res.sendStatus(200);
  });

  app.get("/api/profiles", async (_req, res) => {
    cors(res);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "db unavailable" });
    try {
      const db = connect({ url: process.env.DATABASE_URL });
      await db.execute(
        "CREATE TABLE IF NOT EXISTS profiles (name VARCHAR(16) PRIMARY KEY, avatar VARCHAR(16) NOT NULL DEFAULT '')"
      );
      const rows = await db.execute("SELECT name, avatar FROM profiles ORDER BY name");
      res.json({ profiles: rows });
    } catch (error) {
      console.error("[Profiles GET]", error);
      res.status(500).json({ error: "server error" });
    }
  });

  app.post("/api/profiles", async (req, res) => {
    cors(res);
    if (!process.env.DATABASE_URL) return res.status(503).json({ error: "db unavailable" });
    try {
      const data = bodyOf(req);

      // 프로필 삭제: 프로필 + 점수 + 보낸 작품까지 정리
      if (String(data.action ?? "") === "delete") {
        const delName = String(data.name ?? "").trim().slice(0, 12);
        if (!delName) return res.status(400).json({ error: "name required" });
        const db = connect({ url: process.env.DATABASE_URL });
        await db.execute(
          "CREATE TABLE IF NOT EXISTS profiles (name VARCHAR(16) PRIMARY KEY, avatar VARCHAR(16) NOT NULL DEFAULT '')"
        );
        await db.execute("DELETE FROM profiles WHERE name = ?", [delName]);
        try { await db.execute("DELETE FROM scores WHERE name = ?", [delName]); } catch {}
        try { await db.execute("DELETE FROM works WHERE owner = ?", [delName]); } catch {}
        return res.json({ ok: true });
      }

      const name = String(data.name ?? "").trim().slice(0, 12);
      const oldName = String(data.oldName ?? "").trim().slice(0, 12);
      const avatar = String(data.avatar || "🐥").slice(0, 16);
      if (!name) return res.status(400).json({ error: "name required" });

      const db = connect({ url: process.env.DATABASE_URL });
      await db.execute(
        "CREATE TABLE IF NOT EXISTS profiles (name VARCHAR(16) PRIMARY KEY, avatar VARCHAR(16) NOT NULL DEFAULT '')"
      );

      if (oldName && oldName !== name) {
        // 같은 게임의 새 이름 기록이 이미 있으면 더 높은 점수만 남긴다.
        await db.execute(
          "INSERT INTO scores (name, game, avatar, score, ts) " +
            "SELECT ?, game, ?, score, ts FROM scores WHERE name = ? " +
            "ON DUPLICATE KEY UPDATE avatar = VALUES(avatar), " +
            "score = GREATEST(score, VALUES(score)), ts = GREATEST(ts, VALUES(ts))",
          [name, avatar, oldName]
        );
        await db.execute("DELETE FROM scores WHERE name = ?", [oldName]);

        // 보낸 작품의 작성자 이름과 받은 사람 목록도 함께 이전한다.
        try {
          await db.execute("UPDATE works SET owner = ?, owner_avatar = ? WHERE owner = ?", [
            name,
            avatar,
            oldName,
          ]);
          const works = await db.execute(
            "SELECT id, recipients FROM works WHERE JSON_CONTAINS(recipients, JSON_QUOTE(?))",
            [oldName]
          );
          for (const work of works as Array<{ id: string; recipients: string | string[] }>) {
            const recipients = Array.isArray(work.recipients)
              ? work.recipients
              : JSON.parse(String(work.recipients || "[]"));
            const renamed = [...new Set(recipients.map((x: string) => (x === oldName ? name : x)))];
            await db.execute("UPDATE works SET recipients = ? WHERE id = ?", [
              JSON.stringify(renamed),
              work.id,
            ]);
          }
        } catch (error) {
          console.warn("[Profiles works migration skipped]", error);
        }
        await db.execute("DELETE FROM profiles WHERE name = ?", [oldName]);
      }

      await db.execute(
        "INSERT INTO profiles (name, avatar) VALUES (?, ?) ON DUPLICATE KEY UPDATE avatar = VALUES(avatar)",
        [name, avatar]
      );
      await db.execute("UPDATE scores SET avatar = ? WHERE name = ?", [avatar, name]);
      try {
        await db.execute("UPDATE works SET owner_avatar = ? WHERE owner = ?", [avatar, name]);
      } catch {
        // works 테이블이 아직 없는 설치도 프로필 편집은 정상 처리한다.
      }
      res.json({ ok: true, profile: { name, avatar } });
    } catch (error) {
      console.error("[Profiles POST]", error);
      res.status(500).json({ error: "server error" });
    }
  });
}
