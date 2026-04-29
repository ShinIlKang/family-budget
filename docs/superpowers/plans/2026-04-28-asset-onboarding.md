# 총 자산 현황 + 온보딩 플로우 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 최초 진입 시 4단계 온보딩(자산·고정비·연결·예산)을 완료해야 메인 앱을 쓸 수 있고, 이후 카테고리별 총 자산 현황을 조회·관리할 수 있다.

**Architecture:** FamilyRedirect가 getOrCreateFamily를 호출해 onboarding_completed 여부를 확인하고, 미완료 시 `/[familyId]/onboarding`으로 리다이렉트한다. 자산은 `assets` 테이블에, 월별 자동/수동 적립은 `asset_ledger` 원장 테이블에 기록된다. 자산 현황 페이지 로드 시 autoAccumulateAssets를 실행해 미적립 월을 채운다.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgREST), TypeScript strict, Tailwind CSS, Jest + Testing Library

---

## 파일 구조

```
supabase/schema.sql                          modify — families/assets/asset_ledger 테이블 추가
types/index.ts                               modify — Family, Asset, AssetCategory, AssetLedger 타입 추가
lib/queries.ts                               modify — family/asset 쿼리 추가
lib/utils.ts                                 no change
components/FamilyRedirect.tsx                modify — onboarding 가드 추가

components/assets/
  AssetRow.tsx                               create — 자산 항목 행
  AssetForm.tsx                              create — 자산 추가/수정 폼
  AssetList.tsx                              create — C 레이아웃 (총액카드 + 소계카드 + 목록)

app/[familyId]/assets/page.tsx               create — 자산 현황 페이지

components/onboarding/
  Step1Assets.tsx                            create — 월 수입 + 자산 항목 추가
  Step2FixedItems.tsx                        create — 고정비 등록 (FixedItemForm 재사용)
  Step3LinkAssets.tsx                        create — 고정비 → 자산 연결
  Step4Budgets.tsx                           create — 예산 설정 (BudgetForm 재사용)
  OnboardingWizard.tsx                       create — 4단계 wizard 컨트롤러

app/[familyId]/onboarding/page.tsx           create — BottomNav 없는 온보딩 페이지

components/dashboard/AssetSummaryCard.tsx    create — 홈 자산 요약 카드
app/[familyId]/page.tsx                      modify — AssetSummaryCard + 수입 비율 추가

components/layout/BottomNav.tsx              modify — 자산 탭 추가 (6탭)
components/transactions/TransactionForm.tsx  modify — 자산 추가납입 토글 추가
app/[familyId]/transactions/page.tsx         modify — assets prop 전달

__tests__/AssetRow.test.tsx                  create
__tests__/AssetForm.test.tsx                 create
__tests__/OnboardingWizard.test.tsx          create
```

---

## Task 1: DB 스키마 추가

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: schema.sql 끝에 DDL 추가**

```sql
-- families/assets/asset_ledger를 supabase/schema.sql 끝에 추가
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
  amount         INTEGER NOT NULL,
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
```

- [ ] **Step 2: Supabase SQL Editor에서 위 DDL 실행**

Supabase 대시보드 → SQL Editor → 위 DDL 붙여넣기 → Run

확인: `families`, `assets`, `asset_ledger` 테이블이 생성됨

- [ ] **Step 3: 커밋**

```bash
git add supabase/schema.sql
git commit -m "feat: families/assets/asset_ledger 테이블 스키마 추가"
```

---

## Task 2: TypeScript 타입 추가

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: 기존 파일 끝에 타입 추가**

```typescript
// types/index.ts 끝에 추가

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
  current_balance?: number
  linked_fixed_item_name?: string | null
  linked_billing_day?: number | null
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

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add types/index.ts
git commit -m "feat: Family, Asset, AssetLedger 타입 추가"
```

---

## Task 3: Family + Asset CRUD 쿼리

**Files:**
- Modify: `lib/queries.ts`

- [ ] **Step 1: lib/queries.ts import 라인에 새 타입 추가**

기존:
```typescript
import type { Transaction, Category, Budget, MonthYear, BudgetWithUsage, FixedItem } from '@/types'
```

변경:
```typescript
import type { Transaction, Category, Budget, MonthYear, BudgetWithUsage, FixedItem, Family, Asset, AssetLedger, AssetCategory } from '@/types'
```

- [ ] **Step 2: 파일 끝에 family + asset 쿼리 추가**

