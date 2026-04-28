-- 카테고리
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,
  icon        TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 거래 내역
CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  memo        TEXT,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 예산
CREATE TABLE budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  UNIQUE (family_id, category_id, year, month)
);

-- 인덱스 (family_id 기준 조회 최적화)
CREATE INDEX idx_transactions_family_date ON transactions (family_id, date DESC);
CREATE INDEX idx_transactions_family_category ON transactions (family_id, category_id);
CREATE INDEX idx_categories_family ON categories (family_id);
CREATE INDEX idx_budgets_family_ym ON budgets (family_id, year, month);

-- 고정비 항목
CREATE TABLE fixed_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  group_name  TEXT NOT NULL,
  billing_day INTEGER CHECK (billing_day BETWEEN 1 AND 31),
  memo        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fixed_items_family ON fixed_items (family_id);

-- 가족 설정
CREATE TABLE families (
  id                   TEXT PRIMARY KEY,
  monthly_income       INTEGER NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 자산 항목
CREATE TABLE assets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id            TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  category             TEXT NOT NULL CHECK (category IN ('금융', '투자', '보증금')),
  initial_balance      INTEGER NOT NULL DEFAULT 0 CHECK (initial_balance >= 0),
  linked_fixed_item_id UUID REFERENCES fixed_items(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 적립 원장
CREATE TABLE asset_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  amount         INTEGER NOT NULL CHECK (amount != 0),
  entry_type     TEXT NOT NULL CHECK (entry_type IN ('auto', 'manual')),
  source_type    TEXT CHECK (source_type IN ('fixed_item', 'transaction')),
  source_id      UUID,
  recorded_month TEXT,
  memo           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (asset_id, recorded_month)
);

CREATE INDEX idx_assets_family ON assets (family_id);
CREATE INDEX idx_asset_ledger_asset ON asset_ledger (asset_id);
