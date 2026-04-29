# 총 자산 현황 + 온보딩 플로우 설계

## 개요

앱 최초 진입 시 4단계 온보딩을 완료해야 메인 앱을 사용할 수 있다. 온보딩에서 월 수입, 자산 항목, 고정비, 예산을 설정하고, 이후 자산 화면에서 카테고리별 자산 현황을 조회·관리한다.

**자산 카테고리:** 금융 (적금, 예금, 청약) / 투자 (주식) / 보증금

**핵심 제약:**
- 대출은 고정비로만 관리 (자산 집계 제외)
- 부동산은 이번 범위 제외
- 온보딩 완료 전 메인 앱 진입 차단

---

## 1. 데이터베이스 스키마

### 1-1. 신규 테이블

```sql
-- 가족 설정
CREATE TABLE families (
  id                   TEXT PRIMARY KEY,
  monthly_income       INTEGER NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 자산 항목
CREATE TABLE assets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id             TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('금융', '투자', '보증금')),
  initial_balance       INTEGER NOT NULL DEFAULT 0 CHECK (initial_balance >= 0),
  linked_fixed_item_id  UUID REFERENCES fixed_items(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 적립 원장
CREATE TABLE asset_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  amount         INTEGER NOT NULL,
  entry_type     TEXT NOT NULL CHECK (entry_type IN ('auto', 'manual')),
  source_type    TEXT CHECK (source_type IN ('fixed_item', 'transaction')),
  source_id      UUID,
  recorded_month TEXT,  -- 'YYYY-MM', auto 항목 중복 방지용
  memo           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (asset_id, recorded_month)  -- 월별 자동 적립 1회 보장
);

CREATE INDEX idx_assets_family ON assets (family_id);
CREATE INDEX idx_asset_ledger_asset ON asset_ledger (asset_id);
```

---

## 2. TypeScript 타입

### `types/index.ts` 추가

```typescript
export interface Family {
  id: string
  monthly_income: number
  onboarding_completed: boolean
  created_at: string
}

export type AssetCategory = '금융' | '투자' | '보증금'
export const ASSET_CATEGORIES: AssetCategory[] = ['금융', '투자', '보증금']

export interface Asset {
  id: string
  family_id: string
  name: string
  category: AssetCategory
  initial_balance: number
  linked_fixed_item_id: string | null
  created_at: string
  current_balance?: number        // 계산값: initial_balance + SUM(ledger)
  linked_fixed_item_name?: string // join 결과
  linked_billing_day?: number | null // join 결과
}

export interface AssetLedger {
  id: string
  asset_id: string
  amount: number
  entry_type: 'auto' | 'manual'
  source_type: 'fixed_item' | 'transaction' | null
  source_id: string | null
  recorded_month: string | null
  memo: string | null
  created_at: string
}
```

---

## 3. lib/queries.ts 추가 함수

```typescript
// 가족 설정
getOrCreateFamily(familyId: string): Promise<Family>
updateFamily(familyId: string, data: Partial<Pick<Family, 'monthly_income' | 'onboarding_completed'>>): Promise<void>

// 자산 CRUD
getAssetsWithBalance(familyId: string): Promise<Asset[]>
  // asset_ledger SUM + initial_balance로 current_balance 계산
  // fixed_items LEFT JOIN으로 linked_fixed_item_name, linked_billing_day 포함
createAsset(familyId: string, data: Omit<Asset, 'id' | 'family_id' | 'created_at'>): Promise<Asset>
updateAsset(id: string, data: Partial<Omit<Asset, 'id' | 'family_id' | 'created_at'>>): Promise<Asset>
deleteAsset(id: string): Promise<void>

// 자동 적립
autoAccumulateAssets(familyId: string): Promise<void>
  // linked_fixed_item_id가 있는 자산 조회
  // 각 자산의 생성월 ~ 현재월 순회
  // billing_day <= 오늘 날짜이면 해당 월 적립 (이미 있으면 skip)
  // asset_ledger에 entry_type='auto', source_type='fixed_item' 추가

// 수동 적립
addManualLedgerEntry(assetId: string, amount: number, sourceType: 'transaction', sourceId: string, memo?: string): Promise<void>

// 자산 요약 (홈 대시보드용)
getAssetsSummary(familyId: string): Promise<{ total: number; byCategory: Record<AssetCategory, number> }>
```

