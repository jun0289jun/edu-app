/**
 * edu-app TiDB 백업 (SQL 덤프)
 *
 *   node --env-file=.env scripts/backup-db.mjs
 *
 * CREATE TABLE + INSERT 이 담긴 .sql.gz 를 로컬과 네트워크 공유 두 곳에 저장한다.
 * 복원 스크립트가 없어도 아무 MySQL 클라이언트로 복구할 수 있는 형식이다.
 *
 * 생성되는 SQL의 중요한 성질:
 *  - 문자열 안의 개행은 \n 으로 이스케이프되므로, 실제 개행은 문장 구분에만 쓰인다.
 *    따라서 ";\n" 으로 안전하게 문장을 나눌 수 있다.
 *  - CREATE TABLE IF NOT EXISTS / ON DUPLICATE KEY UPDATE 라서 몇 번 실행해도 안전하다.
 */
import { connect } from "@tidbcloud/serverless";
import { gzipSync } from "node:zlib";
import { writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, copyFileSync } from "node:fs";
import path from "node:path";

const TABLES = [
  "profiles",
  "scores",
  "works",
  "users",
  "counter_sessions",
  "hangeul_progress",
  "speech_settings",
];

const PAGE = 100;      // 그림이 커서 한 번에 조금씩 읽는다
const KEEP_DAYS = 30;  // 보관 기간
const MAX_BATCH_CHARS = 256 * 1024; // INSERT 한 문장의 대략적 상한

const LOCAL_DIR = process.env.BACKUP_DIR || path.resolve("backups");
const SHARE_DIR =
  process.env.BACKUP_SHARE_DIR ||
  "\\\\MJ-YJ_Home\\YJ\\정리완료\\업무\\dideum\\02.Agency\\개발\\db_backups";

