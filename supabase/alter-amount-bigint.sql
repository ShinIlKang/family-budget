-- 금액 컬럼을 INTEGER → BIGINT로 변환
ALTER TABLE transactions   ALTER COLUMN amount          TYPE BIGINT;
ALTER TABLE budgets        ALTER COLUMN amount          TYPE BIGINT;
ALTER TABLE fixed_items    ALTER COLUMN amount          TYPE BIGINT;
ALTER TABLE assets         ALTER COLUMN initial_balance TYPE BIGINT;
ALTER TABLE asset_ledger   ALTER COLUMN amount          TYPE BIGINT;
ALTER TABLE settlements
  ALTER COLUMN salary           TYPE BIGINT,
  ALTER COLUMN fixed_total      TYPE BIGINT,
  ALTER COLUMN investment_total TYPE BIGINT,
  ALTER COLUMN event_budget     TYPE BIGINT,
  ALTER COLUMN medical_budget   TYPE BIGINT,
  ALTER COLUMN living_budget    TYPE BIGINT;