---

## 4. 온보딩 플로우

### 라우팅 가드

`components/FamilyRedirect.tsx` 수정:
```
familyId 설정 후
  → getOrCreateFamily(familyId)
  → onboarding_completed = false 이면 /[familyId]/onboarding 으로 redirect
  → true 이면 /[familyId] 로 redirect
```

### 온보딩 라우트

`app/[familyId]/onboarding/page.tsx` — BottomNav 없음, 4단계 위저드

### 컴포넌트 구조

```
components/onboarding/
  OnboardingWizard.tsx     -- step 상태 관리, step 1→4 렌더링
  Step1Assets.tsx          -- 월 수입 입력 + 자산 항목 추가/삭제
  Step2FixedItems.tsx      -- 고정비 등록 (FixedItemForm 재사용)
  Step3LinkAssets.tsx      -- 고정비 목록 → 자산 항목 연결
  Step4Budgets.tsx         -- 예산 설정 (기존 Budget UI 재사용)
```

### Step 3 상세: 고정비-자산 연결

```
고정비 목록 표시 (is_active=true 항목만)
각 행: [고정비명 / 금액] → [자산 항목 드롭다운 or "연결 안 함"]
저장 시: assets.linked_fixed_item_id 업데이트
```

### Step 4 완료 시

```
updateFamily(familyId, { onboarding_completed: true })
router.push(`/${familyId}`)
```

---

## 5. 자산 화면

### 라우트

`app/[familyId]/assets/page.tsx`

페이지 로드 시:
1. `autoAccumulateAssets(familyId)` 실행
2. `getAssetsWithBalance(familyId)` 로드

### 컴포넌트 구조

```
components/assets/
  AssetList.tsx    -- C 레이아웃 전체
  AssetRow.tsx     -- 항목 행 (이름, 현재잔액, 연결고정비, 납부일)
  AssetForm.tsx    -- 추가/수정 폼
```

### C 레이아웃 상세

```
[총 자산 그라디언트 카드]
  총 자산  54,300,000원

[금융 카드][투자 카드][보증금 카드]  ← 가로 3열

─────────────────────────────
항목명                  잔액
카테고리 · 연결고정비명 · 납부일
─────────────────────────────
```

### AssetForm 필드

- 항목명 (text, required)
- 카테고리 (select: 금융/투자/보증금, required)
- 현재 잔액 (number, required) — initial_balance로 저장
- 연결 고정비 (select: 고정비 목록 + "없음", optional)

---

## 6. 홈 대시보드 업데이트

`components/dashboard/AssetSummaryCard.tsx` 신규:

```
자산 현황
총 54,300,000원
금융 38,400,000 / 투자 5,900,000 / 보증금 10,000,000
```

`app/[familyId]/page.tsx`:
- `getAssetsSummary` + `getOrCreateFamily` 호출 추가
- 월 수입 대비 고정비/자산/예산 비율 표시

```
이번 달 수입 3,500,000원
고정비 1,200,000 (34%)  자산적립 700,000 (20%)  예산 1,600,000 (46%)
```

---

## 7. 거래 내역 연동

`components/transactions/TransactionForm.tsx` 수정:

- 거래 type='income'이 아닌 항목 중 "자산에 추가납입" 토글 추가
- 토글 on 시 자산 항목 선택 드롭다운 표시
- 저장 시 `addManualLedgerEntry(assetId, amount, 'transaction', transaction.id)` 호출

---

## 8. 하단 네비게이션

`components/layout/BottomNav.tsx`:

```typescript
const tabs = [
  { href: '',             label: '홈',  icon: '🏠' },
  { href: '/transactions', label: '내역', icon: '📋' },
  { href: '/budgets',      label: '예산', icon: '🎯' },
  { href: '/fixed-items',  label: '고정비', icon: '📌' },
  { href: '/assets',       label: '자산', icon: '💰' },
  { href: '/stats',        label: '통계', icon: '📈' },
]
```

6탭으로 변경. 각 탭 폰트 사이즈 10px로 조정.

---

## 스코프 밖

- 부동산 자산
- 대출 잔액 추적 (고정비로만 관리)
- 자산 히스토리 그래프
- 가족 초대/공유 (familyId localStorage 방식 유지)
