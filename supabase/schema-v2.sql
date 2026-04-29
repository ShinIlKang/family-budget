-- 기존 테이블 제거 (순서 주의: FK 의존성 역순)
DROP TABLE IF EXISTS asset_ledger CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS fixed_items CASCADE;
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS invite_codes CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- 회원
CREATE TABLE members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name         TEXT NOT NULL,
  phone        TEXT,
  role         TEXT NOT NULL,
  is_master    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 앱 설정 (온보딩 완료 여부)
CREATE TABLE settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  updated_by           UUID REFERENCES members(id),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 초대 코드
CREATE TABLE invite_codes (
  code        TEXT PRIMARY KEY,
  created_by  UUID NOT NULL REFERENCES members(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 카테고리
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  icon       TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES members(id),
  updated_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 거래 내역
CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  memo        TEXT,
  date        DATE NOT NULL,
  created_by  UUID NOT NULL REFERENCES members(id),
  updated_by  UUID REFERENCES members(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 예산
CREATE TABLE budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  created_by  UUID NOT NULL REFERENCES members(id),
  updated_by  UUID REFERENCES members(id),
  UNIQUE (category_id, year, month)
);

-- 고정비 항목
CREATE TABLE fixed_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  amount         INTEGER NOT NULL CHECK (amount > 0),
  group_name     TEXT NOT NULL,
  billing_day    INTEGER CHECK (billing_day BETWEEN 1 AND 31),
  payment_method TEXT,
  memo           TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by     UUID NOT NULL REFERENCES members(id),
  updated_by     UUID REFERENCES members(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 자산
CREATE TABLE assets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  category             TEXT NOT NULL CHECK (category IN ('금융', '투자', '보증금')),
  initial_balance      INTEGER NOT NULL DEFAULT 0 CHECK (initial_balance >= 0),
  linked_fixed_item_id UUID REFERENCES fixed_items(id) ON DELETE SET NULL,
  created_by           UUID NOT NULL REFERENCES members(id),
  updated_by           UUID REFERENCES members(id),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 자산 원장
CREATE TABLE asset_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  amount         INTEGER NOT NULL CHECK (amount != 0),
  entry_type     TEXT NOT NULL CHECK (entry_type IN ('auto', 'manual')),
  source_type    TEXT CHECK (source_type IN ('fixed_item', 'transaction')),
  source_id      UUID,
  recorded_month TEXT,
  memo           TEXT,
  created_by     UUID NOT NULL REFERENCES members(id),
  updated_by     UUID REFERENCES members(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (asset_id, recorded_month)
);

-- 인덱스
CREATE INDEX idx_transactions_date ON transactions (date DESC);
CREATE INDEX idx_transactions_category ON transactions (category_id);
CREATE INDEX idx_budgets_ym ON budgets (year, month);
CREATE INDEX idx_fixed_items_active ON fixed_items (is_active);
CREATE INDEX idx_assets_category ON assets (category);
CREATE INDEX idx_asset_ledger_asset ON asset_ledger (asset_id);

-- 초기 settings 행
INSERT INTO settings (onboarding_completed) VALUES (false);