// 공유 폴더에 여러 프로젝트 백업이 모이므로 dideum_YYYYMMDD_HHMMSS 규칙에 맞춘다.
function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_` +
         `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function fmtDate(v) {
  const p = (n) => String(n).padStart(2, "0");
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ` +
         `${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
}

const ESCAPES = {
  "\0": "\\0", "\b": "\\b", "\t": "\\t", "\n": "\\n",
  "\r": "\\r", "\x1a": "\\Z", "'": "\\'", "\\": "\\\\",
};

/** MySQL 문자열 리터럴로 변환. 개행을 \n 으로 바꾸는 것이 문장 분리의 전제다. */
function sqlValue(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return `'${fmtDate(v)}'`;
  // JSON 컬럼은 드라이버가 배열/객체로 돌려주므로 문자열로 되돌린다.
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return "'" + s.replace(/[\0\b\t\n\r\x1a'\\]/g, (c) => ESCAPES[c]) + "'";
}

async function dumpTable(db, table, write) {
  // 스키마: SHOW CREATE TABLE 결과에 PRIMARY KEY 등이 모두 들어 있다.
  const created = await db.execute(`SHOW CREATE TABLE \`${table}\``);
  const ddl = String(Object.values(created[0])[1]).replace(
    /^CREATE TABLE/i,
    "CREATE TABLE IF NOT EXISTS"
  );
  write(`\n-- ----------------------------------------------------------\n`);
  write(`-- 테이블: ${table}\n`);
  write(`-- ----------------------------------------------------------\n`);
  write(ddl.replace(/\n/g, " ").replace(/\s+/g, " ") + ";\n");

  let total = 0;
  let batch = [];
  let batchChars = 0;
  let cols = null;

  const flush = () => {
    if (!batch.length) return;
    const colList = cols.map((c) => `\`${c}\``).join(", ");
    const updates = cols.map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(", ");
    write(
      `INSERT INTO \`${table}\` (${colList}) VALUES ${batch.join(", ")} ` +
        `ON DUPLICATE KEY UPDATE ${updates};\n`
    );
    batch = [];
    batchChars = 0;
  };

  for (let offset = 0; ; offset += PAGE) {
    const page = await db.execute(
      `SELECT * FROM \`${table}\` ORDER BY 1 LIMIT ${PAGE} OFFSET ${offset}`
    );
    if (!page.length) break;
    for (const row of page) {
      if (!cols) cols = Object.keys(row);
      const tuple = "(" + cols.map((c) => sqlValue(row[c])).join(", ") + ")";
      batch.push(tuple);
      batchChars += tuple.length;
      total++;
      if (batchChars >= MAX_BATCH_CHARS) flush();
    }
    if (page.length < PAGE) break;
  }
  flush();
  return total;
}

function pruneOld(dir) {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  try {
    for (const f of readdirSync(dir)) {
      if (!f.startsWith("edu-app_") || !f.endsWith(".sql.gz")) continue;
      const full = path.join(dir, f);
      if (statSync(full).mtimeMs < cutoff) {
        unlinkSync(full);
        removed++;
      }
    }
  } catch {
    // 공유 경로가 잠깐 끊겨도 정리 실패로 백업 전체를 실패시키지 않는다.
  }
  return removed;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 이 없습니다. --env-file=.env 를 붙였는지 확인하세요.");
    process.exit(1);
  }
  const db = connect({ url: process.env.DATABASE_URL });

  const parts = [];
  const write = (s) => parts.push(s);

  write(`-- edu-app 데이터베이스 백업\n`);
  write(`-- 생성 시각: ${new Date().toISOString()}\n`);
  write(`-- 복원: 이 파일의 SQL 을 순서대로 실행하면 스키마와 데이터가 모두 복구됩니다.\n`);
  write(`--       여러 번 실행해도 안전합니다 (IF NOT EXISTS / ON DUPLICATE KEY UPDATE).\n`);
  write(`SET NAMES utf8mb4;\n`);

  const counts = {};
  for (const t of TABLES) {
    try {
      counts[t] = await dumpTable(db, t, write);
      console.log(`  ${t}: ${counts[t]}행`);
    } catch (e) {
      console.log(`  ${t}: 건너뜀 (${String(e).slice(0, 80)})`);
      write(`-- 테이블 ${t} 백업 실패: ${String(e).slice(0, 120)}\n`);
    }
  }

  const name = `edu-app_${stamp()}.sql.gz`;
  const gz = gzipSync(Buffer.from(parts.join(""), "utf8"));

  // 1) 로컬 — 실패하면 백업 자체가 실패다.
  mkdirSync(LOCAL_DIR, { recursive: true });
  const localFile = path.join(LOCAL_DIR, name);
  writeFileSync(localFile, gz);
  const mb = (gz.length / 1024 / 1024).toFixed(2);
  console.log(`\n[로컬]   ${localFile}  (${mb}MB)`);

  // 2) 네트워크 공유 — 끊겨 있어도 로컬 백업은 살린다.
  let shareOk = false;
  try {
    mkdirSync(SHARE_DIR, { recursive: true });
    copyFileSync(localFile, path.join(SHARE_DIR, name));
    console.log(`[공유]   ${path.join(SHARE_DIR, name)}`);
    shareOk = true;
  } catch (e) {
    console.error(`[공유]   실패 — ${String(e).slice(0, 140)}`);
    console.error(`         로컬 백업은 정상입니다. 공유 경로 연결을 확인하세요.`);
  }

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\n총 ${totalRows}행 백업 완료 (로컬 O / 공유 ${shareOk ? "O" : "X"})`);

  const rl = pruneOld(LOCAL_DIR);
  const rs = shareOk ? pruneOld(SHARE_DIR) : 0;
  if (rl || rs) console.log(`${KEEP_DAYS}일 지난 백업 정리: 로컬 ${rl}개, 공유 ${rs}개`);

  // 공유 저장 실패는 경고로 남기되, 스케줄러가 이상을 감지하도록 종료코드를 구분한다.
  process.exit(shareOk ? 0 : 2);
}

main().catch((e) => {
  console.error("백업 실패:", e);
  process.exit(1);
});
