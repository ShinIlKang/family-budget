# 고정비 항목 관리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매달 정기적으로 나가는 고정비 항목을 등록·관리하고 대시보드 홈에서 합계를 한눈에 확인할 수 있게 한다.

**Architecture:** 신규 `fixed_items` Supabase 테이블에 항목을 저장하고 기존 쿼리 패턴을 따라 `lib/queries.ts`에 CRUD 함수를 추가한다. 홈 대시보드에 요약 카드를 넣고 카드 탭 시 `/{familyId}/fixed-items` 관리 페이지로 이동한다. 관리 페이지는 그룹 탭 필터 + FAB 추가 + 탭 수정 모달 구조다.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Tailwind CSS, Jest + Testing Library

---

## File Map

| 파일 | 역할 |
|------|------|
| `types/index.ts` | `FixedItem`, `FixedItemGroup`, `FIXED_ITEM_GROUPS` 추가 |
| `supabase/schema.sql` | `fixed_items` 테이블 DDL 추가 |
| `lib/queries.ts` | `getFixedItems`, `createFixedItem`, `updateFixedItem`, `deleteFixedItem`, `getFixedItemsSummary` 추가 |
| `components/fixed-items/FixedItemRow.tsx` | 항목 1행 (이름·금액·납부일·비활성 표시) |
| `components/fixed-items/FixedItemForm.tsx` | 추가/수정 폼 (이름·금액·그룹·납부일·메모·활성토글·삭제) |
| `components/fixed-items/FixedItemList.tsx` | 그룹 탭 필터 + 목록 + 활성 합계 하단 바 |
| `components/dashboard/FixedItemsSummaryCard.tsx` | 홈 대시보드 요약 카드 |
| `app/[familyId]/fixed-items/page.tsx` | 고정비 관리 페이지 |
| `app/[familyId]/page.tsx` | 대시보드: FixedItemsSummaryCard 추가 |
| `__tests__/FixedItemRow.test.tsx` | FixedItemRow 단위 테스트 |
| `__tests__/FixedItemForm.test.tsx` | FixedItemForm 단위 테스트 |

---

### Task 1: 타입 정의 및 DB 스키마

**Files:**
- Modify: `types/index.ts`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: `types/index.ts` 끝에 타입 추가**

```typescript
export type FixedItemGroup =
  | '구독/서비스'
  | '보험/금융'
  | '공과금'
  | '통신/교통'
  | '주거'
  | '교육'
  | '저축/투자'

export const FIXED_ITEM_GROUPS: FixedItemGroup[] = [
  '구독/서비스',
  '보험/금융',
  '공과금',
  '통신/교통',
  '주거',
  '교육',
  '저축/투자',
]

export interface FixedItem {
  id: string
  family_id: string
  name: string
  amount: number
  group_name: FixedItemGroup
  billing_day: number | null
  memo: string | null
  is_active: boolean
  created_at: string
}
```

- [ ] **Step 2: `supabase/schema.sql` 끝에 DDL 추가**

```sql
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
```

- [ ] **Step 3: Supabase 대시보드 SQL Editor에서 Step 2 DDL 실행**

Supabase 프로젝트 → SQL Editor → 위 SQL 붙여넣기 → Run

- [ ] **Step 4: 커밋**

```bash
git add types/index.ts supabase/schema.sql
git commit -m "feat: FixedItem 타입 및 fixed_items DB 스키마 추가"
```

---

### Task 2: 쿼리 함수

**Files:**
- Modify: `lib/queries.ts`

- [ ] **Step 1: `lib/queries.ts` import 줄 수정**

기존:
```typescript
import type { Transaction, Category, Budget, MonthYear, BudgetWithUsage } from '@/types'
```
변경:
```typescript
import type { Transaction, Category, Budget, MonthYear, BudgetWithUsage, FixedItem } from '@/types'
```

- [ ] **Step 2: 파일 끝에 고정비 CRUD 함수 추가**

