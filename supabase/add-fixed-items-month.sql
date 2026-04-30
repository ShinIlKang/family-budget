-- fixed_items 테이블에 년/월 컬럼 추가
ALTER TABLE fixed_items
  ADD COLUMN year  SMALLINT NOT NULL DEFAULT EXTRACT(YEAR  FROM NOW())::SMALLINT,
  ADD COLUMN month SMALLINT NOT NULL DEFAULT EXTRACT(MONTH FROM NOW())::SMALLINT
    CHECK (month BETWEEN 1 AND 12);

CREATE INDEX idx_fixed_items_year_month ON fixed_items (year, month);