```typescript
// ─── 가족 설정 ───────────────────────────────────────────────

export async function getOrCreateFamily(familyId: string): Promise<Family> {
  const { data: existing } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .maybeSingle()
  if (existing) return existing

  const { data, error } = await supabase
    .from('families')
    .insert({ id: familyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFamily(
  familyId: string,
  data: Partial<Pick<Family, 'monthly_income' | 'onboarding_completed'>>
): Promise<void> {
  const { error } = await supabase.from('families').update(data).eq('id', familyId)
  if (error) throw error
}

// ─── 자산 ────────────────────────────────────────────────────

export async function getAssetsWithBalance(familyId: string): Promise<Asset[]> {
  const { data: assets, error: aErr } = await supabase
    .from('assets')
    .select('*, fixed_item:fixed_items!linked_fixed_item_id(name, billing_day)')
    .eq('family_id', familyId)
    .order('category')
    .order('name')
  if (aErr) throw aErr

  const ids = (assets ?? []).map(a => a.id)
  if (ids.length === 0) return []

  const { data: ledger, error: lErr } = await supabase
    .from('asset_ledger')
    .select('asset_id, amount')
    .in('asset_id', ids)
  if (lErr) throw lErr

  const sums = new Map<string, number>()
  for (const e of ledger ?? []) {
    sums.set(e.asset_id, (sums.get(e.asset_id) ?? 0) + e.amount)
  }

  return (assets ?? []).map(a => ({
    id: a.id,
    family_id: a.family_id,
    name: a.name,
    category: a.category as AssetCategory,
    initial_balance: a.initial_balance,
    linked_fixed_item_id: a.linked_fixed_item_id,
    created_at: a.created_at,
    current_balance: a.initial_balance + (sums.get(a.id) ?? 0),
    linked_fixed_item_name: (a.fixed_item as { name: string } | null)?.name ?? null,
    linked_billing_day: (a.fixed_item as { billing_day: number | null } | null)?.billing_day ?? null,
  }))
}

export async function createAsset(
  familyId: string,
  input: Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .insert({ family_id: familyId, ...input })
    .select()
    .single()
  if (error) throw error
  return { ...data, category: data.category as AssetCategory }
}

export async function updateAsset(
  id: string,
  input: Partial<Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>>
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return { ...data, category: data.category as AssetCategory }
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}

export async function getAssetsSummary(
  familyId: string
): Promise<{ total: number; byCategory: Record<AssetCategory, number> }> {
  const assets = await getAssetsWithBalance(familyId)
  const byCategory: Record<AssetCategory, number> = { 금융: 0, 투자: 0, 보증금: 0 }
  let total = 0
  for (const a of assets) {
    const bal = a.current_balance ?? a.initial_balance
    byCategory[a.category] += bal
    total += bal
  }
  return { total, byCategory }
}
```

- [ ] **Step 3: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add lib/queries.ts
git commit -m "feat: family/asset CRUD 쿼리 추가"
```

---

## Task 4: 자동 적립 + 수동 원장 쿼리

**Files:**
- Modify: `lib/queries.ts`

- [ ] **Step 1: 파일 끝에 적립 쿼리 추가**

```typescript
// ─── 자산 원장 ──────────────────────────────────────────────

export async function autoAccumulateAssets(familyId: string): Promise<void> {
  const { data: assets, error: aErr } = await supabase
    .from('assets')
    .select('id, initial_balance, created_at, linked_fixed_item_id, fixed_item:fixed_items!linked_fixed_item_id(billing_day, amount)')
    .eq('family_id', familyId)
    .not('linked_fixed_item_id', 'is', null)
  if (aErr) throw aErr
  if (!assets || assets.length === 0) return

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  for (const asset of assets) {
    const fi = asset.fixed_item as { billing_day: number | null; amount: number } | null
    if (!fi) continue

    const createdAt = new Date(asset.created_at)
    let year = createdAt.getFullYear()
    let month = createdAt.getMonth() + 1

    const months: string[] = []
    while (year < todayYear || (year === todayYear && month <= todayMonth)) {
      if (year === todayYear && month === todayMonth) {
        if (fi.billing_day && todayDay < fi.billing_day) break
      }
      months.push(`${year}-${String(month).padStart(2, '0')}`)
      month++
      if (month > 12) { month = 1; year++ }
    }

    for (const recordedMonth of months) {
      await supabase.from('asset_ledger').upsert(
        {
          asset_id: asset.id,
          amount: fi.amount,
          entry_type: 'auto',
          source_type: 'fixed_item',
          source_id: asset.linked_fixed_item_id,
          recorded_month: recordedMonth,
        },
        { onConflict: 'asset_id,recorded_month', ignoreDuplicates: true }
      )
    }
  }
}

export async function addManualLedgerEntry(
  assetId: string,
  amount: number,
  sourceId: string,
  memo?: string
): Promise<void> {
  const { error } = await supabase.from('asset_ledger').insert({
    asset_id: assetId,
    amount,
    entry_type: 'manual',
    source_type: 'transaction',
    source_id: sourceId,
    memo: memo ?? null,
  })
  if (error) throw error
}
```

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/queries.ts
git commit -m "feat: autoAccumulateAssets, addManualLedgerEntry 쿼리 추가"
```

---

## Task 5: FamilyRedirect 온보딩 가드

**Files:**
- Modify: `components/FamilyRedirect.tsx`

- [ ] **Step 1: FamilyRedirect.tsx 전체 교체**

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { getOrCreateFamily } from '@/lib/queries'

export default function FamilyRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function init() {
      let familyId = localStorage.getItem('familyId')
      if (!familyId) {
        familyId = nanoid(12)
        localStorage.setItem('familyId', familyId)
      }
      const family = await getOrCreateFamily(familyId)
      if (family.onboarding_completed) {
        router.replace(`/${familyId}`)
      } else {
        router.replace(`/${familyId}/onboarding`)
      }
    }
    init()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">로딩 중...</p>
    </div>
  )
}
```

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/FamilyRedirect.tsx
git commit -m "feat: FamilyRedirect에 온보딩 미완료 시 리다이렉트 가드 추가"
```

---

## Task 6: AssetRow 컴포넌트

