# 가족 공유 가계부 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 URL 공유만으로 가족이 함께 쓰는 가계부 웹앱을 Next.js 15 + Supabase + Vercel로 구현한다.

**Architecture:** Next.js 15 App Router 풀스택 앱. `/[familyId]` 경로 아래 홈/내역/예산/통계 4개 페이지. Supabase PostgreSQL에 거래 내역(`transactions`), 카테고리(`categories`), 예산(`budgets`) 3개 테이블. 하단 탭 모바일 우선 레이아웃.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, Supabase JS v2, Recharts 2, nanoid, Jest, React Testing Library

---

## File Structure

```
family-budget/
├── app/
│   ├── globals.css
│   ├── layout.tsx                        # 루트 HTML 레이아웃
│   ├── page.tsx                          # familyId 생성 후 리다이렉트
│   └── [familyId]/
│       ├── layout.tsx                    # 하단 탭 네비게이션 포함 공유 레이아웃
│       ├── page.tsx                      # 대시보드 (홈)
│       ├── transactions/page.tsx         # 내역 페이지
│       ├── budgets/page.tsx              # 예산 페이지
│       └── stats/page.tsx               # 통계 페이지
├── components/
│   ├── layout/
│   │   ├── BottomNav.tsx                 # 하단 탭 네비게이션
│   │   └── MonthSelector.tsx            # 월 선택 헤더 컴포넌트
│   ├── ui/
│   │   ├── Modal.tsx                     # 공용 모달 래퍼
│   │   └── FAB.tsx                       # Floating Action Button
│   ├── dashboard/
│   │   ├── SummaryCards.tsx             # 수입/지출/잔액 카드
│   │   ├── BudgetOverview.tsx           # 예산 진행률 목록
│   │   └── RecentTransactions.tsx       # 최근 내역 5건
│   ├── transactions/
│   │   ├── TransactionList.tsx          # 거래 내역 목록
│   │   ├── TransactionItem.tsx          # 단일 내역 행
│   │   └── TransactionForm.tsx          # 추가/수정 폼 모달
│   ├── budgets/
│   │   ├── BudgetCard.tsx               # 카테고리별 예산 카드
│   │   └── BudgetForm.tsx               # 예산 금액 설정 모달
│   └── stats/
│       ├── MonthlyBarChart.tsx          # 월별 수입/지출 막대 그래프
│       └── CategoryPieChart.tsx         # 카테고리별 파이 차트
├── lib/
│   ├── supabase.ts                       # Supabase 클라이언트 싱글톤
│   ├── queries.ts                        # 모든 DB CRUD 쿼리 함수
│   └── utils.ts                          # formatAmount, formatDate 유틸
├── types/
│   └── index.ts                          # 공유 TypeScript 타입
├── supabase/
│   └── schema.sql                        # DB 스키마 + 기본 카테고리 시드
└── __tests__/
    ├── utils.test.ts                     # 유틸 함수 단위 테스트
    ├── SummaryCards.test.tsx             # 대시보드 컴포넌트 테스트
    ├── TransactionList.test.tsx          # 내역 목록 컴포넌트 테스트
    └── BudgetCard.test.tsx              # 예산 카드 컴포넌트 테스트
```

---

## Task 1: 프로젝트 초기화 및 의존성 설치

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `jest.config.ts`, `jest.setup.ts`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/kangshinil/dev
npx create-next-app@latest family-budget \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
cd family-budget
```

- [ ] **Step 2: 의존성 설치**

```bash
npm install @supabase/supabase-js nanoid recharts
npm install --save-dev jest @types/jest jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event ts-jest
```

- [ ] **Step 3: Jest 설정 파일 생성**

`jest.config.ts`:
```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

`jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Jest 설정 동작 확인**

```bash
npx jest --listTests
```

Expected: "No tests found" 또는 빈 목록 (아직 테스트 파일이 없으므로). 에러가 없으면 Jest 설정 성공.

- [ ] **Step 5: package.json에 test 스크립트 추가**

`package.json`의 `"scripts"` 섹션에:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 6: 기본 동작 확인**

```bash
npm run dev
```

`http://localhost:3000` 에서 Next.js 기본 페이지가 열리면 성공.

---

## Task 2: TypeScript 타입 정의

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: 타입 파일 작성**

`types/index.ts`:
```typescript
export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  family_id: string
  name: string
  color: string   // hex, 예: '#ef4444'
  icon: string    // emoji, 예: '🍽️'
  is_default: boolean
}

export interface Transaction {
  id: string
  family_id: string
  type: TransactionType
  amount: number          // 원 단위 정수
  category_id: string | null
  memo: string | null
  date: string            // 'YYYY-MM-DD'
  created_at: string
  category?: Category     // join 결과
}

export interface Budget {
  id: string
  family_id: string
  category_id: string
  amount: number
  year: number
  month: number           // 1-12
  category?: Category     // join 결과
}

export interface MonthYear {
  year: number
  month: number
}

export interface MonthlySummary {
  income: number
  expense: number
  balance: number
}

export interface BudgetWithUsage extends Budget {
  used: number            // 해당 월 실제 지출액
  category: Category
}
```

