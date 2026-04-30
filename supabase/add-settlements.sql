-- settlements 테이블: 매달 24일 급여 기준 정산 기록
CREATE TABLE IF NOT EXISTS settlements (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  year           INTEGER     NOT NULL,
  month          INTEGER     NOT NULL,
  salary         INTEGER     NOT NULL DEFAULT 0,
  fixed_total    INTEGER     NOT NULL DEFAULT 0,
  investment_total INTEGER   NOT NULL DEFAULT 0,
  event_budget   INTEGER     NOT NULL DEFAULT 0,
  medical_budget INTEGER     NOT NULL DEFAULT 0,
  living_budget  INTEGER     NOT NULL DEFAULT 0,
  completed_at   TIMESTAMPTZ DEFAULT NULL,
  created_by     TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT settlements_year_month_unique UNIQUE (year, month)
);

-- 기존 테이블과 동일하게 RLS 비활성화