**Files:**
- Create: `components/assets/AssetRow.tsx`
- Create: `__tests__/AssetRow.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// __tests__/AssetRow.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import AssetRow from '@/components/assets/AssetRow'
import type { Asset } from '@/types'

const mockAsset: Asset = {
  id: '1',
  family_id: 'fam1',
  name: '적금 A은행',
  category: '금융',
  initial_balance: 10000000,
  linked_fixed_item_id: 'fi1',
  created_at: '2026-01-01',
  current_balance: 12400000,
  linked_fixed_item_name: '적금',
  linked_billing_day: 25,
}

describe('AssetRow', () => {
  it('항목 이름과 잔액을 표시한다', () => {
    render(<AssetRow asset={mockAsset} onEdit={jest.fn()} />)
    expect(screen.getByText('적금 A은행')).toBeInTheDocument()
    expect(screen.getByText(/12,400,000/)).toBeInTheDocument()
  })

  it('연결 고정비 납부일을 표시한다', () => {
    render(<AssetRow asset={mockAsset} onEdit={jest.fn()} />)
    expect(screen.getByText(/매월 25일/)).toBeInTheDocument()
  })

  it('연결 고정비가 없으면 납부일을 표시하지 않는다', () => {
    render(<AssetRow asset={{ ...mockAsset, linked_fixed_item_id: null, linked_billing_day: null }} onEdit={jest.fn()} />)
    expect(screen.queryByText(/매월/)).not.toBeInTheDocument()
  })

  it('클릭하면 onEdit이 호출된다', () => {
    const onEdit = jest.fn()
    render(<AssetRow asset={mockAsset} onEdit={onEdit} />)
    fireEvent.click(screen.getByText('적금 A은행'))
    expect(onEdit).toHaveBeenCalledWith(mockAsset)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/AssetRow.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/assets/AssetRow'"

- [ ] **Step 3: 컴포넌트 구현**

```tsx
// components/assets/AssetRow.tsx
import type { Asset } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  asset: Asset
  onEdit: (asset: Asset) => void
}

