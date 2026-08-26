import { connect } from "@tidbcloud/serverless";
import { type Express, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";

const MAX_TEXT = 100_000;
const MAX_IMAGE = 1_600_000;

function cors(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function jsonBody(req: Request) {
  if (typeof req.body === "string") return JSON.parse(req.body);
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
  return req.body ?? {};
}

// recipients는 JSON 컬럼이라 드라이버가 이미 배열로 반환한다.
// String([]) === "" 이므로 JSON.parse에 그대로 넘기면 SyntaxError가 난다.
function parseRecipients(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((x) => String(x));
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

async function ensureWorksTable(db: ReturnType<typeof connect>) {
  await db.execute(
    "CREATE TABLE IF NOT EXISTS works (" +
      "id VARCHAR(40) NOT NULL PRIMARY KEY, owner VARCHAR(16) NOT NULL, " +
      "owner_avatar VARCHAR(16) NOT NULL DEFAULT '', type VARCHAR(16) NOT NULL, " +
      "title VARCHAR(80) NOT NULL DEFAULT '', content MEDIUMTEXT NOT NULL, " +
      "recipients JSON NOT NULL, ts BIGINT NOT NULL DEFAULT 0, " +
      "INDEX idx_works_ts (ts), INDEX idx_works_owner (owner))",
  );
}

export function registerWorkRoutes(app: Express) {
  app.options("/api/works", (_req, res) => {
    cors(res);
    res.sendStatus(200);
  });

  app.get("/api/works", async (req, res) => {
    cors(res);
    const profile = String(req.query.profile ?? "").slice(0, 12);
    const type = String(req.query.type ?? "").slice(0, 16);
    if (!profile) {
      res.status(400).json({ error: "profile required" });
      return;
    }
    if (!process.env.DATABASE_URL) {
      res.status(503).json({ error: "database unavailable" });
      return;
    }

    try {
      const db = connect({ url: process.env.DATABASE_URL });
      await ensureWorksTable(db);
      // 소유자/수신자와 종류를 SQL에서 걸러낸다. 예전처럼 전체 행을 content까지
      // 읽어와 JS에서 거르면 그림 몇 장만 쌓여도 응답이 수십 MB가 된다.
      const params: (string | number)[] = [profile, profile];
      let sql =
        "SELECT id, owner, owner_avatar, type, title, content, recipients, ts " +
        "FROM works WHERE (owner = ? OR JSON_CONTAINS(recipients, JSON_QUOTE(?)))";
      if (type) {
        sql += " AND type = ?";
        params.push(type);
      }
      sql += " ORDER BY ts DESC LIMIT 100";
      const result = await db.execute(sql, params);
      const rows = result as any[];
      const works = rows.map((row: any) => ({
        id: String(row.id),
        owner: String(row.owner),
        ownerAvatar: String(row.owner_avatar || "🐥"),
        type: String(row.type),
        title: String(row.title || ""),
        content: String(row.content || ""),
        recipients: parseRecipients(row.recipients),
        ts: Number(row.ts),
      }));
      res.json({ works });
    } catch (error) {
      console.error("[Works GET]", error);
      res.status(500).json({ error: "server error" });
    }
  });

  app.post("/api/works", async (req, res) => {
    cors(res);
    if (!process.env.DATABASE_URL) {
      res.status(503).json({ error: "database unavailable" });
      return;
    }

    try {
      const data = jsonBody(req);
      const action = String(data.action || "save");
      const owner = String(data.owner || "").slice(0, 12);
      if (!owner) {
        res.status(400).json({ error: "owner required" });
        return;
      }
      const db = connect({ url: process.env.DATABASE_URL });
      await ensureWorksTable(db);

      if (action === "delete") {
        const id = String(data.id || "").slice(0, 40);
        await db.execute("DELETE FROM works WHERE id = ? AND owner = ?", [
          id,
          owner,
        ]);
        res.json({ ok: true });
        return;
      }

      const id = String(data.id || randomUUID()).slice(0, 40);
      const type = String(data.type || "").slice(0, 16);
      const title = String(data.title || "").slice(0, 80);
      const ownerAvatar = String(data.ownerAvatar || "🐥").slice(0, 16);
      const content = String(data.content || "");
      const recipients = Array.isArray(data.recipients)
        ? data.recipients
            .map((name: unknown) => String(name).slice(0, 12))
            .filter(Boolean)
            .slice(0, 20)
        : [];
      const ts = Math.floor(Number(data.ts || Date.now()));
      const limit = type === "memo" ? MAX_TEXT : MAX_IMAGE;
      if (!["memo", "drawing", "photo"].includes(type) || !content) {
        res.status(400).json({ error: "invalid work" });
        return;
      }
      if (content.length > limit) {
        res.status(413).json({ error: "work too large" });
        return;
      }

      await db.execute(
        "INSERT INTO works (id, owner, owner_avatar, type, title, content, recipients, ts) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
          "ON DUPLICATE KEY UPDATE owner_avatar=VALUES(owner_avatar), title=VALUES(title), " +
          "content=VALUES(content), recipients=VALUES(recipients), ts=VALUES(ts)",
        [
          id,
          owner,
          ownerAvatar,
          type,
          title,
          content,
          JSON.stringify(recipients),
          ts,
        ],
      );
      res.json({ ok: true, id });
    } catch (error) {
      console.error("[Works POST]", error);
      res.status(500).json({ error: "server error" });
    }
  });
}
