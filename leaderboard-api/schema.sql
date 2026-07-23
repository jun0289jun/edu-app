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