export default function AssetRow({ asset, onEdit }: Props) {
  return (
    <div
      className="flex items-center justify-between py-3 px-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer"
      onClick={() => onEdit(asset)}
    >
      <div>
        <p className="text-sm font-medium text-gray-800">{asset.name}</p>
        <p className="text-xs text-gray-400">
          {asset.category}
          {asset.linked_billing_day ? ` · 매월 ${asset.linked_billing_day}일` : ''}
        </p>
      </div>
      <p className="text-sm font-semibold text-emerald-600">
        {formatAmount(asset.current_balance ?? asset.initial_balance)}원
      </p>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/AssetRow.test.tsx
```

Expected: PASS (4/4)

- [ ] **Step 5: 커밋**

```bash
git add components/assets/AssetRow.tsx __tests__/AssetRow.test.tsx
git commit -m "feat: AssetRow 컴포넌트 추가"
```

---

## Task 7: AssetForm 컴포넌트

**Files:**
- Create: `components/assets/AssetForm.tsx`
- Create: `__tests__/AssetForm.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// __tests__/AssetForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import AssetForm from '@/components/assets/AssetForm'
import type { Asset, FixedItem } from '@/types'

const mockFixedItems: FixedItem[] = [
  {
    id: 'fi1',
    family_id: 'fam1',
    name: '적금',
    amount: 200000,
    group_name: '저축/투자',
    billing_day: 25,
    memo: null,
    is_active: true,
    created_at: '2026-01-01',
  },
]

describe('AssetForm', () => {
  it('빈 폼을 렌더링한다', () => {
    render(
      <AssetForm
        initial={null}
        fixedItems={mockFixedItems}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        onDelete={undefined}
      />
    )
    expect(screen.getByPlaceholderText('항목 이름')).toBeInTheDocument()
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    const onCancel = jest.fn()
    render(
      <AssetForm
        initial={null}
        fixedItems={[]}
        onSubmit={jest.fn()}
        onCancel={onCancel}
        onDelete={undefined}
      />
    )
    fireEvent.click(screen.getByText('취소'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('initial이 있으면 수정 버튼을 표시한다', () => {
    const asset: Asset = {
      id: '1',
      family_id: 'fam1',
      name: '국내주식',
      category: '투자',
      initial_balance: 5000000,
      linked_fixed_item_id: null,
      created_at: '2026-01-01',
    }
    render(
      <AssetForm
        initial={asset}
        fixedItems={[]}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText('수정')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/AssetForm.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/assets/AssetForm'"

- [ ] **Step 3: 컴포넌트 구현**

```tsx
// components/assets/AssetForm.tsx
'use client'
import { useState } from 'react'
import type { Asset, AssetCategory, FixedItem } from '@/types'
import { ASSET_CATEGORIES } from '@/types'

interface Props {
  initial: Asset | null
  fixedItems: FixedItem[]
  onSubmit: (data: Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>) => Promise<void>
  onCancel: () => void
  onDelete: (() => Promise<void>) | undefined
}

export default function AssetForm({ initial, fixedItems, onSubmit, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<AssetCategory>(initial?.category ?? '금융')
  const [balance, setBalance] = useState(initial ? String(initial.initial_balance) : '')
  const [linkedId, setLinkedId] = useState(initial?.linked_fixed_item_id ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(balance.replace(/,/g, ''))
    if (!name.trim() || isNaN(parsed) || parsed < 0) return
    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        category,
        initial_balance: parsed,
        linked_fixed_item_id: linkedId || null,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    setLoading(true)
    try { await onDelete() } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="항목 이름"
        value={name}
        onChange={e => setName(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
        required
        autoFocus
      />
      <select
        value={category}
        onChange={e => setCategory(e.target.value as AssetCategory)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        {ASSET_CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        type="number"
        placeholder="현재 잔액 (원)"
        value={balance}
        onChange={e => setBalance(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
        required
        min={0}
      />
      <select
        value={linkedId}
        onChange={e => setLinkedId(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        <option value="">연결 고정비 없음</option>
        {fixedItems.filter(f => f.is_active).map(f => (
          <option key={f.id} value={f.id}>
            {f.name} ({f.billing_day ? `매월 ${f.billing_day}일` : '납부일 없음'})
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? '저장 중...' : initial ? '수정' : '저장'}
        </button>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="w-full py-2 text-red-500 text-sm border border-red-200 rounded-lg disabled:opacity-50"
        >
          삭제
        </button>
      )}
    </form>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/AssetForm.test.tsx
```

Expected: PASS (3/3)

- [ ] **Step 5: 커밋**

```bash
git add components/assets/AssetForm.tsx __tests__/AssetForm.test.tsx
git commit -m "feat: AssetForm 컴포넌트 추가"
```

---

## Task 8: AssetList 컴포넌트 (C 레이아웃)

**Files:**
- Create: `components/assets/AssetList.tsx`

- [ ] **Step 1: AssetList 구현**

```tsx
// components/assets/AssetList.tsx
'use client'
import type { Asset, AssetCategory } from '@/types'
import { formatAmount } from '@/lib/utils'
import AssetRow from './AssetRow'

interface Props {
  assets: Asset[]
  onEdit: (asset: Asset) => void
}

const CATEGORY_COLORS: Record<AssetCategory, { bg: string; text: string; label: string }> = {
  금융: { bg: 'bg-blue-50', text: 'text-blue-700', label: '금융' },
  투자: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: '투자' },
  보증금: { bg: 'bg-purple-50', text: 'text-purple-700', label: '보증금' },
}

export default function AssetList({ assets, onEdit }: Props) {
  const total = assets.reduce((s, a) => s + (a.current_balance ?? a.initial_balance), 0)

  const byCategory = (['금융', '투자', '보증금'] as AssetCategory[]).map(cat => ({
    cat,
    amount: assets
      .filter(a => a.category === cat)
      .reduce((s, a) => s + (a.current_balance ?? a.initial_balance), 0),
  }))

  return (
    <div className="flex flex-col">
      {/* 총 자산 카드 */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
        <p className="text-sm opacity-80">총 자산</p>
        <p className="text-3xl font-bold mt-1">{formatAmount(total)}원</p>
      </div>

      {/* 카테고리 소계 카드 */}
      <div className="flex gap-3 mx-4 mt-3">
        {byCategory.map(({ cat, amount }) => {
          const style = CATEGORY_COLORS[cat]
          return (
            <div key={cat} className={`flex-1 ${style.bg} rounded-xl p-3`}>
              <p className={`text-xs font-medium ${style.text}`}>{style.label}</p>
              <p className={`text-sm font-bold ${style.text} mt-1`}>{formatAmount(amount)}</p>
            </div>
          )
        })}
      </div>

      {/* 항목 목록 */}
      <div className="mt-4 bg-white">
        {assets.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">자산 항목이 없습니다</p>
        ) : (
          assets.map(a => <AssetRow key={a.id} asset={a} onEdit={onEdit} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/assets/AssetList.tsx
git commit -m "feat: AssetList C 레이아웃 컴포넌트 추가"
```

---

## Task 9: 자산 현황 페이지

**Files:**
- Create: `app/[familyId]/assets/page.tsx`

- [ ] **Step 1: 페이지 구현**

```tsx
// app/[familyId]/assets/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAssetsWithBalance, autoAccumulateAssets, createAsset, updateAsset, deleteAsset, getFixedItems } from '@/lib/queries'
import type { Asset, FixedItem } from '@/types'
import AssetList from '@/components/assets/AssetList'
import AssetForm from '@/components/assets/AssetForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function AssetsPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([])
  const [editing, setEditing] = useState<Asset | null | undefined>(undefined)

  const load = useCallback(async () => {
    await autoAccumulateAssets(familyId)
    const [a, f] = await Promise.all([
      getAssetsWithBalance(familyId),
      getFixedItems(familyId),
    ])
    setAssets(a)
    setFixedItems(f)
  }, [familyId])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>) {
    if (editing === null) {
      await createAsset(familyId, data)
    } else if (editing) {
      await updateAsset(editing.id, data)
    }
    setEditing(undefined)
    await load()
  }

  async function handleDelete() {
    if (!editing) return
    await deleteAsset(editing.id)
    setEditing(undefined)
    await load()
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <div className="bg-emerald-600 text-white px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.back()} className="text-emerald-200 text-xl leading-none">←</button>
        <h1 className="text-lg font-semibold">총 자산 현황</h1>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <AssetList assets={assets} onEdit={a => setEditing(a)} />
      </div>
      <FAB onClick={() => setEditing(null)} />
      <Modal
        isOpen={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? '자산 수정' : '자산 추가'}
      >
        {editing !== undefined && (
          <AssetForm
            initial={editing ?? null}
            fixedItems={fixedItems}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(undefined)}
            onDelete={editing ? handleDelete : undefined}
          />
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add "app/[familyId]/assets/page.tsx"
git commit -m "feat: 자산 현황 페이지 추가"
```

---

## Task 10: 온보딩 Step 1 — 자산 등록

**Files:**
- Create: `components/onboarding/Step1Assets.tsx`

- [ ] **Step 1: Step1Assets 구현**

```tsx
// components/onboarding/Step1Assets.tsx
'use client'
import { useState } from 'react'
import type { Asset, AssetCategory, FixedItem } from '@/types'
import { ASSET_CATEGORIES } from '@/types'
import { formatAmount } from '@/lib/utils'
import { updateFamily, createAsset } from '@/lib/queries'

interface Props {
  familyId: string
  onNext: () => void
}

interface AssetInput {
  name: string
  category: AssetCategory
  initial_balance: string
}

export default function Step1Assets({ familyId, onNext }: Props) {
  const [income, setIncome] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [assetName, setAssetName] = useState('')
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('금융')
  const [assetBalance, setAssetBalance] = useState('')
  const [addedAssets, setAddedAssets] = useState<AssetInput[]>([])
  const [loading, setLoading] = useState(false)

  function addAsset() {
    const bal = parseInt(assetBalance.replace(/,/g, ''))
    if (!assetName.trim() || isNaN(bal) || bal < 0) return
    setAddedAssets(prev => [...prev, { name: assetName.trim(), category: assetCategory, initial_balance: assetBalance }])
    setAssetName('')
    setAssetBalance('')
    setAssetCategory('금융')
    setShowForm(false)
  }

  async function handleNext() {
    const parsedIncome = parseInt(income.replace(/,/g, ''))
    if (isNaN(parsedIncome) || parsedIncome < 0) return
    setLoading(true)
    try {
      await updateFamily(familyId, { monthly_income: parsedIncome })
      for (const a of addedAssets) {
        await createAsset(familyId, {
          name: a.name,
          category: a.category,
          initial_balance: parseInt(a.initial_balance.replace(/,/g, '')),
          linked_fixed_item_id: null,
        })
      }
      onNext()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">월 근로소득</p>
        <input
          type="number"
          placeholder="월 수입 (원)"
          value={income}
          onChange={e => setIncome(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          min={0}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">자산 항목</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm text-indigo-600 font-medium"
          >
            + 추가
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-3 flex flex-col gap-3">
            <input
              type="text"
              placeholder="항목 이름 (예: 적금 A은행)"
              value={assetName}
              onChange={e => setAssetName(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
            <select
              value={assetCategory}
              onChange={e => setAssetCategory(e.target.value as AssetCategory)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              placeholder="현재 잔액 (원)"
              value={assetBalance}
              onChange={e => setAssetBalance(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              min={0}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={addAsset}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm"
              >
                추가
              </button>
            </div>
          </div>
        )}

        {addedAssets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">아직 등록된 자산이 없습니다</p>
        ) : (
          <div className="flex flex-col gap-2">
            {addedAssets.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-emerald-600">{formatAmount(parseInt(a.initial_balance) || 0)}원</p>
                  <button
                    type="button"
                    onClick={() => setAddedAssets(prev => prev.filter((_, j) => j !== i))}
                    className="text-red-400 text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
      >
        {loading ? '저장 중...' : '다음'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/onboarding/Step1Assets.tsx
git commit -m "feat: 온보딩 Step1 자산 등록 컴포넌트"
```

---

## Task 11: 온보딩 Step 2 — 고정비 등록

**Files:**
- Create: `components/onboarding/Step2FixedItems.tsx`

- [ ] **Step 1: Step2FixedItems 구현**

```tsx
// components/onboarding/Step2FixedItems.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { FixedItem } from '@/types'
import { getFixedItems, createFixedItem, deleteFixedItem } from '@/lib/queries'
import { formatAmount } from '@/lib/utils'
import FixedItemForm from '@/components/fixed-items/FixedItemForm'
import Modal from '@/components/ui/Modal'

interface Props {
  familyId: string
  onNext: () => void
  onBack: () => void
}

export default function Step2FixedItems({ familyId, onNext, onBack }: Props) {
  const [items, setItems] = useState<FixedItem[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)

  const load = useCallback(async () => {
    setItems(await getFixedItems(familyId))
  }, [familyId])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Omit<FixedItem, 'id' | 'family_id' | 'created_at'>) {
    await createFixedItem(familyId, data)
    setIsFormOpen(false)
    await load()
  }

  async function handleDelete(id: string) {
    await deleteFixedItem(id)
    await load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{items.length}개 항목 등록됨</p>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="text-sm text-indigo-600 font-medium"
        >
          + 추가
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">고정비 항목을 추가해주세요</p>
      ) : (
        <div className="flex flex-col">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 px-1 border-b border-gray-100"
            >
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-gray-400">
                  {item.group_name}{item.billing_day ? ` · 매월 ${item.billing_day}일` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-gray-700">{formatAmount(item.amount)}원</p>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="text-red-400 text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
        >
          이전
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium"
        >
          다음
        </button>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="고정비 추가">
        {isFormOpen && (
          <FixedItemForm
            initial={null}
            onSubmit={handleSubmit}
            onCancel={() => setIsFormOpen(false)}
            onDelete={undefined}
          />
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/onboarding/Step2FixedItems.tsx
git commit -m "feat: 온보딩 Step2 고정비 등록 컴포넌트"
```

---

## Task 12: 온보딩 Step 3 — 고정비-자산 연결

**Files:**
- Create: `components/onboarding/Step3LinkAssets.tsx`

- [ ] **Step 1: Step3LinkAssets 구현**

```tsx
// components/onboarding/Step3LinkAssets.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { FixedItem, Asset } from '@/types'
import { getFixedItems, getAssetsWithBalance, updateAsset } from '@/lib/queries'
import { formatAmount } from '@/lib/utils'

interface Props {
  familyId: string
  onNext: () => void
  onBack: () => void
}

export default function Step3LinkAssets({ familyId, onNext, onBack }: Props) {
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  // assetId → fixedItemId mapping (key: assetId, value: fixedItemId | '')
  const [links, setLinks] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const [fi, a] = await Promise.all([
      getFixedItems(familyId),
      getAssetsWithBalance(familyId),
    ])
    setFixedItems(fi.filter(f => f.is_active))
    setAssets(a)
    const initial: Record<string, string> = {}
    for (const asset of a) {
      initial[asset.id] = asset.linked_fixed_item_id ?? ''
    }
    setLinks(initial)
  }, [familyId])

  useEffect(() => { load() }, [load])

  async function handleNext() {
    setLoading(true)
    try {
      for (const [assetId, fixedItemId] of Object.entries(links)) {
        await updateAsset(assetId, { linked_fixed_item_id: fixedItemId || null })
      }
      onNext()
    } finally {
      setLoading(false)
    }
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-400 text-center py-8">등록된 자산 항목이 없습니다</p>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium">이전</button>
          <button type="button" onClick={onNext} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium">다음</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">각 자산 항목에 자동으로 적립할 고정비를 연결하세요.</p>

      <div className="flex flex-col gap-3">
        {assets.map(asset => (
          <div key={asset.id} className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium">{asset.name}</p>
                <p className="text-xs text-gray-400">{asset.category} · {formatAmount(asset.initial_balance)}원</p>
              </div>
            </div>
            <select
              value={links[asset.id] ?? ''}
              onChange={e => setLinks(prev => ({ ...prev, [asset.id]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">연결 안 함</option>
              {fixedItems.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} — {formatAmount(f.amount)}원{f.billing_day ? ` (매월 ${f.billing_day}일)` : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={loading}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? '저장 중...' : '다음'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/onboarding/Step3LinkAssets.tsx
git commit -m "feat: 온보딩 Step3 고정비-자산 연결 컴포넌트"
```

---

## Task 13: 온보딩 Step 4 — 예산 설정

**Files:**
- Create: `components/onboarding/Step4Budgets.tsx`

- [ ] **Step 1: Step4Budgets 구현**

```tsx
// components/onboarding/Step4Budgets.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { BudgetWithUsage, Category } from '@/types'
import { getBudgetsWithUsage, upsertBudget, getCategories, seedDefaultCategories, updateFamily } from '@/lib/queries'
import { useMonthStore } from '@/lib/monthStore'
import BudgetCard from '@/components/budgets/BudgetCard'
import BudgetForm from '@/components/budgets/BudgetForm'
import Modal from '@/components/ui/Modal'
import { useRouter } from 'next/navigation'

interface Props {
  familyId: string
  onBack: () => void
}

export default function Step4Budgets({ familyId, onBack }: Props) {
  const { current } = useMonthStore()
  const router = useRouter()
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<BudgetWithUsage | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    let cats = await getCategories(familyId)
    if (cats.length === 0) {
      await seedDefaultCategories(familyId)
      cats = await getCategories(familyId)
    }
    setCategories(cats)
    setBudgets(await getBudgetsWithUsage(familyId, current))
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  async function handleSave(amount: number) {
    if (!editing) return
    await upsertBudget(familyId, editing.category_id, current, amount)
    setEditing(null)
    await load()
  }

  const allItems = categories.map(cat => {
    const existing = budgets.find(b => b.category_id === cat.id)
    return existing ?? {
      id: '',
      family_id: familyId,
      category_id: cat.id,
      amount: 0,
      year: current.year,
      month: current.month,
      used: 0,
      category: cat,
    } as BudgetWithUsage
  })

  async function handleComplete() {
    setLoading(true)
    try {
      await updateFamily(familyId, { onboarding_completed: true })
      router.replace(`/${familyId}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">카테고리별 월 예산을 설정하세요. 나중에 수정할 수 있습니다.</p>

      <div className="flex flex-col gap-2">
        {allItems.map(item => (
          <BudgetCard key={item.category_id} budget={item} onEdit={item => setEditing(item)} />
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? '저장 중...' : '완료'}
        </button>
      </div>

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="예산 설정">
        {editing && (
          <BudgetForm
            categoryName={editing.category.name}
            categoryIcon={editing.category.icon}
            currentAmount={editing.amount}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/onboarding/Step4Budgets.tsx
git commit -m "feat: 온보딩 Step4 예산 설정 컴포넌트"
```

---

## Task 14: OnboardingWizard + 온보딩 페이지

**Files:**
- Create: `components/onboarding/OnboardingWizard.tsx`
- Create: `app/[familyId]/onboarding/page.tsx`
- Create: `__tests__/OnboardingWizard.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// __tests__/OnboardingWizard.test.tsx
import { render, screen } from '@testing-library/react'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

jest.mock('@/lib/queries', () => ({
  updateFamily: jest.fn().mockResolvedValue(undefined),
  createAsset: jest.fn().mockResolvedValue({}),
  getFixedItems: jest.fn().mockResolvedValue([]),
  getAssetsWithBalance: jest.fn().mockResolvedValue([]),
  getBudgetsWithUsage: jest.fn().mockResolvedValue([]),
  getCategories: jest.fn().mockResolvedValue([]),
  seedDefaultCategories: jest.fn().mockResolvedValue(undefined),
  deleteFixedItem: jest.fn().mockResolvedValue(undefined),
  createFixedItem: jest.fn().mockResolvedValue({}),
  updateAsset: jest.fn().mockResolvedValue({}),
  upsertBudget: jest.fn().mockResolvedValue({}),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}))

jest.mock('@/lib/monthStore', () => ({
  useMonthStore: () => ({ current: { year: 2026, month: 4 } }),
}))

describe('OnboardingWizard', () => {
  it('Step 1 제목을 표시한다', () => {
    render(<OnboardingWizard familyId="fam1" />)
    expect(screen.getByText('Step 1 / 4')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/OnboardingWizard.test.tsx
```

Expected: FAIL

- [ ] **Step 3: OnboardingWizard 구현**

```tsx
// components/onboarding/OnboardingWizard.tsx
'use client'
import { useState } from 'react'
import Step1Assets from './Step1Assets'
import Step2FixedItems from './Step2FixedItems'
import Step3LinkAssets from './Step3LinkAssets'
import Step4Budgets from './Step4Budgets'

interface Props {
  familyId: string
}

const STEP_LABELS = ['자산 현황 등록', '고정비 입력', '자산 연결', '예산 설정']

export default function OnboardingWizard({ familyId }: Props) {
  const [step, setStep] = useState(1)

  return (
    <div className="flex flex-col h-full">
      {/* 진행 표시 */}
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">Step {step} / 4</p>
          <p className="text-xs font-medium text-indigo-600">{STEP_LABELS[step - 1]}</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {/* 스텝 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {step === 1 && <Step1Assets familyId={familyId} onNext={() => setStep(2)} />}
        {step === 2 && <Step2FixedItems familyId={familyId} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3LinkAssets familyId={familyId} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Step4Budgets familyId={familyId} onBack={() => setStep(3)} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 온보딩 페이지 구현**

```tsx
// app/[familyId]/onboarding/page.tsx
'use client'
import { useParams } from 'next/navigation'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
  const { familyId } = useParams<{ familyId: string }>()

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="bg-indigo-600 text-white px-4 py-5">
        <p className="text-xs text-indigo-200 mb-1">가족 가계부 설정</p>
        <h1 className="text-xl font-bold">처음 시작하기</h1>
        <p className="text-sm text-indigo-200 mt-1">기본 정보를 입력하면 앱을 사용할 수 있어요</p>
      </div>
      <div className="flex-1 flex flex-col">
        <OnboardingWizard familyId={familyId} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx jest __tests__/OnboardingWizard.test.tsx
```

Expected: PASS (1/1)

- [ ] **Step 6: 전체 테스트 실행**

```bash
npx jest
```

Expected: 모든 테스트 PASS

- [ ] **Step 7: 커밋**

```bash
git add components/onboarding/OnboardingWizard.tsx "app/[familyId]/onboarding/page.tsx" __tests__/OnboardingWizard.test.tsx
git commit -m "feat: OnboardingWizard 4단계 위저드 + 온보딩 페이지"
```

---

## Task 15: 홈 대시보드 업데이트

**Files:**
- Create: `components/dashboard/AssetSummaryCard.tsx`
- Modify: `app/[familyId]/page.tsx`

- [ ] **Step 1: AssetSummaryCard 구현**

```tsx
// components/dashboard/AssetSummaryCard.tsx
'use client'
import { useRouter } from 'next/navigation'
import { formatAmount } from '@/lib/utils'
import type { AssetCategory } from '@/types'

interface Props {
  familyId: string
  total: number
  byCategory: Record<AssetCategory, number>
}

export default function AssetSummaryCard({ familyId, total, byCategory }: Props) {
  const router = useRouter()
  return (
    <div
      className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 cursor-pointer active:bg-emerald-100"
      onClick={() => router.push(`/${familyId}/assets`)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <p className="text-xs text-emerald-700 font-medium">총 자산</p>
        </div>
        <p className="text-xs text-emerald-500">관리하기 →</p>
      </div>
      <p className="text-xl font-bold text-emerald-800 mb-2">{formatAmount(total)}원</p>
      <div className="flex gap-3 text-xs text-emerald-600">
        <span>금융 {formatAmount(byCategory['금융'])}</span>
        <span>투자 {formatAmount(byCategory['투자'])}</span>
        <span>보증금 {formatAmount(byCategory['보증금'])}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: app/[familyId]/page.tsx 수정**

기존 import 줄에 추가:
```typescript
import { getMonthlySummary, getTransactions, getBudgetsWithUsage, getCategories, seedDefaultCategories, getFixedItemsSummary, getAssetsSummary, getOrCreateFamily } from '@/lib/queries'
import type { BudgetWithUsage, Transaction, AssetCategory } from '@/types'
import AssetSummaryCard from '@/components/dashboard/AssetSummaryCard'
```

state 추가:
```typescript
const [assetSummary, setAssetSummary] = useState<{ total: number; byCategory: Record<AssetCategory, number> }>({
  total: 0,
  byCategory: { 금융: 0, 투자: 0, 보증금: 0 },
})
const [monthlyIncome, setMonthlyIncome] = useState(0)
```

load 함수의 Promise.all에 추가:
```typescript
const [sum, bdg, txns, fixedSum, assetSum, family] = await Promise.all([
  getMonthlySummary(familyId, current),
  getBudgetsWithUsage(familyId, current),
  getTransactions(familyId, current),
  getFixedItemsSummary(familyId),
  getAssetsSummary(familyId),
  getOrCreateFamily(familyId),
])
setSummary(sum)
setBudgets(bdg)
setRecentTxns(txns)
setFixedSummary(fixedSum)
setAssetSummary(assetSum)
setMonthlyIncome(family.monthly_income)
```

JSX에 AssetSummaryCard 추가 (FixedItemsSummaryCard 아래):
```tsx
<AssetSummaryCard
  familyId={familyId}
  total={assetSummary.total}
  byCategory={assetSummary.byCategory}
/>
```

- [ ] **Step 3: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add components/dashboard/AssetSummaryCard.tsx "app/[familyId]/page.tsx"
git commit -m "feat: 홈 대시보드에 자산 요약 카드 추가"
```

---

## Task 16: BottomNav 자산 탭 추가

**Files:**
- Modify: `components/layout/BottomNav.tsx`

- [ ] **Step 1: BottomNav.tsx 수정**

`tabs` 배열을 다음으로 교체:
```typescript
const tabs = [
  { href: '',              label: '홈',   icon: '🏠' },
  { href: '/transactions', label: '내역', icon: '📋' },
  { href: '/budgets',      label: '예산', icon: '🎯' },
  { href: '/fixed-items',  label: '고정비', icon: '📌' },
  { href: '/assets',       label: '자산', icon: '💰' },
  { href: '/stats',        label: '통계', icon: '📈' },
]
```

Link 클래스의 `text-xs`를 유지 (6탭에서도 충분히 표시됨).

- [ ] **Step 2: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/layout/BottomNav.tsx
git commit -m "feat: BottomNav에 자산 탭 추가 (6탭)"
```

---

## Task 17: TransactionForm 자산 추가납입 연동

**Files:**
- Modify: `components/transactions/TransactionForm.tsx`
- Modify: `app/[familyId]/transactions/page.tsx`

- [ ] **Step 1: TransactionForm Props에 assets 추가 + 추가납입 토글 구현**

`components/transactions/TransactionForm.tsx` 전체 교체:

```tsx
'use client'
import { useState } from 'react'
import type { Transaction, Category, Asset } from '@/types'

interface Props {
  categories: Category[]
  assets: Asset[]
  initial?: Transaction | null
  onSubmit: (
    data: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>,
    assetId?: string
  ) => Promise<void>
  onCancel: () => void
}

export default function TransactionForm({ categories, assets, initial, onSubmit, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [date, setDate] = useState(initial?.date ?? today)
  const [linkAsset, setLinkAsset] = useState(false)
  const [assetId, setAssetId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(amount.replace(/,/g, ''))
    if (isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    try {
      await onSubmit(
        { type, amount: parsed, category_id: categoryId || null, memo: memo || null, date },
        linkAsset && assetId ? assetId : undefined
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(['expense', 'income'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              type === t
                ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t === 'expense' ? '지출' : '수입'}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
        required
      />
      <input
        type="number"
        placeholder="금액 (원)"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
        required
        min={1}
      />
      <select
        value={categoryId}
        onChange={e => setCategoryId(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        <option value="">카테고리 선택</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="메모 (선택)"
        value={memo}
        onChange={e => setMemo(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      />

      {assets.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-sm font-medium text-gray-700">자산에 추가납입</p>
            <button
              type="button"
              onClick={() => setLinkAsset(v => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${linkAsset ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${linkAsset ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          {linkAsset && (
            <select
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
              required
            >
              <option value="">자산 항목 선택</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? '저장 중...' : initial ? '수정' : '저장'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: transactions/page.tsx 수정**

`app/[familyId]/transactions/page.tsx`의 import에 추가:
```typescript
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories, seedDefaultCategories, getAssetsWithBalance, addManualLedgerEntry } from '@/lib/queries'
import type { Transaction, Category, Asset } from '@/types'
```

state 추가:
```typescript
const [assets, setAssets] = useState<Asset[]>([])
```

load 함수 전체를 다음으로 교체:
```typescript
const load = useCallback(async () => {
  const [txns, cats, a] = await Promise.all([
    getTransactions(familyId, current),
    getCategories(familyId),
    getAssetsWithBalance(familyId),
  ])
  if (cats.length === 0) {
    await seedDefaultCategories(familyId)
    setCategories(await getCategories(familyId))
  } else {
    setCategories(cats)
  }
  setTransactions(txns)
  setAssets(a)
}, [familyId, current])
```

handleSubmit 시그니처와 본문 수정:
```typescript
async function handleSubmit(
  data: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>,
  assetId?: string
) {
  let txn: Transaction
  if (editing) {
    txn = await updateTransaction(editing.id, data)
  } else {
    txn = await createTransaction(familyId, data)
  }
  if (assetId) {
    await addManualLedgerEntry(assetId, data.amount, txn.id, data.memo ?? undefined)
  }
  setIsFormOpen(false)
  setEditing(null)
  await load()
}
```

TransactionForm JSX에 `assets={assets}` prop 추가:
```tsx
<TransactionForm
  categories={categories}
  assets={assets}
  initial={editing}
  onSubmit={handleSubmit}
  onCancel={() => { setIsFormOpen(false); setEditing(null) }}
/>
```

- [ ] **Step 3: 타입 검사**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 4: 전체 테스트 실행**

```bash
npx jest
```

Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add components/transactions/TransactionForm.tsx "app/[familyId]/transactions/page.tsx"
git commit -m "feat: TransactionForm에 자산 추가납입 연동"
```

---

## 완료 확인

모든 태스크 완료 후 최종 확인:

```bash
npx tsc --noEmit && npx jest
```

Expected:
- TypeScript 에러 없음
- 모든 테스트 PASS

브라우저 확인 순서:
1. `localStorage.clear()` 후 앱 접속 → 온보딩 페이지로 이동
2. 4단계 완료 → 홈 화면
3. 하단 탭 💰 자산 클릭 → 자산 현황 화면
4. FAB → 자산 추가 → C 레이아웃 업데이트 확인
5. 거래 내역 등록 → "자산에 추가납입" 토글 확인
