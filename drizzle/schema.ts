import { bigint, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * 계수기 세션 기록 테이블
 * - sessionId 기반으로 비로그인 사용자도 저장 가능
 */
export const counterSessions = mysqlTable("counter_sessions", {
  id: int("id").autoincrement().primaryKey(),
  /** 브라우저 localStorage에서 생성한 고유 세션 ID */
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  /** 로그인 사용자의 경우 users.id 연결 (nullable) */
  userId: int("userId"),
  /** 현재 카운트 값 */
  count: int("count").notNull().default(0),
  /** 자리수 설정 (1~7) */
  digits: int("digits").notNull().default(4),
  /** 증가치 설정 */
  increment: int("increment").notNull().default(1),
  /** 최고 기록 */
  maxCount: int("maxCount").notNull().default(0),
  /** 총 클릭 횟수 */
  totalClicks: int("totalClicks").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CounterSession = typeof counterSessions.$inferSelect;
export type InsertCounterSession = typeof counterSessions.$inferInsert;

/**
 * 한글 학습 진도 테이블
 */
export const hangeulProgress = mysqlTable("hangeul_progress", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  userId: int("userId"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull().default("easy"),
  choPos: int("choPos").notNull().default(0),
  jungPos: int("jungPos").notNull().default(0),
  jongPos: int("jongPos").notNull().default(0),
  showJongsung: int("showJongsung").notNull().default(0),
  totalRead: int("totalRead").notNull().default(0),
  lastChar: varchar("lastChar", { length: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HangeulProgress = typeof hangeulProgress.$inferSelect;
export type InsertHangeulProgress = typeof hangeulProgress.$inferInsert;

/**
 * 음성 설정 영구 저장 테이블
 */
export const speechSettings = mysqlTable("speech_settings", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  userId: int("userId"),
  speed: mysqlEnum("speed", ["slow", "normal", "fast"]).notNull().default("normal"),
  tone: mysqlEnum("tone", ["low", "normal", "bright"]).notNull().default("normal"),
  voiceURI: varchar("voiceURI", { length: 256 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpeechSetting = typeof speechSettings.$inferSelect;
export type InsertSpeechSetting = typeof speechSettings.$inferInsert;

/**
 * 놀이터 프로필 테이블 (이름·아바타, 기기 간 공유)
 */
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 32 }).notNull().unique(),
  avatar: varchar("avatar", { length: 16 }).notNull().default("🐥"),
  pin: varchar("pin", { length: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

/**
 * 놀이터 작품 공유 테이블 (그림판·메모 등 가족 간 공유)
 */
export const works = mysqlTable("works", {
  id: int("id").autoincrement().primaryKey(),
  owner: varchar("owner", { length: 32 }).notNull(),
  ownerAvatar: varchar("ownerAvatar", { length: 16 }).notNull().default("🐥"),
  type: varchar("type", { length: 32 }).notNull(),
  title: varchar("title", { length: 128 }).notNull().default(""),
  content: text("content").notNull(),
  recipients: text("recipients").notNull(), // JSON array of names
  ts: bigint("ts", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Work = typeof works.$inferSelect;
export type InsertWork = typeof works.$inferInsert;

/**
 * 랭킹(scores) 테이블 - leaderboard.ts에서 사용
 * 테이블은 이미 DB에 존재, 스키마 타입만 선언
 */
export const scores = mysqlTable("scores", {
  name: varchar("name", { length: 32 }).notNull().primaryKey(),
  avatar: varchar("avatar", { length: 16 }).notNull().default("🐥"),
  game: varchar("game", { length: 32 }).notNull().default(""),
  score: int("score").notNull().default(0),
  ts: bigint("ts", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;