```typescript
// ─── 고정비 항목 ────────────────────────────────────────────

export async function getFixedItems(familyId: string): Promise<FixedItem[]> {
  const { data, error } = await supabase
    .from('fixed_items')
    .select('*')
    .eq('family_id', familyId)
    .order('group_name')
    .order('name')
  if (error) throw error
  return data
}

export async function createFixedItem(
  familyId: string,
  input: Omit<FixedItem, 'id' | 'family_id' | 'created_at'>
): Promise<FixedItem> {
  const { data, error } = await supabase
    .from('fixed_items')
    .insert({ family_id: familyId, ...input })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFixedItem(
  id: string,
  input: Omit<FixedItem, 'id' | 'family_id' | 'created_at'>
): Promise<FixedItem> {
  const { data, error } = await supabase
    .from('fixed_items')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFixedItem(id: string): Promise<void> {
  const { error } = await supabase.from('fixed_items').delete().eq('id', id)
  if (error) throw error
}

export async function getFixedItemsSummary(
  familyId: string
): Promise<{ total: number; activeCount: number }> {
  const { data, error } = await supabase
    .from('fixed_items')
    .select('amount, is_active')
    .eq('family_id', familyId)
    .eq('is_active', true)
  if (error) throw error
  return {
    total: (data ?? []).reduce((s, i) => s + i.amount, 0),
    activeCount: (data ?? []).length,
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add lib/queries.ts
git commit -m "feat: 고정비 항목 CRUD 및 요약 쿼리 함수 추가"
```

---

### Task 3: FixedItemRow 컴포넌트 (TDD)

**Files:**
- Create: `components/fixed-items/FixedItemRow.tsx`
- Create: `__tests__/FixedItemRow.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/FixedItemRow.test.tsx` 생성:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import FixedItemRow from '@/components/fixed-items/FixedItemRow'
import type { FixedItem } from '@/types'

const mockItem: FixedItem = {
  id: '1',
  family_id: 'fam1',
  name: '유튜브 구독료',
  amount: 14900,
  group_name: '구독/서비스',
  billing_day: 1,
  memo: null,
  is_active: true,
  created_at: '2026-01-01',
}

