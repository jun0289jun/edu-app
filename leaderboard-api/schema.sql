-- 놀이터 랭킹 테이블 (TiDB에서 한 번 실행)
CREATE TABLE IF NOT EXISTS scores (
  name    VARCHAR(16)  NOT NULL,               -- 플레이어 이름
  game    VARCHAR(32)  NOT NULL,               -- 게임 키 (starcatch, snake, ...)
  avatar  VARCHAR(16)  NOT NULL DEFAULT '',    -- 이모지 아바타
  score   INT          NOT NULL DEFAULT 0,     -- 점수
  ts      BIGINT       NOT NULL DEFAULT 0,     -- 마지막 갱신 시각(ms)
  PRIMARY KEY (name, game),                    -- (이름,게임)당 1행 = 최고점만 유지
  INDEX idx_game_score (game, score)
);

-- 가족 작품 공유: 메모·그림·사진
CREATE TABLE IF NOT EXISTS works (
  id            VARCHAR(40)   NOT NULL,
  owner         VARCHAR(16)   NOT NULL,
  owner_avatar  VARCHAR(16)   NOT NULL DEFAULT '',
  type          VARCHAR(16)   NOT NULL,
  title         VARCHAR(80)   NOT NULL DEFAULT '',
  content       MEDIUMTEXT    NOT NULL,
  recipients    JSON          NOT NULL,
  ts            BIGINT        NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_works_ts (ts),
  INDEX idx_works_owner (owner)
);
