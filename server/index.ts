import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { connect } from "@tidbcloud/serverless";
import { registerWorkRoutes } from "./works";
import { registerProfileRoutes } from "./profiles";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.text({ type: "text/plain", limit: "2mb" }));
  app.use(express.json({ limit: "2mb" }));
  registerWorkRoutes(app);
  registerProfileRoutes(app);

  // 리더보드
  const cors = (res: express.Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  };
  app.options("/api/leaderboard", (_req, res) => { cors(res); res.sendStatus(200); });
  app.get("/api/leaderboard", async (_req, res) => {
    cors(res);
    if (!process.env.DATABASE_URL) return res.status(503).json({ games: {} });
    try {
      const db = connect({ url: process.env.DATABASE_URL });
      const rows = await db.execute(
        "SELECT game, name, avatar, score FROM (SELECT game, name, avatar, score, ROW_NUMBER() OVER (PARTITION BY game ORDER BY score DESC) AS rn FROM scores) ranked WHERE rn <= 10 ORDER BY game, score DESC"
      ) as Array<{ game: string; name: string; avatar: string; score: number }>;
      const games: Record<string, Array<{ name: string; avatar: string; score: number }>> = {};
      for (const row of rows) {
        if (!games[row.game]) games[row.game] = [];
        games[row.game].push({ name: row.name, avatar: row.avatar, score: row.score });
      }
      res.json({ games });
    } catch (err) { console.error("[LB GET]", err); res.status(500).json({ games: {} }); }
  });
  app.post("/api/leaderboard", async (req, res) => {
    cors(res);
    if (!process.env.DATABASE_URL) return res.status(503).send("db unavailable");
    try {
      const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const name = String(data.name ?? "").slice(0, 12);
      const game = String(data.game ?? "").slice(0, 32);
      const avatar = String(data.avatar ?? "").slice(0, 16);
      const score = Math.floor(Number(data.score ?? 0));
      const ts = Math.floor(Number(data.ts ?? Date.now()));
      if (!name || !game) return res.status(400).send("invalid");
      const db = connect({ url: process.env.DATABASE_URL });
      await db.execute(
        "INSERT INTO scores (name, game, avatar, score, ts) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE avatar=VALUES(avatar), score=IF(VALUES(score)>score,VALUES(score),score), ts=IF(VALUES(score)>score,VALUES(ts),ts)",
        [name, game, avatar, score, ts]
      );
      res.send("ok");
    } catch (err) { console.error("[LB POST]", err); res.status(500).send("error"); }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "client", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