- [ ] **Step 2: 타입 임포트 동작 확인**

```bash
npx tsc --noEmit
```

Expected: 오류 없이 종료.

---

## Task 3: Supabase 스키마 작성

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: SQL 스키마 파일 작성**

`supabase/schema.sql`:
```sql
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
CREATE INDEX idx_categories_family ON categories (family_id);
CREATE INDEX idx_budgets_family_ym ON budgets (family_id, year, month);
```

- [ ] **Step 2: Supabase 프로젝트 생성 (수동)**

1. https://supabase.com 접속 → New project 생성
2. Project name: `family-budget`, 비밀번호 기록해 둘 것
3. Region: Northeast Asia (Seoul)
4. 프로젝트 생성 완료 대기 (약 1분)
5. Settings → API → `Project URL`과 `anon public key` 복사

- [ ] **Step 3: 스키마 적용**

Supabase 대시보드 → SQL Editor → New query → `supabase/schema.sql` 내용 붙여넣기 → Run.

테이블 3개(`categories`, `transactions`, `budgets`)가 생성되었는지 Table Editor에서 확인.

---

## Task 4: 환경변수 및 Supabase 클라이언트

**Files:**
- Create: `.env.local`, `lib/supabase.ts`

- [ ] **Step 1: .env.local 생성**

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Task 3 Step 2에서 복사한 값으로 교체.

- [ ] **Step 2: .gitignore에 .env.local 추가 확인**

```bash
grep ".env.local" .gitignore
```

없으면 추가:
```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 3: Supabase 클라이언트 작성**

`lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 4: 연결 확인**

```bash
node -e "
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
client.from('categories').select('count').then(r => console.log('연결 성공:', JSON.stringify(r)))
"
```

Expected: `연결 성공: {"data":[{"count":0}],"error":null}` 또는 유사한 결과.

- [ ] **Step 5: 커밋**

```bash
git add lib/supabase.ts supabase/schema.sql types/index.ts jest.config.ts jest.setup.ts .gitignore
git commit -m "chore: 프로젝트 설정, 타입, Supabase 클라이언트 초기화"
```

---

## Task 5: 유틸 함수 (TDD)

**Files:**
- Create: `lib/utils.ts`, `__tests__/utils.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`__tests__/utils.test.ts`:
```typescript
import { formatAmount, formatDate, getMonthRange, addMonths } from '@/lib/utils'

describe('formatAmount', () => {
  it('양수를 원화 형식으로 포매팅한다', () => {
    expect(formatAmount(1234567)).toBe('1,234,567')
  })
  it('0을 포매팅한다', () => {
    expect(formatAmount(0)).toBe('0')
  })
})

describe('formatDate', () => {
  it('YYYY-MM-DD를 M월 D일 형식으로 변환한다', () => {
    expect(formatDate('2026-04-27')).toBe('4월 27일')
  })
})

