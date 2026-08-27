/**
 * edu-app TiDB 복원 (SQL 덤프)
 *
 *   미리보기(기본):  node --env-file=.env scripts/restore-db.mjs backups/edu-app-....sql.gz
 *   실제 복원:       node --env-file=.env scripts/restore-db.mjs backups/edu-app-....sql.gz --apply
 *
 * 백업 SQL 은 문자열 안의 개행을 \n 으로 이스케이프하므로 ";\n" 으로 문장을 나눌 수 있다.
 * --apply 없이는 아무것도 쓰지 않는다.
 *
 * 참고: 이 스크립트가 없어도 .sql.gz 의 압축을 풀어 아무 MySQL 클라이언트로
 *       실행하면 동일하게 복구된다.
 */
import { connect } from "@tidbcloud/serverless";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const apply = args.includes("--apply");

if (!file) {
  console.error("사용법: node --env-file=.env scripts/restore-db.mjs <백업파일.sql.gz> [--apply]");
  process.exit(1);
}

function readSql(f) {
  const raw = readFileSync(f);
  // .gz 매직 넘버(1f 8b)면 압축을 풀고, 아니면 평문 .sql 로 취급한다.
  const isGzip = raw[0] === 0x1f && raw[1] === 0x8b;
  return (isGzip ? gunzipSync(raw) : raw).toString("utf8");
}

function statements(sql) {
  return sql
    .split(/;\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.split("\n").every((l) => l.trim().startsWith("--")))
    .map((s) => s.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim())
    .filter(Boolean);
}

function label(stmt) {
  const create = stmt.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/i);
  if (create) return `테이블 생성: ${create[1]}`;
  const insert = stmt.match(/INSERT INTO `([^`]+)`/i);
  if (insert) {
    const rows = (stmt.match(/\), \(/g) || []).length + 1;
    return `데이터 삽입: ${insert[1]} (${rows}행)`;
  }
  return stmt.slice(0, 60).replace(/\s+/g, " ");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 이 없습니다. --env-file=.env 를 붙였는지 확인하세요.");
    process.exit(1);
  }

  const sql = readSql(file);
  const stmts = statements(sql);
  const header = sql.split("\n").filter((l) => l.startsWith("--")).slice(0, 2).join("\n");

  console.log(`백업 파일: ${file}`);
  console.log(header + "\n");
  console.log(apply ? "=== 복원 실행 ===" : "=== 미리보기 (아무것도 쓰지 않음) ===");

  if (!apply) {
    for (const s of stmts) console.log(`  ${label(s)}`);
    console.log(`\n총 ${stmts.length}개 문장. 실제로 복원하려면 --apply 를 붙여 다시 실행하세요.`);
    return;
  }

  const db = connect({ url: process.env.DATABASE_URL });
  let done = 0;
  for (const s of stmts) {
    try {
      await db.execute(s);
      done++;
      console.log(`  OK  ${label(s)}`);
    } catch (e) {
      console.error(`  실패  ${label(s)}`);
      console.error(`        ${String(e).slice(0, 200)}`);
      throw e;
    }
  }
  console.log(`\n복원 완료: ${done}/${stmts.length} 문장 실행.`);
}

main().catch((e) => {
  console.error("복원 실패:", String(e).slice(0, 300));
  process.exit(1);
});
