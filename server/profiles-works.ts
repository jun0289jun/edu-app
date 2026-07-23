/**
 * /api/profiles  — 프로필 목록 조회(GET) · 등록/수정(POST)
 * /api/works     — 작품 공유(POST) · 수신함 조회(GET)
 *
 * kid.js가 text/plain body로 POST하므로 leaderboard와 동일한 방식으로 처리.
 * 모든 엔드포인트는 CORS 전체 허용.
 */
import type { Express } from "express";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { profiles, works, scores } from "../drizzle/schema";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function setCors(res: import("express").Response) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

export function registerProfilesWorksRoutes(app: Express) {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  app.options("/api/profiles", (_, res) => { setCors(res); res.sendStatus(204); });
  app.options("/api/works", (_, res) => { setCors(res); res.sendStatus(204); });

  // ── GET /api/profiles ───────────────────────────────────────────────────────
  // 응답: { profiles: [{name, avatar}] }
  app.get("/api/profiles", async (_req, res) => {
    setCors(res);
    try {
      const db = await getDb();
      if (!db) { res.json({ profiles: [] }); return; }
      const rows = await db.select({ name: profiles.name, avatar: profiles.avatar })
        .from(profiles)
        .orderBy(profiles.updatedAt);
      res.json({ profiles: rows });
    } catch (e) {
      console.error("[profiles] GET error", e);
      res.status(500).json({ profiles: [] });
    }
  });

  // ── DELETE /api/profiles ─────────────────────────────────────────────────────
  // body (text/plain JSON): { name } OR POST with { action:'delete', name }
  app.delete("/api/profiles", async (req, res) => {
    setCors(res);
    try {
      let body: { name?: string };
      try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
      catch { res.status(400).json({ ok: false, error: "invalid json" }); return; }
      const name = String(body.name || "").slice(0, 32).trim();
      if (!name) { res.status(400).json({ ok: false, error: "name required" }); return; }
      const db = await getDb();
      if (!db) { res.json({ ok: true }); return; }
      await db.delete(profiles).where(eq(profiles.name, name));
      await db.delete(scores).where(eq(scores.name, name));
      await db.delete(works).where(eq(works.owner, name));
      res.json({ ok: true });
    } catch (e) {
      console.error("[profiles] DELETE error", e);
      res.status(500).json({ ok: false, error: "server error" });
    }
  });

  // ── POST /api/profiles ──────────────────────────────────────────────────────
  // body (text/plain JSON): { name, avatar, oldName? } OR { action:'delete', name }
  // 동작: action=delete면 삭제, oldName 있으면 rename, 없으면 upsert
  app.post("/api/profiles", async (req, res) => {
    setCors(res);
    try {
            let body: { name?: string; avatar?: string; oldName?: string; action?: string };
      try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
      catch { res.status(400).json({ ok: false, error: "invalid json" }); return; }
      const name = String(body.name || "").slice(0, 32).trim();
      const avatar = String(body.avatar || "🐥").slice(0, 16);
      const oldName = String(body.oldName || "").slice(0, 32).trim();
      const action = String(body.action || "");
      if (!name) { res.status(400).json({ ok: false, error: "name required" }); return; }
      const db = await getDb();
      if (!db) { res.json({ ok: true }); return; }

      // kid.js의 deleteProfileServer는 POST로 action:'delete' 전송
      if (action === "delete") {
        await db.delete(profiles).where(eq(profiles.name, name));
        await db.delete(scores).where(eq(scores.name, name));
        await db.delete(works).where(eq(works.owner, name));
        res.json({ ok: true });
        return;
      }

      if (oldName && oldName !== name) {
        // rename: profiles, scores, works 모두 이름 및 아바타 갱신
        await db.update(profiles)
          .set({ name, avatar, updatedAt: new Date() })
          .where(eq(profiles.name, oldName));
        // 없으면 새로 삽입
        await db.insert(profiles)
          .values({ name, avatar })
          .onDuplicateKeyUpdate({ set: { avatar, updatedAt: new Date() } });
        // scores 테이블: 이름 업데이트 (기본키 변경은 삭제+삽입)
        const oldScores = await db.select().from(scores).where(eq(scores.name, oldName));
        if (oldScores.length > 0) {
          const s = oldScores[0];
          await db.insert(scores)
            .values({ name, avatar, game: s.game, score: s.score, ts: s.ts })
            .onDuplicateKeyUpdate({ set: { avatar, score: s.score, ts: s.ts } });
          await db.delete(scores).where(eq(scores.name, oldName));
        }
        // works 테이블의 owner 이름도 갱신
        await db.update(works)
          .set({ owner: name, ownerAvatar: avatar })
          .where(eq(works.owner, oldName));
      } else {
        await db.insert(profiles)
          .values({ name, avatar })
          .onDuplicateKeyUpdate({ set: { avatar, updatedAt: new Date() } });
        // scores 아바타도 동기화
        await db.update(scores).set({ avatar }).where(eq(scores.name, name));
      }
      res.json({ ok: true });
    } catch (e) {
      console.error("[profiles] POST error", e);
      res.status(500).json({ ok: false, error: "server error" });
    }
  });

  // ── POST /api/works ─────────────────────────────────────────────────────────
  // body (text/plain JSON): { owner, ownerAvatar, type, title, content, recipients[], ts }
  app.post("/api/works", async (req, res) => {
    setCors(res);
    try {
      let body: {
        owner?: string; ownerAvatar?: string; type?: string;
        title?: string; content?: string; recipients?: string[]; ts?: number;
      };
      try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
      catch { res.status(400).json({ ok: false, error: "invalid json" }); return; }

      const owner = String(body.owner || "").slice(0, 32).trim();
      const type = String(body.type || "").slice(0, 32).trim();
      const content = String(body.content || "");

      if (!owner || !type || !content) {
        res.status(400).json({ ok: false, error: "owner, type, content required" });
        return;
      }

      const db = await getDb();
      if (!db) { res.json({ ok: true, id: 0 }); return; }

      const result = await db.insert(works).values({
        owner,
        ownerAvatar: String(body.ownerAvatar || "🐥").slice(0, 16),
        type,
        title: String(body.title || "").slice(0, 128),
        content,
        recipients: JSON.stringify(Array.isArray(body.recipients) ? body.recipients : []),
        ts: typeof body.ts === "number" ? body.ts : Date.now(),
      });

      res.json({ ok: true, id: (result as any)[0]?.insertId ?? 0 });
    } catch (e) {
      console.error("[works] POST error", e);
      res.status(500).json({ ok: false, error: "server error" });
    }
  });

  // ── GET /api/works?profile=xxx&type=yyy ─────────────────────────────────────
  // 응답: { works: [{id, owner, ownerAvatar, type, title, content, recipients, ts}] }
  app.get("/api/works", async (req, res) => {
    setCors(res);
    try {
      const profile = String(req.query.profile || "").slice(0, 32).trim();
      const type = String(req.query.type || "").slice(0, 32).trim();

      if (!profile || !type) {
        res.status(400).json({ works: [], error: "profile and type required" });
        return;
      }

      const db = await getDb();
      if (!db) { res.json({ works: [] }); return; }

      // recipients는 JSON 배열 문자열 — LIKE로 포함 여부 확인 (간단 구현)
      const rows = await db.select().from(works)
        .where(
          sql`${works.type} = ${type} AND JSON_CONTAINS(${works.recipients}, JSON_QUOTE(${profile}))`
        )
        .orderBy(sql`${works.ts} DESC`)
        .limit(100);

      res.json({
        works: rows.map(w => ({
          ...w,
          recipients: (() => { try { return JSON.parse(w.recipients); } catch { return []; } })(),
        })),
      });
    } catch (e) {
      console.error("[works] GET error", e);
      res.status(500).json({ works: [] });
    }
  });
}