describe('getMonthRange', () => {
  it('해당 월의 시작일과 종료일을 반환한다', () => {
    expect(getMonthRange(2026, 4)).toEqual({ start: '2026-04-01', end: '2026-04-30' })
  })
  it('2월 윤년을 처리한다', () => {
    expect(getMonthRange(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' })
  })
})

describe('addMonths', () => {
  it('월을 더한다', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
  })
  it('월을 뺀다', () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/utils.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/utils'`

- [ ] **Step 3: 유틸 함수 구현**

`lib/utils.ts`:
```typescript
import type { MonthYear } from '@/types'

export function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR')
}

export function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${parseInt(month)}월 ${parseInt(day)}일`
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function addMonths(my: MonthYear, delta: number): MonthYear {
  const date = new Date(my.year, my.month - 1 + delta)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function formatMonthYear(my: MonthYear): string {
  return `${my.year}년 ${my.month}월`
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/utils.test.ts
```

Expected: PASS — 6개 테스트 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add lib/utils.ts __tests__/utils.test.ts
git commit -m "feat: 유틸 함수 구현 (formatAmount, formatDate, getMonthRange, addMonths)"
```

---

## Task 6: DB 쿼리 함수

**Files:**
- Create: `lib/queries.ts`

- [ ] **Step 1: 쿼리 파일 작성**

`lib/queries.ts`:
```typescript
import { supabase } from '@/lib/supabase'
import type { Transaction, Category, Budget, MonthYear, BudgetWithUsage } from '@/types'
import { getMonthRange } from '@/lib/utils'

// ─── 카테고리 ───────────────────────────────────────────────

export async function getCategories(familyId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('family_id', familyId)
    .order('name')
  if (error) throw error
  return data
}

export async function createCategory(
  familyId: string,
  input: Pick<Category, 'name' | 'color' | 'icon'>
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ family_id: familyId, ...input })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function seedDefaultCategories(familyId: string): Promise<void> {
  const defaults = [
    { name: '식비', color: '#ef4444', icon: '🍽️' },
    { name: '교통', color: '#f97316', icon: '🚌' },
    { name: '의료', color: '#ec4899', icon: '💊' },
    { name: '교육', color: '#8b5cf6', icon: '📚' },
    { name: '쇼핑', color: '#06b6d4', icon: '🛒' },
    { name: '저축', color: '#10b981', icon: '💰' },
    { name: '기타', color: '#6b7280', icon: '📌' },
  ]
  const rows = defaults.map(d => ({ family_id: familyId, is_default: true, ...d }))
  const { error } = await supabase.from('categories').insert(rows)
  if (error) throw error
}

// ─── 거래 내역 ──────────────────────────────────────────────

export async function getTransactions(
  familyId: string,
  my: MonthYear
): Promise<Transaction[]> {
  const { start, end } = getMonthRange(my.year, my.month)
  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .eq('family_id', familyId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function createTransaction(
  familyId: string,
  input: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ family_id: familyId, ...input })
    .select('*, category:categories(*)')
    .single()
  if (error) throw error
  return data
}

export async function updateTransaction(
  id: string,
  input: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(input)
    .eq('id', id)
    .select('*, category:categories(*)')
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

// ─── 예산 ───────────────────────────────────────────────────

export async function getBudgetsWithUsage(
  familyId: string,
  my: MonthYear
): Promise<BudgetWithUsage[]> {
  const { start, end } = getMonthRange(my.year, my.month)

  const [{ data: budgets, error: bErr }, { data: txns, error: tErr }] = await Promise.all([
    supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .eq('family_id', familyId)
      .eq('year', my.year)
      .eq('month', my.month),
    supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('family_id', familyId)
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end),
  ])
  if (bErr) throw bErr
  if (tErr) throw tErr

  const usageMap = new Map<string, number>()
  for (const t of txns ?? []) {
    if (t.category_id) {
      usageMap.set(t.category_id, (usageMap.get(t.category_id) ?? 0) + t.amount)
    }
  }

  return (budgets ?? []).map(b => ({
    ...b,
    used: usageMap.get(b.category_id) ?? 0,
  }))
}

export async function upsertBudget(
  familyId: string,
  categoryId: string,
  my: MonthYear,
  amount: number
): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      { family_id: familyId, category_id: categoryId, year: my.year, month: my.month, amount },
      { onConflict: 'family_id,category_id,year,month' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── 대시보드 요약 ───────────────────────────────────────────

export async function getMonthlySummary(
  familyId: string,
  my: MonthYear
): Promise<{ income: number; expense: number }> {
  const { start, end } = getMonthRange(my.year, my.month)
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('family_id', familyId)
    .gte('date', start)
    .lte('date', end)
  if (error) throw error

  return (data ?? []).reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount
      else acc.expense += t.amount
      return acc
    },
    { income: 0, expense: 0 }
  )
}

// ─── 통계 ────────────────────────────────────────────────────

export async function getMonthlyStats(
  familyId: string,
  months: MonthYear[]
): Promise<Array<MonthYear & { income: number; expense: number }>> {
  const results = await Promise.all(
    months.map(async my => {
      const summary = await getMonthlySummary(familyId, my)
      return { ...my, ...summary }
    })
  )
  return results
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 오류 없이 종료.

- [ ] **Step 3: 커밋**

```bash
git add lib/queries.ts
git commit -m "feat: Supabase DB 쿼리 함수 구현 (transactions, categories, budgets)"
```

---

## Task 7: Family ID 라우팅

**Files:**
- Modify: `app/page.tsx`
- Create: `app/[familyId]/layout.tsx`

- [ ] **Step 1: 홈 페이지 — familyId 생성 및 리다이렉트**

`app/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { nanoid } from 'nanoid'

export default function Home() {
  // 서버 컴포넌트에서는 localStorage 접근 불가
  // 클라이언트 컴포넌트로 분리
  const familyId = nanoid(12)
  redirect(`/${familyId}`)
}
```

**참고:** nanoid를 서버 컴포넌트에서 사용하면 매 요청마다 새 ID가 생성된다. 실제 동작은 클라이언트에서 localStorage를 확인하여 기존 ID를 재사용해야 한다. 아래처럼 클라이언트 컴포넌트로 분리한다.

`app/page.tsx` (최종):
```typescript
import FamilyRedirect from '@/components/FamilyRedirect'

export default function Home() {
  return <FamilyRedirect />
}
```

`components/FamilyRedirect.tsx`:
```typescript
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'

export default function FamilyRedirect() {
  const router = useRouter()

  useEffect(() => {
    let familyId = localStorage.getItem('familyId')
    if (!familyId) {
      familyId = nanoid(12)
      localStorage.setItem('familyId', familyId)
    }
    router.replace(`/${familyId}`)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">로딩 중...</p>
    </div>
  )
}
```

- [ ] **Step 2: [familyId] 레이아웃 생성**

`app/[familyId]/layout.tsx`:
```typescript
import type { ReactNode } from 'react'
import BottomNav from '@/components/layout/BottomNav'
import MonthSelector from '@/components/layout/MonthSelector'

interface Props {
  children: ReactNode
  params: Promise<{ familyId: string }>
}

export default async function FamilyLayout({ children, params }: Props) {
  const { familyId } = await params
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <MonthSelector />
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav familyId={familyId} />
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/page.tsx app/[familyId]/layout.tsx components/FamilyRedirect.tsx
git commit -m "feat: familyId 기반 라우팅 및 공유 레이아웃 구조 추가"
```

---

## Task 8: 공통 UI 컴포넌트

**Files:**
- Create: `components/layout/BottomNav.tsx`, `components/layout/MonthSelector.tsx`
- Create: `components/ui/Modal.tsx`, `components/ui/FAB.tsx`

- [ ] **Step 1: BottomNav 구현**

`components/layout/BottomNav.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  familyId: string
}

const tabs = [
  { href: '', label: '홈', icon: '🏠' },
  { href: '/transactions', label: '내역', icon: '📋' },
  { href: '/budgets', label: '예산', icon: '🎯' },
  { href: '/stats', label: '통계', icon: '📈' },
]

export default function BottomNav({ familyId }: Props) {
  const pathname = usePathname()
  const base = `/${familyId}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {tabs.map(tab => {
        const href = `${base}${tab.href}`
        const isActive = tab.href === ''
          ? pathname === base
          : pathname.startsWith(`${base}${tab.href}`)
        return (
          <Link
            key={tab.href}
            href={href}
            className={`flex-1 flex flex-col items-center py-2 text-xs gap-1 ${
              isActive ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: MonthSelector 구현**

`components/layout/MonthSelector.tsx`:
```typescript
'use client'
import { useMonthStore } from '@/lib/monthStore'
import { addMonths, formatMonthYear } from '@/lib/utils'

export default function MonthSelector() {
  const { current, setCurrent } = useMonthStore()

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3 flex items-center justify-between">
      <button
        onClick={() => setCurrent(addMonths(current, -1))}
        className="p-2 rounded-full hover:bg-gray-100"
        aria-label="이전 달"
      >
        ‹
      </button>
      <span className="font-semibold text-gray-800">{formatMonthYear(current)}</span>
      <button
        onClick={() => setCurrent(addMonths(current, 1))}
        className="p-2 rounded-full hover:bg-gray-100"
        aria-label="다음 달"
      >
        ›
      </button>
    </header>
  )
}
```

- [ ] **Step 3: monthStore 생성 (Zustand 없이 Context로 구현)**

`lib/monthStore.ts`:
```typescript
'use client'
import { create } from 'zustand'
import type { MonthYear } from '@/types'

interface MonthStore {
  current: MonthYear
  setCurrent: (my: MonthYear) => void
}

const now = new Date()

export const useMonthStore = create<MonthStore>(set => ({
  current: { year: now.getFullYear(), month: now.getMonth() + 1 },
  setCurrent: (current) => set({ current }),
}))
```

- [ ] **Step 4: Zustand 설치**

```bash
npm install zustand
```

- [ ] **Step 5: Modal 구현**

`components/ui/Modal.tsx`:
```typescript
'use client'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: Props) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: FAB 구현**

`components/ui/FAB.tsx`:
```typescript
interface Props {
  onClick: () => void
  label?: string
}

export default function FAB({ onClick, label = '+' }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-indigo-700 active:scale-95 transition-transform z-40"
      aria-label="추가"
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 7: 개발 서버에서 동작 확인**

```bash
npm run dev
```

`http://localhost:3000` → `http://localhost:3000/<familyId>` 로 리다이렉트되고 하단 탭이 보이면 성공.

- [ ] **Step 8: 커밋**

```bash
git add components/ lib/monthStore.ts
git commit -m "feat: 하단 탭 네비게이션, 월 선택기, Modal, FAB 공통 컴포넌트 구현"
```

---

## Task 9: 카테고리 초기화 및 내역 페이지

**Files:**
- Create: `app/[familyId]/transactions/page.tsx`
- Create: `components/transactions/TransactionList.tsx`, `TransactionItem.tsx`, `TransactionForm.tsx`

- [ ] **Step 1: TransactionItem 구현**

`components/transactions/TransactionItem.tsx`:
```typescript
import type { Transaction } from '@/types'
import { formatAmount, formatDate } from '@/lib/utils'

interface Props {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionItem({ transaction: t, onEdit, onDelete }: Props) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 active:bg-gray-50"
      onClick={() => onEdit(t)}
    >
      <span className="text-2xl">{t.category?.icon ?? '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{t.category?.name ?? '미분류'}</p>
        {t.memo && <p className="text-sm text-gray-500 truncate">{t.memo}</p>}
        <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
          {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}원
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(t.id) }}
        className="text-gray-300 hover:text-red-400 px-2 py-1"
        aria-label="삭제"
      >
        ×
      </button>
    </div>
  )
}
```

- [ ] **Step 2: TransactionForm 구현**

`components/transactions/TransactionForm.tsx`:
```typescript
'use client'
import { useState } from 'react'
import type { Transaction, Category } from '@/types'

interface Props {
  categories: Category[]
  initial?: Transaction | null
  onSubmit: (data: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>) => Promise<void>
  onCancel: () => void
}

export default function TransactionForm({ categories, initial, onSubmit, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [type, setType] = useState<'income' | 'expense'>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [date, setDate] = useState(initial?.date ?? today)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(amount.replace(/,/g, ''))
    if (isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    await onSubmit({
      type,
      amount: parsed,
      category_id: categoryId || null,
      memo: memo || null,
      date,
    })
    setLoading(false)
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
        maxLength={100}
      />
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

- [ ] **Step 3: TransactionList + 내역 페이지 구현**

`components/transactions/TransactionList.tsx`:
```typescript
import type { Transaction, Category } from '@/types'
import TransactionItem from './TransactionItem'

interface Props {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function TransactionList({ transactions, onEdit, onDelete }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-2">📭</p>
        <p>내역이 없습니다</p>
      </div>
    )
  }
  return (
    <div>
      {transactions.map(t => (
        <TransactionItem key={t.id} transaction={t} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
```

`app/[familyId]/transactions/page.tsx`:
```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories, seedDefaultCategories } from '@/lib/queries'
import type { Transaction, Category } from '@/types'
import TransactionList from '@/components/transactions/TransactionList'
import TransactionForm from '@/components/transactions/TransactionForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function TransactionsPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const load = useCallback(async () => {
    const [txns, cats] = await Promise.all([
      getTransactions(familyId, current),
      getCategories(familyId),
    ])
    if (cats.length === 0) {
      await seedDefaultCategories(familyId)
      setCategories(await getCategories(familyId))
    } else {
      setCategories(cats)
    }
    setTransactions(txns)
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>) {
    if (editing) {
      await updateTransaction(editing.id, data)
    } else {
      await createTransaction(familyId, data)
    }
    setIsFormOpen(false)
    setEditing(null)
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await deleteTransaction(id)
    await load()
  }

  function openAdd() { setEditing(null); setIsFormOpen(true) }
  function openEdit(t: Transaction) { setEditing(t); setIsFormOpen(true) }

  return (
    <>
      <TransactionList
        transactions={transactions}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      <FAB onClick={openAdd} />
      <Modal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditing(null) }}
        title={editing ? '내역 수정' : '내역 추가'}
      >
        <TransactionForm
          categories={categories}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setIsFormOpen(false); setEditing(null) }}
        />
      </Modal>
    </>
  )
}
```

- [ ] **Step 4: 내역 페이지 동작 확인**

```bash
npm run dev
```

`http://localhost:3000/<familyId>/transactions` → 내역 목록과 + 버튼이 보이고, 클릭하면 폼 모달이 열리면 성공.

내역을 추가하고 Supabase 대시보드 → Table Editor → transactions에 데이터가 저장되었는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add app/[familyId]/transactions/ components/transactions/
git commit -m "feat: 거래 내역 페이지 구현 (목록, 추가, 수정, 삭제)"
```

---

## Task 10: 예산 페이지

**Files:**
- Create: `app/[familyId]/budgets/page.tsx`
- Create: `components/budgets/BudgetCard.tsx`, `BudgetForm.tsx`
- Create: `__tests__/BudgetCard.test.tsx`

- [ ] **Step 1: BudgetCard 테스트 작성**

`__tests__/BudgetCard.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import BudgetCard from '@/components/budgets/BudgetCard'
import type { BudgetWithUsage } from '@/types'

const mockBudget: BudgetWithUsage = {
  id: '1',
  family_id: 'fam1',
  category_id: 'cat1',
  amount: 300000,
  year: 2026,
  month: 4,
  used: 150000,
  category: { id: 'cat1', family_id: 'fam1', name: '식비', color: '#ef4444', icon: '🍽️', is_default: true },
}

describe('BudgetCard', () => {
  it('카테고리명과 예산 금액을 렌더링한다', () => {
    render(<BudgetCard budget={mockBudget} onEdit={jest.fn()} />)
    expect(screen.getByText('식비')).toBeInTheDocument()
    expect(screen.getByText(/300,000/)).toBeInTheDocument()
  })

  it('사용 금액과 진행률을 표시한다', () => {
    render(<BudgetCard budget={mockBudget} onEdit={jest.fn()} />)
    expect(screen.getByText(/150,000/)).toBeInTheDocument()
  })

  it('예산 초과 시 빨간색 진행 바를 표시한다', () => {
    const over = { ...mockBudget, used: 350000 }
    render(<BudgetCard budget={over} onEdit={jest.fn()} />)
    const bar = document.querySelector('.bg-red-500')
    expect(bar).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/BudgetCard.test.tsx
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: BudgetCard 구현**

`components/budgets/BudgetCard.tsx`:
```typescript
import type { BudgetWithUsage } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  budget: BudgetWithUsage
  onEdit: (b: BudgetWithUsage) => void
}

export default function BudgetCard({ budget, onEdit }: Props) {
  const pct = Math.min((budget.used / budget.amount) * 100, 100)
  const isOver = budget.used > budget.amount

  return (
    <div
      className="bg-white rounded-xl p-4 shadow-sm mb-3 active:bg-gray-50"
      onClick={() => onEdit(budget)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{budget.category.icon}</span>
        <span className="font-medium text-gray-800">{budget.category.name}</span>
        <span className={`ml-auto text-sm font-semibold ${isOver ? 'text-red-500' : 'text-gray-600'}`}>
          {formatAmount(budget.used)} / {formatAmount(budget.amount)}원
        </span>
      </div>
      <div className="bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isOver && (
        <p className="text-xs text-red-500 mt-1">
          예산 초과 ({formatAmount(budget.used - budget.amount)}원)
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/BudgetCard.test.tsx
```

Expected: PASS — 3개 테스트 통과.

- [ ] **Step 5: BudgetForm 구현**

`components/budgets/BudgetForm.tsx`:
```typescript
'use client'
import { useState } from 'react'

interface Props {
  categoryName: string
  categoryIcon: string
  currentAmount: number
  onSubmit: (amount: number) => Promise<void>
  onCancel: () => void
}

export default function BudgetForm({ categoryName, categoryIcon, currentAmount, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(currentAmount > 0 ? String(currentAmount) : '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(amount.replace(/,/g, ''))
    if (isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    await onSubmit(parsed)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="text-center">
        <span className="text-3xl">{categoryIcon}</span>
        <p className="text-gray-600 mt-1">{categoryName} 예산</p>
      </div>
      <input
        type="number"
        placeholder="예산 금액 (원)"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-center text-lg"
        required
        min={1}
        autoFocus
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 border border-gray-300 rounded-lg">취소</button>
        <button type="submit" disabled={loading} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
          {loading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 6: 예산 페이지 구현**

`app/[familyId]/budgets/page.tsx`:
```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getBudgetsWithUsage, upsertBudget, getCategories, seedDefaultCategories } from '@/lib/queries'
import type { BudgetWithUsage, Category } from '@/types'
import BudgetCard from '@/components/budgets/BudgetCard'
import BudgetForm from '@/components/budgets/BudgetForm'
import Modal from '@/components/ui/Modal'

export default function BudgetsPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<BudgetWithUsage | null>(null)

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

  // 예산이 없는 카테고리도 표시
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

  return (
    <div className="p-4">
      {allItems.map(item => (
        <BudgetCard key={item.category_id} budget={item} onEdit={setEditing} />
      ))}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="예산 설정"
      >
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

- [ ] **Step 7: 예산 페이지 동작 확인**

`http://localhost:3000/<familyId>/budgets` 에서 카테고리 목록이 보이고, 탭하면 예산 금액 설정 모달이 열리는지 확인.

- [ ] **Step 8: 커밋**

```bash
git add app/[familyId]/budgets/ components/budgets/ __tests__/BudgetCard.test.tsx
git commit -m "feat: 예산 설정 페이지 구현 (BudgetCard, BudgetForm)"
```

---

## Task 11: 대시보드 (홈)

**Files:**
- Create: `app/[familyId]/page.tsx`
- Create: `components/dashboard/SummaryCards.tsx`, `BudgetOverview.tsx`, `RecentTransactions.tsx`
- Create: `__tests__/SummaryCards.test.tsx`

- [ ] **Step 1: SummaryCards 테스트 작성**

`__tests__/SummaryCards.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import SummaryCards from '@/components/dashboard/SummaryCards'

describe('SummaryCards', () => {
  it('수입, 지출, 잔액을 표시한다', () => {
    render(<SummaryCards income={3200000} expense={1850000} />)
    expect(screen.getByText(/3,200,000/)).toBeInTheDocument()
    expect(screen.getByText(/1,850,000/)).toBeInTheDocument()
    expect(screen.getByText(/1,350,000/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx jest __tests__/SummaryCards.test.tsx
```

Expected: FAIL

- [ ] **Step 3: SummaryCards 구현**

`components/dashboard/SummaryCards.tsx`:
```typescript
import { formatAmount } from '@/lib/utils'

interface Props {
  income: number
  expense: number
}

export default function SummaryCards({ income, expense }: Props) {
  const balance = income - expense
  return (
    <div className="bg-indigo-600 px-4 py-5 text-white">
      <div className="text-center mb-4">
        <p className="text-indigo-200 text-sm">이번 달 잔액</p>
        <p className="text-3xl font-bold">{formatAmount(balance)}원</p>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
          <p className="text-indigo-200 text-xs mb-1">수입</p>
          <p className="font-semibold text-green-300">+{formatAmount(income)}</p>
        </div>
        <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
          <p className="text-indigo-200 text-xs mb-1">지출</p>
          <p className="font-semibold text-red-300">-{formatAmount(expense)}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/SummaryCards.test.tsx
```

Expected: PASS

- [ ] **Step 5: BudgetOverview 구현**

`components/dashboard/BudgetOverview.tsx`:
```typescript
import type { BudgetWithUsage } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  budgets: BudgetWithUsage[]
}

export default function BudgetOverview({ budgets }: Props) {
  if (budgets.length === 0) return null
  const total = budgets.reduce((a, b) => a + b.amount, 0)
  const used = budgets.reduce((a, b) => a + b.used, 0)
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">이번 달 예산</span>
        <span className="text-gray-800 font-medium">{formatAmount(used)} / {formatAmount(total)}원</span>
      </div>
      <div className="bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: RecentTransactions 구현**

`components/dashboard/RecentTransactions.tsx`:
```typescript
import type { Transaction } from '@/types'
import { formatAmount, formatDate } from '@/lib/utils'

interface Props {
  transactions: Transaction[]
}

export default function RecentTransactions({ transactions }: Props) {
  return (
    <div className="px-4 py-3">
      <h2 className="text-sm font-semibold text-gray-500 mb-2">최근 내역</h2>
      {transactions.length === 0 ? (
        <p className="text-center text-gray-400 py-4 text-sm">내역이 없습니다</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {transactions.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <span className="text-xl">{t.category?.icon ?? '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.category?.name ?? '미분류'}</p>
                <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
              </div>
              <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: 대시보드 페이지 구현**

`app/[familyId]/page.tsx`:
```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getMonthlySummary, getTransactions, getBudgetsWithUsage, getCategories, seedDefaultCategories } from '@/lib/queries'
import type { BudgetWithUsage, Transaction } from '@/types'
import SummaryCards from '@/components/dashboard/SummaryCards'
import BudgetOverview from '@/components/dashboard/BudgetOverview'
import RecentTransactions from '@/components/dashboard/RecentTransactions'

export default function DashboardPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [summary, setSummary] = useState({ income: 0, expense: 0 })
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([])

  const load = useCallback(async () => {
    let cats = await getCategories(familyId)
    if (cats.length === 0) {
      await seedDefaultCategories(familyId)
    }
    const [sum, bdg, txns] = await Promise.all([
      getMonthlySummary(familyId, current),
      getBudgetsWithUsage(familyId, current),
      getTransactions(familyId, current),
    ])
    setSummary(sum)
    setBudgets(bdg)
    setRecentTxns(txns)
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <SummaryCards income={summary.income} expense={summary.expense} />
      <BudgetOverview budgets={budgets} />
      <RecentTransactions transactions={recentTxns} />
    </div>
  )
}
```

- [ ] **Step 8: 대시보드 동작 확인**

`http://localhost:3000/<familyId>` 에서 수입/지출/잔액 카드와 최근 내역이 보이면 성공.

- [ ] **Step 9: 커밋**

```bash
git add app/[familyId]/page.tsx components/dashboard/ __tests__/SummaryCards.test.tsx
git commit -m "feat: 대시보드 페이지 구현 (요약 카드, 예산 진행률, 최근 내역)"
```

---

## Task 12: 통계 페이지

**Files:**
- Create: `app/[familyId]/stats/page.tsx`
- Create: `components/stats/MonthlyBarChart.tsx`, `CategoryPieChart.tsx`

- [ ] **Step 1: MonthlyBarChart 구현**

`components/stats/MonthlyBarChart.tsx`:
```typescript
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { MonthYear } from '@/types'
import { formatAmount } from '@/lib/utils'

interface DataPoint extends MonthYear {
  income: number
  expense: number
}

interface Props {
  data: DataPoint[]
}

function formatYAxis(value: number) {
  if (value >= 10000) return `${Math.floor(value / 10000)}만`
  return String(value)
}

export default function MonthlyBarChart({ data }: Props) {
  const formatted = data.map(d => ({
    name: `${d.month}월`,
    수입: d.income,
    지출: d.expense,
  }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">월별 수입/지출</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} width={40} />
          <Tooltip formatter={(v: number) => `${formatAmount(v)}원`} />
          <Legend />
          <Bar dataKey="수입" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="지출" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: CategoryPieChart 구현**

`components/stats/CategoryPieChart.tsx`:
```typescript
'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { Transaction, Category } from '@/types'
import { formatAmount } from '@/lib/utils'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export default function CategoryPieChart({ transactions, categories }: Props) {
  const catMap = new Map(categories.map(c => [c.id, c]))
  const usageMap = new Map<string, number>()
  for (const t of transactions.filter(t => t.type === 'expense')) {
    if (t.category_id) {
      usageMap.set(t.category_id, (usageMap.get(t.category_id) ?? 0) + t.amount)
    }
  }
  const data = Array.from(usageMap.entries())
    .map(([id, amount]) => ({ id, amount, cat: catMap.get(id) }))
    .filter(d => d.cat)
    .sort((a, b) => b.amount - a.amount)

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm text-center text-gray-400 py-8">
        <p>지출 내역이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">카테고리별 지출</h3>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="id" cx="50%" cy="50%" outerRadius={70} label={false}>
            {data.map(d => (
              <Cell key={d.id} fill={d.cat!.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => `${formatAmount(v)}원`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-2">
        {data.map(d => (
          <div key={d.id} className="flex items-center gap-2 text-sm">
            <span>{d.cat!.icon}</span>
            <span className="text-gray-700">{d.cat!.name}</span>
            <span className="ml-auto font-medium text-gray-800">{formatAmount(d.amount)}원</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 통계 페이지 구현**

`app/[familyId]/stats/page.tsx`:
```typescript
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useMonthStore } from '@/lib/monthStore'
import { getMonthlyStats, getTransactions, getCategories } from '@/lib/queries'
import { addMonths } from '@/lib/utils'
import type { Transaction, Category, MonthYear } from '@/types'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import CategoryPieChart from '@/components/stats/CategoryPieChart'

interface MonthStat extends MonthYear { income: number; expense: number }

export default function StatsPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const { current } = useMonthStore()
  const [monthlyStats, setMonthlyStats] = useState<MonthStat[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const load = useCallback(async () => {
    const last6 = Array.from({ length: 6 }, (_, i) => addMonths(current, -(5 - i)))
    const [stats, txns, cats] = await Promise.all([
      getMonthlyStats(familyId, last6),
      getTransactions(familyId, current),
      getCategories(familyId),
    ])
    setMonthlyStats(stats)
    setTransactions(txns)
    setCategories(cats)
  }, [familyId, current])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4">
      <MonthlyBarChart data={monthlyStats} />
      <CategoryPieChart transactions={transactions} categories={categories} />
    </div>
  )
}
```

- [ ] **Step 4: 통계 페이지 동작 확인**

`http://localhost:3000/<familyId>/stats` 에서 막대 그래프와 파이 차트가 렌더링되면 성공.

- [ ] **Step 5: 전체 테스트 통과 확인**

```bash
npx jest
```

Expected: PASS — 모든 테스트 통과.

- [ ] **Step 6: 커밋**

```bash
git add app/[familyId]/stats/ components/stats/
git commit -m "feat: 통계 페이지 구현 (월별 막대 그래프, 카테고리별 파이 차트)"
```

---

## Task 13: Vercel 배포

**Files:**
- Create: `.env.example`

- [ ] **Step 1: .env.example 생성**

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 2: GitHub 저장소 생성 및 push**

```bash
# GitHub에서 새 레포 생성 후
git remote add origin https://github.com/<your-username>/family-budget.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Vercel 배포**

1. https://vercel.com → New Project
2. GitHub 레포 `family-budget` 선택 → Import
3. Environment Variables에 `.env.local`의 값 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your-anon-key`
4. Deploy 클릭

- [ ] **Step 4: 배포 확인**

배포된 URL (예: `https://family-budget-xxx.vercel.app`) 접속 → 자동으로 `/<familyId>` 로 이동하면 성공.

URL을 가족과 공유하여 동일한 `familyId` URL로 접속하면 같은 가계부를 볼 수 있음.

- [ ] **Step 5: 최종 커밋**

```bash
git add .env.example
git commit -m "chore: Vercel 배포 환경 설정 추가"
git push
```

---

## 완료 기준

- [ ] `http://localhost:3000` 접속 시 `/<familyId>` 로 리다이렉트
- [ ] 내역 추가/수정/삭제 후 Supabase DB에 저장 확인
- [ ] 예산 설정 후 대시보드에 진행률 반영 확인
- [ ] 통계 차트에 데이터 표시 확인
- [ ] 다른 기기에서 같은 URL 접속 시 동일 데이터 확인
- [ ] `npx jest` 전체 통과
- [ ] Vercel 배포 URL 동작 확인