describe('FixedItemRow', () => {
  it('항목 이름과 금액을 표시한다', () => {
    render(<FixedItemRow item={mockItem} onEdit={jest.fn()} />)
    expect(screen.getByText('유튜브 구독료')).toBeInTheDocument()
    expect(screen.getByText(/14,900/)).toBeInTheDocument()
  })

  it('납부일이 있으면 표시한다', () => {
    render(<FixedItemRow item={mockItem} onEdit={jest.fn()} />)
    expect(screen.getByText(/매월 1일/)).toBeInTheDocument()
  })

  it('납부일이 없으면 납부일 텍스트가 없다', () => {
    render(<FixedItemRow item={{ ...mockItem, billing_day: null }} onEdit={jest.fn()} />)
    expect(screen.queryByText(/매월/)).not.toBeInTheDocument()
  })

  it('비활성 항목은 opacity-40 클래스를 가진다', () => {
    const { container } = render(
      <FixedItemRow item={{ ...mockItem, is_active: false }} onEdit={jest.fn()} />
    )
    expect(container.firstChild).toHaveClass('opacity-40')
  })

  it('클릭하면 onEdit이 호출된다', () => {
    const onEdit = jest.fn()
    render(<FixedItemRow item={mockItem} onEdit={onEdit} />)
    fireEvent.click(screen.getByText('유튜브 구독료'))
    expect(onEdit).toHaveBeenCalledWith(mockItem)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd /Users/kangshinil/dev/family-budget/.worktrees/feat-app
npx jest __tests__/FixedItemRow.test.tsx --no-coverage
```

Expected: `Cannot find module '@/components/fixed-items/FixedItemRow'`

- [ ] **Step 3: FixedItemRow 구현**

`components/fixed-items/FixedItemRow.tsx` 생성:

```typescript
import type { FixedItem } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  item: FixedItem
  onEdit: (item: FixedItem) => void
}

export default function FixedItemRow({ item, onEdit }: Props) {
  return (
    <div
      className={`flex items-center justify-between py-3 px-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer${!item.is_active ? ' opacity-40' : ''}`}
      onClick={() => onEdit(item)}
    >
      <div>
        <p className="text-sm font-medium text-gray-800">{item.name}</p>
        {item.billing_day && (
          <p className="text-xs text-gray-400">매월 {item.billing_day}일</p>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-700">{formatAmount(item.amount)}원</p>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/FixedItemRow.test.tsx --no-coverage
```

Expected: 5 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add components/fixed-items/FixedItemRow.tsx __tests__/FixedItemRow.test.tsx
git commit -m "feat: FixedItemRow 컴포넌트 추가"
```

---

### Task 4: FixedItemForm 컴포넌트 (TDD)

**Files:**
- Create: `components/fixed-items/FixedItemForm.tsx`
- Create: `__tests__/FixedItemForm.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/FixedItemForm.test.tsx` 생성:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import FixedItemForm from '@/components/fixed-items/FixedItemForm'
import type { FixedItem } from '@/types'

const mockItem: FixedItem = {
  id: '1',
  family_id: 'fam1',
  name: '유튜브 구독료',
  amount: 14900,
  group_name: '구독/서비스',
  billing_day: 1,
  memo: '가족 플랜',
  is_active: true,
  created_at: '2026-01-01',
}

describe('FixedItemForm', () => {
  it('신규 추가 시 빈 폼을 렌더링하고 삭제 버튼이 없다', () => {
    render(
      <FixedItemForm initial={null} onSubmit={jest.fn()} onCancel={jest.fn()} onDelete={undefined} />
    )
    expect(screen.getByPlaceholderText('항목 이름')).toHaveValue('')
    expect(screen.queryByText('삭제')).not.toBeInTheDocument()
  })

  it('수정 시 기존 값이 채워지고 삭제 버튼이 있다', () => {
    render(
      <FixedItemForm initial={mockItem} onSubmit={jest.fn()} onCancel={jest.fn()} onDelete={jest.fn()} />
    )
    expect(screen.getByPlaceholderText('항목 이름')).toHaveValue('유튜브 구독료')
    expect(screen.getByText('삭제')).toBeInTheDocument()
  })

  it('이름이 비어 있으면 onSubmit이 호출되지 않는다', () => {
    const onSubmit = jest.fn()
    render(
      <FixedItemForm initial={null} onSubmit={onSubmit} onCancel={jest.fn()} onDelete={undefined} />
    )
    fireEvent.change(screen.getByPlaceholderText('금액 (원)'), { target: { value: '10000' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    const onCancel = jest.fn()
    render(
      <FixedItemForm initial={null} onSubmit={jest.fn()} onCancel={onCancel} onDelete={undefined} />
    )
    fireEvent.click(screen.getByText('취소'))
    expect(onCancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/FixedItemForm.test.tsx --no-coverage
```

Expected: `Cannot find module '@/components/fixed-items/FixedItemForm'`

- [ ] **Step 3: FixedItemForm 구현**

`components/fixed-items/FixedItemForm.tsx` 생성:

```typescript
'use client'
import { useState } from 'react'
import type { FixedItem, FixedItemGroup } from '@/types'
import { FIXED_ITEM_GROUPS } from '@/types'

interface Props {
  initial: FixedItem | null
  onSubmit: (data: Omit<FixedItem, 'id' | 'family_id' | 'created_at'>) => Promise<void>
  onCancel: () => void
  onDelete: (() => Promise<void>) | undefined
}

export default function FixedItemForm({ initial, onSubmit, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [groupName, setGroupName] = useState<FixedItemGroup>(initial?.group_name ?? '구독/서비스')
  const [billingDay, setBillingDay] = useState(initial?.billing_day ? String(initial.billing_day) : '')
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(amount.replace(/,/g, ''))
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    await onSubmit({
      name: name.trim(),
      amount: parsed,
      group_name: groupName,
      billing_day: billingDay ? parseInt(billingDay) : null,
      memo: memo.trim() || null,
      is_active: isActive,
    })
    setLoading(false)
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    setLoading(true)
    await onDelete()
    setLoading(false)
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
        value={groupName}
        onChange={e => setGroupName(e.target.value as FixedItemGroup)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        {FIXED_ITEM_GROUPS.map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <select
        value={billingDay}
        onChange={e => setBillingDay(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2"
      >
        <option value="">납부일 선택 (선택)</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>매월 {d}일</option>
        ))}
      </select>
      <textarea
        placeholder="메모 (선택)"
        value={memo}
        onChange={e => setMemo(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 resize-none"
        rows={2}
        maxLength={100}
      />
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
        <div>
          <p className="text-sm font-medium text-gray-700">활성 상태</p>
          <p className="text-xs text-gray-400">비활성 시 집계에서 제외</p>
        </div>
        <button
          type="button"
          onClick={() => setIsActive(v => !v)}
          className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
          aria-label="활성 토글"
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </button>
      </div>
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
npx jest __tests__/FixedItemForm.test.tsx --no-coverage
```

Expected: 4 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add components/fixed-items/FixedItemForm.tsx __tests__/FixedItemForm.test.tsx
git commit -m "feat: FixedItemForm 컴포넌트 추가"
```

---

### Task 5: FixedItemsSummaryCard 컴포넌트

**Files:**
- Create: `components/dashboard/FixedItemsSummaryCard.tsx`

- [ ] **Step 1: FixedItemsSummaryCard 구현**

`components/dashboard/FixedItemsSummaryCard.tsx` 생성:

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { formatAmount } from '@/lib/utils'

interface Props {
  familyId: string
  total: number
  activeCount: number
}

export default function FixedItemsSummaryCard({ familyId, total, activeCount }: Props) {
  const router = useRouter()
  return (
    <div
      className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer active:bg-amber-100"
      onClick={() => router.push(`/${familyId}/fixed-items`)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📌</span>
          <div>
            <p className="text-xs text-amber-700 font-medium">이번달 고정비</p>
            <p className="text-xs text-amber-500">{activeCount}개 항목</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-amber-800">{formatAmount(total)}원</p>
          <p className="text-xs text-amber-500">관리하기 →</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/dashboard/FixedItemsSummaryCard.tsx
git commit -m "feat: FixedItemsSummaryCard 대시보드 카드 추가"
```

---

### Task 6: FixedItemList 컴포넌트 + 고정비 관리 페이지

**Files:**
- Create: `components/fixed-items/FixedItemList.tsx`
- Create: `app/[familyId]/fixed-items/page.tsx`

- [ ] **Step 1: FixedItemList 구현**

`components/fixed-items/FixedItemList.tsx` 생성:

```typescript
'use client'
import { useState } from 'react'
import type { FixedItem, FixedItemGroup } from '@/types'
import { FIXED_ITEM_GROUPS } from '@/types'
import { formatAmount } from '@/lib/utils'
import FixedItemRow from './FixedItemRow'

interface Props {
  items: FixedItem[]
  onEdit: (item: FixedItem) => void
}

const ALL_TAB = '전체' as const

export default function FixedItemList({ items, onEdit }: Props) {
  const [activeTab, setActiveTab] = useState<FixedItemGroup | typeof ALL_TAB>(ALL_TAB)

  const filtered = activeTab === ALL_TAB ? items : items.filter(i => i.group_name === activeTab)
  const activeTotal = items.filter(i => i.is_active).reduce((s, i) => s + i.amount, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white">
        {([ALL_TAB, ...FIXED_ITEM_GROUPS] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-white">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">항목이 없습니다</p>
        ) : (
          filtered.map(item => (
            <FixedItemRow key={item.id} item={item} onEdit={onEdit} />
          ))
        )}
      </div>
      <div className="border-t border-gray-200 bg-white px-4 py-3 flex justify-between items-center flex-shrink-0">
        <span className="text-sm text-gray-500">활성 항목 합계</span>
        <span className="text-base font-bold text-indigo-600">{formatAmount(activeTotal)}원</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 고정비 관리 페이지 구현**

`app/[familyId]/fixed-items/page.tsx` 생성:

```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getFixedItems, createFixedItem, updateFixedItem, deleteFixedItem } from '@/lib/queries'
import type { FixedItem } from '@/types'
import FixedItemList from '@/components/fixed-items/FixedItemList'
import FixedItemForm from '@/components/fixed-items/FixedItemForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

// editing: undefined=모달 닫힘, null=신규 추가, FixedItem=수정
export default function FixedItemsPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const router = useRouter()
  const [items, setItems] = useState<FixedItem[]>([])
  const [editing, setEditing] = useState<FixedItem | null | undefined>(undefined)

  const load = useCallback(async () => {
    setItems(await getFixedItems(familyId))
  }, [familyId])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Omit<FixedItem, 'id' | 'family_id' | 'created_at'>) {
    if (editing === null) {
      await createFixedItem(familyId, data)
    } else if (editing) {
      await updateFixedItem(editing.id, data)
    }
    setEditing(undefined)
    await load()
  }

  async function handleDelete() {
    if (!editing) return
    await deleteFixedItem((editing as FixedItem).id)
    setEditing(undefined)
    await load()
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-indigo-600 text-white px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.back()} className="text-indigo-200 text-xl leading-none">←</button>
        <h1 className="text-lg font-semibold">고정비 관리</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <FixedItemList items={items} onEdit={item => setEditing(item)} />
      </div>
      <FAB onClick={() => setEditing(null)} />
      <Modal
        isOpen={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? '고정비 수정' : '고정비 추가'}
      >
        {editing !== undefined && (
          <FixedItemForm
            initial={editing ?? null}
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

- [ ] **Step 3: 커밋**

```bash
git add components/fixed-items/FixedItemList.tsx app/[familyId]/fixed-items/page.tsx
git commit -m "feat: 고정비 관리 페이지 및 FixedItemList 추가"
```

---

### Task 7: 대시보드 통합

**Files:**
- Modify: `lib/queries.ts` (이미 `getFixedItemsSummary` 추가됨 — Task 2)
- Modify: `app/[familyId]/page.tsx`

- [ ] **Step 1: `app/[familyId]/page.tsx` import 수정**

기존:
```typescript
import { getMonthlySummary, getTransactions, getBudgetsWithUsage, getCategories, seedDefaultCategories } from '@/lib/queries'
```
변경:
```typescript
import { getMonthlySummary, getTransactions, getBudgetsWithUsage, getCategories, seedDefaultCategories, getFixedItemsSummary } from '@/lib/queries'
import FixedItemsSummaryCard from '@/components/dashboard/FixedItemsSummaryCard'
```

- [ ] **Step 2: state 추가 (`summary` 선언 바로 아래)**

```typescript
const [fixedSummary, setFixedSummary] = useState({ total: 0, activeCount: 0 })
```

- [ ] **Step 3: `load` 함수의 `Promise.all` 수정**

기존:
```typescript
const [sum, bdg, txns] = await Promise.all([
  getMonthlySummary(familyId, current),
  getBudgetsWithUsage(familyId, current),
  getTransactions(familyId, current),
])
setSummary(sum)
setBudgets(bdg)
setRecentTxns(txns)
```
변경:
```typescript
const [sum, bdg, txns, fixedSum] = await Promise.all([
  getMonthlySummary(familyId, current),
  getBudgetsWithUsage(familyId, current),
  getTransactions(familyId, current),
  getFixedItemsSummary(familyId),
])
setSummary(sum)
setBudgets(bdg)
setRecentTxns(txns)
setFixedSummary(fixedSum)
```

- [ ] **Step 4: JSX에 FixedItemsSummaryCard 추가**

`<SummaryCards .../>` 바로 아래에 추가:
```tsx
<FixedItemsSummaryCard
  familyId={familyId}
  total={fixedSummary.total}
  activeCount={fixedSummary.activeCount}
/>
```

- [ ] **Step 5: 커밋**

```bash
git add app/[familyId]/page.tsx
git commit -m "feat: 대시보드에 고정비 요약 카드 통합"
```

---

### Task 8: 전체 테스트 및 수동 확인

- [ ] **Step 1: 전체 테스트 실행**

```bash
cd /Users/kangshinil/dev/family-budget/.worktrees/feat-app
npx jest --no-coverage
```

Expected: 모든 테스트 PASS (기존 테스트 포함)

- [ ] **Step 2: 개발 서버 실행**

```bash
npm run dev
```

- [ ] **Step 3: 수동 확인 체크리스트**

1. 홈 화면 → "이번달 고정비" 카드 표시 (항목 0개, 0원)
2. 카드 탭 → `/fixed-items` 이동, 탭 필터(전체·구독/서비스 등) 표시
3. FAB(+) → 추가 모달 오픈
4. 항목 이름·금액 입력 + 그룹 선택 + 납부일 선택 + 메모 입력 후 저장 → 목록에 반영
5. 항목 탭 → 수정 모달 (기존 값 채워짐), 수정 후 반영
6. 수정 모달 → 삭제 버튼 클릭 → 확인 다이얼로그 → 삭제 후 목록에서 제거
7. 활성 토글 OFF 저장 → 목록에 흐리게, 하단 합계에서 제외
8. 홈으로 돌아오면 고정비 카드 금액·개수 갱신됨
9. ← 뒤로 버튼 → 홈으로 이동
