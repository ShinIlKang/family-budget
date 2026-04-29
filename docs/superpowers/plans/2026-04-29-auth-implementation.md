# 회원가입/로그인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NextAuth.js Credentials provider 기반 username/password 인증 시스템 구축 — master/일반유저 역할, 초대 코드, 온보딩 게이트

**Architecture:** NextAuth.js v5 (beta) Credentials provider로 username+bcrypt 인증 처리. JWT 세션에 id/role/isMaster 저장. family_id 개념 완전 제거 (단일 가족 전용 배포). Supabase는 DB로만 사용. 라우트를 app/[familyId]/ → app/(app)/로 재구성.

**Tech Stack:** next-auth@beta, bcryptjs, @types/bcryptjs, Next.js App Router middleware, Supabase anon client

---

## File Map

**신규:**
- `auth.ts` — NextAuth 설정
- `types/next-auth.d.ts` — Session 타입 확장
- `middleware.ts` — 인증/라우팅 보호
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/signup/route.ts`
- `app/api/auth/find-id/route.ts`
- `app/api/invite-codes/route.ts`
- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/find-id/page.tsx`
- `app/pending/page.tsx`
- `app/onboarding/page.tsx`
- `app/(app)/profile/page.tsx`
- `supabase/schema-v2.sql`

**이동:**
- `app/[familyId]/(app)/layout.tsx` → `app/(app)/layout.tsx`
- `app/[familyId]/(app)/page.tsx` → `app/(app)/page.tsx`
- `app/[familyId]/(app)/transactions/page.tsx` → `app/(app)/transactions/page.tsx`
- `app/[familyId]/(app)/budgets/page.tsx` → `app/(app)/budgets/page.tsx`
- `app/[familyId]/(app)/assets/page.tsx` → `app/(app)/assets/page.tsx`
- `app/[familyId]/(app)/fixed-items/page.tsx` → `app/(app)/fixed-items/page.tsx`
- `app/[familyId]/(app)/stats/page.tsx` → `app/(app)/stats/page.tsx`

**수정:** `types/index.ts`, `lib/queries.ts`, `app/page.tsx`, `components/layout/BottomNav.tsx`, `components/onboarding/OnboardingWizard.tsx`, `components/onboarding/Step1Assets.tsx`, `components/onboarding/Step2FixedItems.tsx`, `components/onboarding/Step3LinkAssets.tsx`, `components/onboarding/Step4Budgets.tsx`, `app/(app)/page.tsx`, `app/(app)/transactions/page.tsx`, `app/(app)/budgets/page.tsx`, `app/(app)/assets/page.tsx`, `app/(app)/fixed-items/page.tsx`, `app/(app)/stats/page.tsx`

**삭제:** `app/[familyId]/` 전체, `components/FamilyRedirect.tsx`

---

### Task 1: 패키지 설치 및 환경 변수 설정

**Files:**
- Modify: `package.json`
- Create: `.env.local` (이미 있으면 추가)

- [ ] **Step 1: 패키지 설치**

```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: .env.local에 NEXTAUTH_SECRET 추가**

```bash
# 랜덤 시크릿 생성 후 .env.local에 추가
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
```

- [ ] **Step 3: 설치 확인**

```bash
node -e "require('bcryptjs'); console.log('bcryptjs ok')"
```

Expected: `bcryptjs ok`

- [ ] **Step 4: 커밋**

```bash
git add package.json package-lock.json .env.local
git commit -m "chore: next-auth, bcryptjs 패키지 추가"
```

---

### Task 2: Supabase 스키마 재구성

**Files:**
- Create: `supabase/schema-v2.sql`

이 작업은 Supabase 대시보드 SQL Editor에서 직접 실행한다. 기존 테이블을 모두 드롭하고 새 스키마로 재생성한다.

- [ ] **Step 1: schema-v2.sql 작성**

```sql
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
```

- [ ] **Step 2: Supabase 대시보드에서 실행**

Supabase 프로젝트 → SQL Editor → 위 SQL 전체 붙여넣기 → Run

- [ ] **Step 3: master 계정 시드 스크립트 작성 및 실행**

```bash
node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('qwer1234!', 10).then(hash => {
  console.log(\`INSERT INTO members (username, password_hash, name, role, is_master)
VALUES ('master', '\${hash}', '관리자', '관리자', true);\`);
});
"
```

출력된 INSERT 문을 Supabase SQL Editor에서 실행한다.

- [ ] **Step 4: 커밋**

```bash
git add supabase/schema-v2.sql
git commit -m "chore: Supabase 스키마 v2 (family_id 제거, members/settings/invite_codes 추가)"
```

---

### Task 3: 타입 정의 업데이트

**Files:**
- Modify: `types/index.ts`
- Create: `types/next-auth.d.ts`

- [ ] **Step 1: `types/index.ts` 전체 교체**

```ts
export type TransactionType = 'income' | 'expense'

export interface Member {
  id: string
  username: string
  name: string
  phone: string | null
  role: string
  is_master: boolean
  created_at: string
}

export interface Settings {
  id: string
  onboarding_completed: boolean
  updated_by: string | null
  updated_at: string
}

export interface InviteCode {
  code: string
  created_by: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  is_default: boolean
  created_by: string
  updated_by: string | null
  created_at: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category_id: string | null
  memo: string | null
  date: string
  created_by: string
  updated_by: string | null
  created_at: string
  category?: Category
}

export interface Budget {
  id: string
  category_id: string
  amount: number
  year: number
  month: number
  created_by: string
  updated_by: string | null
  category?: Category
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
  used: number
  category: Category
}

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

export type PaymentMethod = '자동이체' | '신용카드' | '체크카드' | '현금' | '기타'

export const PAYMENT_METHODS: PaymentMethod[] = [
  '자동이체', '신용카드', '체크카드', '현금', '기타',
]

export interface FixedItem {
  id: string
  name: string
  amount: number
  group_name: FixedItemGroup
  billing_day: number | null
  payment_method: PaymentMethod | null
  memo: string | null
  is_active: boolean
  created_by: string
  updated_by: string | null
  created_at: string
}

export type AssetCategory = '금융' | '투자' | '보증금'
export const ASSET_CATEGORIES: AssetCategory[] = ['금융', '투자', '보증금']

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  initial_balance: number
  linked_fixed_item_id: string | null
  created_by: string
  updated_by: string | null
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
  created_by: string
  created_at: string
}
```

- [ ] **Step 2: `types/next-auth.d.ts` 생성**

```ts
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      role: string
      isMaster: boolean
    } & DefaultSession['user']
  }

  interface User {
    id: string
    username: string
    role: string
    isMaster: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    role: string
    isMaster: boolean
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add types/index.ts types/next-auth.d.ts
git commit -m "refactor: family_id 제거, Member/Settings/InviteCode 타입 추가"
```

---

### Task 4: NextAuth 설정

**Files:**
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: `auth.ts` 생성**

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username as string
        const password = credentials?.password as string
        if (!username || !password) return null

        const { data: member, error } = await supabase
          .from('members')
          .select('id, username, password_hash, name, role, is_master')
          .eq('username', username)
          .single()

        if (error || !member) return null
        const valid = await bcrypt.compare(password, member.password_hash)
        if (!valid) return null

        return {
          id: member.id,
          name: member.name,
          username: member.username,
          role: member.role,
          isMaster: member.is_master,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as { username: string }).username
        token.role = (user as { role: string }).role
        token.isMaster = (user as { isMaster: boolean }).isMaster
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.username = token.username
      session.user.role = token.role
      session.user.isMaster = token.isMaster
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
```

- [ ] **Step 2: `app/api/auth/[...nextauth]/route.ts` 생성**

```ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 3: `app/layout.tsx`에 SessionProvider 추가**

`app/layout.tsx`를 읽고 다음과 같이 수정한다:

```tsx
import type { ReactNode } from 'react'
import { SessionProvider } from 'next-auth/react'
import './globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: TypeScript 빌드 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: auth.ts 관련 에러 없음 (types 경로 에러는 Task 8까지 계속될 수 있음)

- [ ] **Step 5: 커밋**

```bash
git add auth.ts app/api/auth app/layout.tsx
git commit -m "feat: NextAuth Credentials provider 설정"
```

---

### Task 5: Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: `middleware.ts` 생성**

```ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/find-id']

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // 비로그인 → 공개 경로 허용, 나머지는 로그인으로
  if (!session) {
    if (isPublic) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 로그인 상태에서 공개 경로 → 홈으로
  if (isPublic) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: 커밋**

```bash
git add middleware.ts
git commit -m "feat: NextAuth 기반 middleware 인증 보호"
```

---

### Task 6: API 라우트 (회원가입, 아이디찾기, 초대코드)

**Files:**
- Create: `app/api/auth/signup/route.ts`
- Create: `app/api/auth/find-id/route.ts`
- Create: `app/api/invite-codes/route.ts`

- [ ] **Step 1: `app/api/auth/signup/route.ts` 생성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { username, password, name, phone, role, inviteCode } = await req.json()

  if (!username || !password || !name || !role || !inviteCode) {
    return NextResponse.json({ error: '필수 항목을 모두 입력해 주세요.' }, { status: 400 })
  }

  // 온보딩 완료 확인
  const { data: settings } = await supabase
    .from('settings')
    .select('onboarding_completed')
    .single()
  if (!settings?.onboarding_completed) {
    return NextResponse.json({ error: '아직 초기 설정이 완료되지 않았습니다.' }, { status: 403 })
  }

  // 초대 코드 확인
  const { data: code } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', inviteCode)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()
  if (!code) {
    return NextResponse.json({ error: '유효하지 않은 초대 코드입니다.' }, { status: 400 })
  }

  // username 중복 확인
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('username', username)
    .single()
  if (existing) {
    return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { error: insertErr } = await supabase
    .from('members')
    .insert({ username, password_hash, name, phone: phone || null, role, is_master: false })
  if (insertErr) {
    return NextResponse.json({ error: '회원가입 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // 초대 코드 사용 처리
  await supabase
    .from('invite_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('code', inviteCode)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: `app/api/auth/find-id/route.ts` 생성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json()
  if (!name || !phone) {
    return NextResponse.json({ error: '이름과 전화번호를 입력해 주세요.' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('username')
    .eq('name', name)
    .eq('phone', phone)
    .single()

  if (!member) {
    return NextResponse.json({ error: '일치하는 계정을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ username: member.username })
}
```

- [ ] **Step 3: `app/api/invite-codes/route.ts` 생성**

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabase } from '@/lib/supabase'

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// GET: 초대 코드 목록 (master 전용)
export async function GET() {
  const session = await auth()
  if (!session?.user?.isMaster) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabase
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

// POST: 초대 코드 생성 (master 전용)
export async function POST() {
  const session = await auth()
  if (!session?.user?.isMaster) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('invite_codes')
    .insert({ code, created_by: session.user.id, expires_at: expiresAt })
    .select()
    .single()

  if (error) return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: 커밋**

```bash
git add app/api/auth/signup app/api/auth/find-id app/api/invite-codes
git commit -m "feat: 회원가입/아이디찾기/초대코드 API 라우트 추가"
```

---

### Task 7: lib/queries.ts 전면 업데이트

**Files:**
- Modify: `lib/queries.ts`

family_id 파라미터를 모두 제거하고, 생성/수정 함수에 `createdBy`/`updatedBy` 파라미터를 추가한다. 단일 가족이므로 조회 시 별도 필터 불필요.

- [ ] **Step 1: `lib/queries.ts` 전체 교체**

```ts
import { supabase } from '@/lib/supabase'
import type { Transaction, Category, Budget, MonthYear, BudgetWithUsage, FixedItem, Asset, AssetCategory, Settings } from '@/types'
import { getMonthRange } from '@/lib/utils'

// ─── 설정 ────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single()
  if (error) return null
  return data
}

export async function updateSettings(
  updatedBy: string,
  data: Partial<Pick<Settings, 'onboarding_completed'>>
): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({ ...data, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .neq('id', '00000000-0000-0000-0000-000000000000') // 전체 행 업데이트
  if (error) throw error
}

// ─── 카테고리 ───────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function seedDefaultCategories(createdBy: string): Promise<void> {
  const defaults = [
    { name: '식비', color: '#ef4444', icon: '🍽️' },
    { name: '교통', color: '#f97316', icon: '🚌' },
    { name: '의료', color: '#ec4899', icon: '💊' },
    { name: '교육', color: '#8b5cf6', icon: '📚' },
    { name: '쇼핑', color: '#06b6d4', icon: '🛒' },
    { name: '저축', color: '#10b981', icon: '💰' },
    { name: '기타', color: '#6b7280', icon: '📌' },
  ]
  const rows = defaults.map(d => ({ is_default: true, created_by: createdBy, ...d }))
  const { error } = await supabase.from('categories').insert(rows)
  if (error) throw error
}

// ─── 거래 내역 ──────────────────────────────────────────────

export async function getTransactions(my: MonthYear): Promise<Transaction[]> {
  const { start, end } = getMonthRange(my.year, my.month)
  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(*)')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function createTransaction(
  input: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>,
  createdBy: string
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...input, created_by: createdBy })
    .select('*, category:categories(*)')
    .single()
  if (error) throw error
  return data
}

export async function updateTransaction(
  id: string,
  input: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>,
  updatedBy: string
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update({ ...input, updated_by: updatedBy })
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

export async function getBudgetsWithUsage(my: MonthYear): Promise<BudgetWithUsage[]> {
  const { start, end } = getMonthRange(my.year, my.month)

  const [{ data: budgets, error: bErr }, { data: txns, error: tErr }] = await Promise.all([
    supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .eq('year', my.year)
      .eq('month', my.month),
    supabase
      .from('transactions')
      .select('category_id, amount')
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
  categoryId: string,
  my: MonthYear,
  amount: number,
  createdBy: string
): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      { category_id: categoryId, year: my.year, month: my.month, amount, created_by: createdBy },
      { onConflict: 'category_id,year,month' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── 대시보드 요약 ───────────────────────────────────────────

export async function getMonthlySummary(my: MonthYear): Promise<{ income: number; expense: number }> {
  const { start, end } = getMonthRange(my.year, my.month)
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
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
  months: MonthYear[]
): Promise<Array<MonthYear & { income: number; expense: number }>> {
  return Promise.all(
    months.map(async my => {
      const summary = await getMonthlySummary(my)
      return { ...my, ...summary }
    })
  )
}

// ─── 고정비 항목 ────────────────────────────────────────────

export async function getFixedItems(): Promise<FixedItem[]> {
  const { data, error } = await supabase
    .from('fixed_items')
    .select('*')
    .order('group_name')
    .order('name')
  if (error) throw error
  return data
}

export async function createFixedItem(
  input: Omit<FixedItem, 'id' | 'created_by' | 'updated_by' | 'created_at'>,
  createdBy: string
): Promise<FixedItem> {
  const { data, error } = await supabase
    .from('fixed_items')
    .insert({ ...input, created_by: createdBy })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFixedItem(
  id: string,
  input: Omit<FixedItem, 'id' | 'created_by' | 'updated_by' | 'created_at'>,
  updatedBy: string
): Promise<FixedItem> {
  const { data, error } = await supabase
    .from('fixed_items')
    .update({ ...input, updated_by: updatedBy })
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

export async function getFixedItemsSummary(): Promise<{ total: number; activeCount: number }> {
  const { data, error } = await supabase
    .from('fixed_items')
    .select('amount')
    .eq('is_active', true)
  if (error) throw error
  return {
    total: (data ?? []).reduce((s, i) => s + i.amount, 0),
    activeCount: (data ?? []).length,
  }
}

// ─── 자산 ────────────────────────────────────────────────────

export async function getAssetsWithBalance(): Promise<Asset[]> {
  const { data: assets, error: aErr } = await supabase
    .from('assets')
    .select('*, fixed_item:fixed_items!linked_fixed_item_id(name, billing_day)')
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

  return (assets ?? []).map(a => {
    const fi = a.fixed_item as { name: string; billing_day: number | null } | null
    return {
      id: a.id,
      name: a.name,
      category: a.category as AssetCategory,
      initial_balance: a.initial_balance,
      linked_fixed_item_id: a.linked_fixed_item_id,
      created_by: a.created_by,
      updated_by: a.updated_by,
      created_at: a.created_at,
      current_balance: a.initial_balance + (sums.get(a.id) ?? 0),
      linked_fixed_item_name: fi?.name ?? null,
      linked_billing_day: fi?.billing_day ?? null,
    }
  })
}

export async function createAsset(
  input: Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>,
  createdBy: string
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .insert({ ...input, created_by: createdBy })
    .select()
    .single()
  if (error) throw error
  return { ...data, category: data.category as AssetCategory }
}

export async function updateAsset(
  id: string,
  input: Partial<Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>>,
  updatedBy: string
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .update({ ...input, updated_by: updatedBy })
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

export async function getAssetsSummary(): Promise<{ total: number; byCategory: Record<AssetCategory, number> }> {
  const assets = await getAssetsWithBalance()
  const byCategory: Record<AssetCategory, number> = { 금융: 0, 투자: 0, 보증금: 0 }
  let total = 0
  for (const a of assets) {
    const bal = a.current_balance ?? a.initial_balance
    byCategory[a.category] += bal
    total += bal
  }
  return { total, byCategory }
}

// ─── 자산 원장 ──────────────────────────────────────────────

export async function autoAccumulateAssets(createdBy: string): Promise<void> {
  const { data: assets, error: aErr } = await supabase
    .from('assets')
    .select('id, initial_balance, created_at, linked_fixed_item_id, fixed_item:fixed_items!linked_fixed_item_id(billing_day, amount)')
    .not('linked_fixed_item_id', 'is', null)
  if (aErr) throw aErr
  if (!assets || assets.length === 0) return

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()

  for (const asset of assets) {
    const fi = asset.fixed_item as unknown as { billing_day: number | null; amount: number } | null
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

    if (months.length === 0) continue

    const rows = months.map(recordedMonth => ({
      asset_id: asset.id,
      amount: fi.amount,
      entry_type: 'auto' as const,
      source_type: 'fixed_item' as const,
      source_id: asset.linked_fixed_item_id,
      recorded_month: recordedMonth,
      created_by: createdBy,
    }))
    const { error: uErr } = await supabase
      .from('asset_ledger')
      .upsert(rows, { onConflict: 'asset_id,recorded_month', ignoreDuplicates: true })
    if (uErr) throw uErr
  }
}

export async function addManualLedgerEntry(
  assetId: string,
  amount: number,
  sourceId: string,
  createdBy: string,
  memo?: string
): Promise<void> {
  const { error } = await supabase.from('asset_ledger').insert({
    asset_id: assetId,
    amount,
    entry_type: 'manual',
    source_type: 'transaction',
    source_id: sourceId,
    memo: memo ?? null,
    created_by: createdBy,
  })
  if (error) throw error
}

// ─── 멤버 (프로필용) ─────────────────────────────────────────

export async function getMembers(): Promise<Array<{ id: string; username: string; name: string; role: string; is_master: boolean; created_at: string }>> {
  const { data, error } = await supabase
    .from('members')
    .select('id, username, name, role, is_master, created_at')
    .order('created_at')
  if (error) throw error
  return data
}

export async function getMemberCreatedData(memberId: string) {
  const [{ data: transactions }, { data: assets }, { data: fixedItems }] = await Promise.all([
    supabase.from('transactions').select('id, type, amount, date, memo').eq('created_by', memberId).order('date', { ascending: false }).limit(20),
    supabase.from('assets').select('id, name, category, initial_balance').eq('created_by', memberId),
    supabase.from('fixed_items').select('id, name, amount, group_name').eq('created_by', memberId),
  ])
  return {
    transactions: transactions ?? [],
    assets: assets ?? [],
    fixedItems: fixedItems ?? [],
  }
}
```

- [ ] **Step 2: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1 | grep "queries.ts"
```

Expected: queries.ts 관련 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add lib/queries.ts
git commit -m "refactor: queries.ts family_id 제거, created_by/updated_by 파라미터 추가"
```

---

### Task 8: 라우트 재구성

route group `(app)`에 auth check를 두고, `app/page.tsx`를 삭제한다.
`app/(app)/page.tsx`가 `/` URL을 담당한다 (route group은 URL에 영향 없음).
middleware가 비로그인을 `/login`으로 이미 리다이렉트하므로 layout은 온보딩 게이트만 처리한다.

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/page.tsx`
- Create: `app/(app)/transactions/page.tsx`
- Create: `app/(app)/budgets/page.tsx`
- Create: `app/(app)/assets/page.tsx`
- Create: `app/(app)/fixed-items/page.tsx`
- Create: `app/(app)/stats/page.tsx`
- Create: `app/onboarding/page.tsx`
- Delete: `app/page.tsx` (FamilyRedirect 래퍼, 불필요)
- Delete: `app/[familyId]/` 전체
- Delete: `components/FamilyRedirect.tsx`

- [ ] **Step 1: `app/(app)/layout.tsx` 생성**

```tsx
import type { ReactNode } from 'react'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/queries'
import BottomNav from '@/components/layout/BottomNav'
import MonthSelector from '@/components/layout/MonthSelector'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const settings = await getSettings()
  if (!settings?.onboarding_completed) {
    redirect(session.user.isMaster ? '/onboarding' : '/pending')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <MonthSelector />
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```


```bash
rm app/page.tsx
rm -rf "app/[familyId]"
rm components/FamilyRedirect.tsx
```

- [ ] **Step 3: `app/(app)/page.tsx` 생성 (대시보드)**

기존 `app/[familyId]/(app)/page.tsx`에서 familyId 관련 코드 제거.

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useMonthStore } from '@/lib/monthStore'
import { getMonthlySummary, getTransactions, getBudgetsWithUsage, getCategories, seedDefaultCategories, getFixedItemsSummary, getAssetsSummary } from '@/lib/queries'
import type { BudgetWithUsage, Transaction, AssetCategory } from '@/types'
import SummaryCards from '@/components/dashboard/SummaryCards'
import BudgetOverview from '@/components/dashboard/BudgetOverview'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import FixedItemsSummaryCard from '@/components/dashboard/FixedItemsSummaryCard'
import AssetSummaryCard from '@/components/dashboard/AssetSummaryCard'

export default function DashboardPage() {
  const { data: session } = useSession()
  const { current } = useMonthStore()
  const [summary, setSummary] = useState({ income: 0, expense: 0 })
  const [fixedSummary, setFixedSummary] = useState({ total: 0, activeCount: 0 })
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([])
  const [assetSummary, setAssetSummary] = useState<{ total: number; byCategory: Record<AssetCategory, number> }>({
    total: 0,
    byCategory: { 금융: 0, 투자: 0, 보증금: 0 },
  })

  const load = useCallback(async () => {
    const cats = await getCategories()
    if (cats.length === 0 && session?.user.id) {
      await seedDefaultCategories(session.user.id)
    }
    const [sum, bdg, txns, fixedSum, assetSum] = await Promise.all([
      getMonthlySummary(current),
      getBudgetsWithUsage(current),
      getTransactions(current),
      getFixedItemsSummary(),
      getAssetsSummary(),
    ])
    setSummary(sum)
    setBudgets(bdg)
    setRecentTxns(txns)
    setFixedSummary(fixedSum)
    setAssetSummary(assetSum)
  }, [current, session])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <SummaryCards income={summary.income} expense={summary.expense} />
      <FixedItemsSummaryCard total={fixedSummary.total} activeCount={fixedSummary.activeCount} />
      <AssetSummaryCard total={assetSummary.total} byCategory={assetSummary.byCategory} />
      <BudgetOverview budgets={budgets} />
      <RecentTransactions transactions={recentTxns} />
    </div>
  )
}
```

- [ ] **Step 4: `app/(app)/transactions/page.tsx` 생성**

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useMonthStore } from '@/lib/monthStore'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories, seedDefaultCategories, getAssetsWithBalance, addManualLedgerEntry } from '@/lib/queries'
import type { Transaction, Category, Asset } from '@/types'
import TransactionList from '@/components/transactions/TransactionList'
import TransactionForm from '@/components/transactions/TransactionForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function TransactionsPage() {
  const { data: session } = useSession()
  const { current } = useMonthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const load = useCallback(async () => {
    const [txns, cats, a] = await Promise.all([
      getTransactions(current),
      getCategories(),
      getAssetsWithBalance(),
    ])
    if (cats.length === 0 && session?.user.id) {
      await seedDefaultCategories(session.user.id)
      setCategories(await getCategories())
    } else {
      setCategories(cats)
    }
    setTransactions(txns)
    setAssets(a)
  }, [current, session])

  useEffect(() => { load() }, [load])

  async function handleSubmit(
    data: Pick<Transaction, 'type' | 'amount' | 'category_id' | 'memo' | 'date'>,
    assetId?: string
  ) {
    if (!session?.user.id) return
    let txn: Transaction
    if (editing) {
      txn = await updateTransaction(editing.id, data, session.user.id)
    } else {
      txn = await createTransaction(data, session.user.id)
    }
    if (assetId) {
      await addManualLedgerEntry(assetId, data.amount, txn.id, session.user.id, data.memo ?? undefined)
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

  return (
    <>
      <TransactionList transactions={transactions} onEdit={t => { setEditing(t); setIsFormOpen(true) }} onDelete={handleDelete} />
      <FAB onClick={() => { setEditing(null); setIsFormOpen(true) }} />
      <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditing(null) }} title={editing ? '내역 수정' : '내역 추가'}>
        <TransactionForm categories={categories} assets={assets} initial={editing} onSubmit={handleSubmit} onCancel={() => { setIsFormOpen(false); setEditing(null) }} />
      </Modal>
    </>
  )
}
```

- [ ] **Step 5: `app/(app)/budgets/page.tsx` 생성**

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useMonthStore } from '@/lib/monthStore'
import { getBudgetsWithUsage, upsertBudget, getCategories, seedDefaultCategories } from '@/lib/queries'
import type { BudgetWithUsage, Category } from '@/types'
import BudgetCard from '@/components/budgets/BudgetCard'
import BudgetForm from '@/components/budgets/BudgetForm'
import Modal from '@/components/ui/Modal'

export default function BudgetsPage() {
  const { data: session } = useSession()
  const { current } = useMonthStore()
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<BudgetWithUsage | null>(null)

  const load = useCallback(async () => {
    let cats = await getCategories()
    if (cats.length === 0 && session?.user.id) {
      await seedDefaultCategories(session.user.id)
      cats = await getCategories()
    }
    setCategories(cats)
    setBudgets(await getBudgetsWithUsage(current))
  }, [current, session])

  useEffect(() => { load() }, [load])

  async function handleSave(amount: number) {
    if (!editing || !session?.user.id) return
    await upsertBudget(editing.category_id, current, amount, session.user.id)
    setEditing(null)
    await load()
  }

  const allItems = categories.map(cat => {
    const existing = budgets.find(b => b.category_id === cat.id)
    return existing ?? {
      id: '', category_id: cat.id, amount: 0,
      year: current.year, month: current.month,
      used: 0, category: cat,
      created_by: session?.user.id ?? '',
      updated_by: null,
    } as BudgetWithUsage
  })

  return (
    <div className="p-4">
      {allItems.map(item => (
        <BudgetCard key={item.category_id} budget={item} onEdit={setEditing} />
      ))}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="예산 설정">
        {editing && (
          <BudgetForm categoryName={editing.category.name} categoryIcon={editing.category.icon} currentAmount={editing.amount} onSubmit={handleSave} onCancel={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 6: `app/(app)/assets/page.tsx` 생성**

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getAssetsWithBalance, autoAccumulateAssets, createAsset, updateAsset, deleteAsset, getFixedItems } from '@/lib/queries'
import type { Asset, FixedItem } from '@/types'
import AssetList from '@/components/assets/AssetList'
import AssetForm from '@/components/assets/AssetForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function AssetsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([])
  const [editing, setEditing] = useState<Asset | null | undefined>(undefined)

  const load = useCallback(async () => {
    if (!session?.user.id) return
    await autoAccumulateAssets(session.user.id)
    const [a, f] = await Promise.all([getAssetsWithBalance(), getFixedItems()])
    setAssets(a)
    setFixedItems(f)
  }, [session])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>) {
    if (!session?.user.id) return
    if (editing === null) {
      await createAsset(data, session.user.id)
    } else if (editing) {
      await updateAsset(editing.id, data, session.user.id)
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
      <div className="bg-emerald-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-emerald-200 text-xl">←</button>
        <h1 className="text-lg font-semibold">총 자산 현황</h1>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <AssetList assets={assets} onEdit={a => setEditing(a)} />
      </div>
      <FAB onClick={() => setEditing(null)} />
      <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? '자산 수정' : '자산 추가'}>
        {editing !== undefined && (
          <AssetForm initial={editing ?? null} fixedItems={fixedItems} onSubmit={handleSubmit} onCancel={() => setEditing(undefined)} onDelete={editing ? handleDelete : undefined} />
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 7: `app/(app)/fixed-items/page.tsx` 생성**

```tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getFixedItems, createFixedItem, updateFixedItem, deleteFixedItem } from '@/lib/queries'
import type { FixedItem } from '@/types'
import FixedItemList from '@/components/fixed-items/FixedItemList'
import FixedItemForm from '@/components/fixed-items/FixedItemForm'
import Modal from '@/components/ui/Modal'
import FAB from '@/components/ui/FAB'

export default function FixedItemsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<FixedItem[]>([])
  const [editing, setEditing] = useState<FixedItem | null | undefined>(undefined)

  const load = useCallback(async () => { setItems(await getFixedItems()) }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(data: Omit<FixedItem, 'id' | 'created_by' | 'updated_by' | 'created_at'>) {
    if (!session?.user.id) return
    if (editing === null) {
      await createFixedItem(data, session.user.id)
    } else if (editing) {
      await updateFixedItem(editing.id, data, session.user.id)
    }
    setEditing(undefined)
    await load()
  }

  async function handleDelete() {
    if (!editing) return
    await deleteFixedItem(editing.id)
    setEditing(undefined)
    await load()
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-indigo-600 text-white px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-indigo-200 text-xl">←</button>
        <h1 className="text-lg font-semibold">고정비 관리</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <FixedItemList items={items} onEdit={item => setEditing(item)} />
      </div>
      <FAB onClick={() => setEditing(null)} />
      <Modal isOpen={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? '고정비 수정' : '고정비 추가'}>
        {editing !== undefined && (
          <FixedItemForm initial={editing ?? null} onSubmit={handleSubmit} onCancel={() => setEditing(undefined)} onDelete={editing ? handleDelete : undefined} />
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 8: `app/(app)/stats/page.tsx` 생성**

기존 stats 페이지에서 `useParams`/`familyId` 제거.

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useMonthStore } from '@/lib/monthStore'
import { getMonthlyStats, getBudgetsWithUsage } from '@/lib/queries'
import type { MonthYear, BudgetWithUsage } from '@/types'
import MonthlyBarChart from '@/components/stats/MonthlyBarChart'
import CategoryPieChart from '@/components/stats/CategoryPieChart'

export default function StatsPage() {
  const { current } = useMonthStore()
  const [monthlyData, setMonthlyData] = useState<Array<MonthYear & { income: number; expense: number }>>([])
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([])

  useEffect(() => {
    const months: MonthYear[] = []
    for (let i = 5; i >= 0; i--) {
      let { year, month } = current
      month -= i
      while (month <= 0) { month += 12; year-- }
      months.push({ year, month })
    }
    Promise.all([
      getMonthlyStats(months),
      getBudgetsWithUsage(current),
    ]).then(([stats, bdg]) => {
      setMonthlyData(stats)
      setBudgets(bdg)
    })
  }, [current])

  return (
    <div className="p-4 flex flex-col gap-6">
      <MonthlyBarChart data={monthlyData} />
      <CategoryPieChart budgets={budgets} />
    </div>
  )
}
```

- [ ] **Step 9: `app/onboarding/page.tsx` 생성**

```tsx
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="bg-indigo-600 text-white px-4 py-5">
        <p className="text-xs text-indigo-200 mb-1">가족 가계부 설정</p>
        <h1 className="text-xl font-bold">처음 시작하기</h1>
        <p className="text-sm text-indigo-200 mt-1">기본 정보를 입력하면 앱을 사용할 수 있어요</p>
      </div>
      <div className="flex-1 flex flex-col">
        <OnboardingWizard />
      </div>
    </div>
  )
}
```

- [ ] **Step 10: 기존 라우트 삭제 및 커밋**

```bash
git rm -r "app/[familyId]" app/page.tsx components/FamilyRedirect.tsx 2>/dev/null || true
git add app/\(app\) app/onboarding
git commit -m "refactor: app/[familyId] → app/(app) 라우트 재구성, familyId URL 제거"
```

---

### Task 9: 컴포넌트 업데이트 (familyId 제거)

**Files:**
- Modify: `components/layout/BottomNav.tsx`
- Modify: `components/onboarding/OnboardingWizard.tsx`
- Modify: `components/onboarding/Step1Assets.tsx`
- Modify: `components/onboarding/Step2FixedItems.tsx`
- Modify: `components/onboarding/Step3LinkAssets.tsx`
- Modify: `components/onboarding/Step4Budgets.tsx`
- Modify: `components/dashboard/FixedItemsSummaryCard.tsx`
- Modify: `components/dashboard/AssetSummaryCard.tsx`

- [ ] **Step 1: `components/layout/BottomNav.tsx` 교체**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',             label: '홈',     icon: '🏠' },
  { href: '/transactions', label: '내역',   icon: '📋' },
  { href: '/budgets',      label: '예산',   icon: '🎯' },
  { href: '/fixed-items',  label: '고정비', icon: '📌' },
  { href: '/assets',       label: '자산',   icon: '💰' },
  { href: '/stats',        label: '통계',   icon: '📈' },
  { href: '/profile',      label: '내 정보', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {tabs.map(tab => {
        const isActive = tab.href === '/'
          ? pathname === '/'
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center py-2 text-[10px] gap-1 ${
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

- [ ] **Step 2: `components/onboarding/OnboardingWizard.tsx` 교체**

step detection에서 `monthly_income` 대신 `assets.length > 0`으로 step 2 판단.

```tsx
'use client'
import { useState, useEffect } from 'react'
import { getFixedItems, getAssetsWithBalance } from '@/lib/queries'
import Step1Assets from './Step1Assets'
import Step2FixedItems from './Step2FixedItems'
import Step3LinkAssets from './Step3LinkAssets'
import Step4Budgets from './Step4Budgets'

const STEP_LABELS = ['자산 현황 등록', '고정비 입력', '자산 연결', '예산 설정']

export default function OnboardingWizard() {
  const [step, setStep] = useState<number | null>(null)

  useEffect(() => {
    async function detectStep() {
      const [fixedItems, assets] = await Promise.all([
        getFixedItems(),
        getAssetsWithBalance(),
      ])
      if (fixedItems.length > 0) {
        setStep(3)
      } else if (assets.length > 0) {
        setStep(2)
      } else {
        setStep(1)
      }
    }
    detectStep().catch(() => setStep(1))
  }, [])

  if (step === null) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">Step {step} / 4</p>
          <p className="text-xs font-medium text-indigo-600">{STEP_LABELS[step - 1]}</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {step === 1 && <Step1Assets onNext={() => setStep(2)} />}
        {step === 2 && <Step2FixedItems onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3LinkAssets onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <Step4Budgets onBack={() => setStep(3)} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `components/onboarding/Step1Assets.tsx` 교체**

`monthly_income` 입력 제거. `useSession()`으로 memberId 획득.

```tsx
'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import type { AssetCategory } from '@/types'
import { ASSET_CATEGORIES } from '@/types'
import { formatAmount, formatAmountInput } from '@/lib/utils'
import { createAsset } from '@/lib/queries'

interface Props {
  onNext: () => void
}

interface AssetInput {
  name: string
  category: AssetCategory
  initial_balance: number
}

export default function Step1Assets({ onNext }: Props) {
  const { data: session } = useSession()
  const [showForm, setShowForm] = useState(false)
  const [assetName, setAssetName] = useState('')
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('금융')
  const [assetBalance, setAssetBalance] = useState('')
  const [addedAssets, setAddedAssets] = useState<AssetInput[]>([])
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function addAsset() {
    const bal = parseInt(assetBalance.replace(/,/g, ''))
    if (!assetName.trim() || isNaN(bal) || bal < 0) return
    setAddedAssets(prev => [...prev, { name: assetName.trim(), category: assetCategory, initial_balance: bal }])
    setAssetName('')
    setAssetBalance('')
    setAssetCategory('금융')
    setShowForm(false)
  }

  async function handleNext() {
    if (!session?.user.id) return
    setLoading(true)
    setSaveError(null)
    try {
      await Promise.all(
        addedAssets.map(a => createAsset(
          { name: a.name, category: a.category, initial_balance: a.initial_balance, linked_fixed_item_id: null },
          session.user.id
        ))
      )
      onNext()
    } catch {
      setSaveError('저장 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">자산 항목</p>
          <button type="button" onClick={() => setShowForm(true)} className="text-sm text-indigo-600 font-medium">+ 추가</button>
        </div>
        {showForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-3 flex flex-col gap-3">
            <input type="text" placeholder="항목 이름 (예: 적금 A은행)" value={assetName} onChange={e => setAssetName(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" autoFocus />
            <select value={assetCategory} onChange={e => setAssetCategory(e.target.value as AssetCategory)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" inputMode="numeric" placeholder="현재 잔액 (원)" value={assetBalance} onChange={e => setAssetBalance(formatAmountInput(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">취소</button>
              <button type="button" onClick={addAsset} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">추가</button>
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
                  <p className="text-sm font-semibold text-emerald-600">{formatAmount(a.initial_balance)}원</p>
                  <button type="button" onClick={() => setAddedAssets(prev => prev.filter((_, j) => j !== i))} className="text-red-400 text-sm">×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {saveError && <p className="text-red-500 text-sm text-center">{saveError}</p>}
      <button type="button" onClick={handleNext} disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
        {loading ? '저장 중...' : '다음'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Step2FixedItems, Step3LinkAssets 업데이트**

두 파일 모두에서:
1. `interface Props`에서 `familyId: string` 제거
2. `import { useSession } from 'next-auth/react'` 추가
3. `const { data: session } = useSession()` 추가
4. query 호출에서 `familyId` 인수 제거
5. create/update 호출에 `session.user.id` 추가

Step2FixedItems 변경 목록:
- `getFixedItems(familyId)` → `getFixedItems()`
- `createFixedItem(familyId, data)` → `createFixedItem(data, session.user.id)`
- `deleteFixedItem(id)` 변경 없음

Step3LinkAssets 변경 목록:
- `getAssetsWithBalance(familyId)` → `getAssetsWithBalance()`
- `getFixedItems(familyId)` → `getFixedItems()`
- `updateAsset(id, data)` → `updateAsset(id, data, session.user.id)`

- [ ] **Step 5: `components/onboarding/Step4Budgets.tsx` 업데이트**

변경 목록:
- `familyId: string` prop 제거
- `import { updateFamily, ... }` → `import { updateSettings, ... }`
- `updateFamily(familyId, { onboarding_completed: true })` → `updateSettings(session.user.id, { onboarding_completed: true })`
- `getCategories(familyId)` → `getCategories()`
- `seedDefaultCategories(familyId)` → `seedDefaultCategories(session.user.id)`
- `getBudgetsWithUsage(familyId, current)` → `getBudgetsWithUsage(current)`
- `upsertBudget(familyId, editing.category_id, current, amount)` → `upsertBudget(editing.category_id, current, amount, session.user.id)`
- `router.replace(`/${familyId}`)` → `router.replace('/')`
- `family_id: familyId` in allItems default object → `created_by: session?.user.id ?? ''`

- [ ] **Step 6: `FixedItemsSummaryCard.tsx`, `AssetSummaryCard.tsx` 업데이트**

두 파일 모두에서 `familyId: string` prop 제거 및 Link href 업데이트.

`FixedItemsSummaryCard.tsx`: `href={/${familyId}/fixed-items}` → `href="/fixed-items"`

`AssetSummaryCard.tsx`: `href={/${familyId}/assets}` → `href="/assets"`

- [ ] **Step 7: TypeScript 확인**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add components/
git commit -m "refactor: 컴포넌트에서 familyId prop 제거, useSession으로 교체"
```

---

### Task 10: 로그인/회원가입/아이디찾기/대기 페이지

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/signup/page.tsx`
- Create: `app/find-id/page.tsx`
- Create: `app/pending/page.tsx`

- [ ] **Step 1: `app/login/page.tsx` 생성**

```tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signIn('credentials', { username, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } else {
      router.replace('/')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">로그인</h1>
          <p className="text-sm text-gray-400 mt-1">가족 가계부에 오신 것을 환영합니다</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="text" placeholder="아이디" value={username} onChange={e => setUsername(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" autoComplete="username" required />
          <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" autoComplete="current-password" required />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="flex justify-between text-xs text-gray-400">
          <Link href="/find-id" className="underline">아이디 찾기</Link>
          <Link href="/signup" className="underline">회원가입</Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `app/signup/page.tsx` 생성**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ROLES = ['엄마', '아빠', '아들', '딸', '기타']

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '', role: '엄마', inviteCode: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? '회원가입 중 오류가 발생했습니다.')
    } else {
      router.replace('/login')
    }
  }

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">회원가입</h1>
          <p className="text-sm text-gray-400 mt-1">초대 코드가 필요합니다</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="text" placeholder="초대 코드" value={form.inviteCode} onChange={set('inviteCode')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="text" placeholder="아이디" value={form.username} onChange={set('username')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="password" placeholder="비밀번호" value={form.password} onChange={set('password')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="text" placeholder="이름" value={form.name} onChange={set('name')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="tel" placeholder="전화번호 (아이디 찾기에 사용)" value={form.phone} onChange={set('phone')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" />
          <select value={form.role} onChange={set('role')} className="border border-gray-300 rounded-xl px-4 py-3 text-sm">
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
            {loading ? '가입 중...' : '가입하기'}
          </button>
        </form>
        <Link href="/login" className="text-xs text-gray-400 underline text-center">이미 계정이 있으신가요?</Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `app/find-id/page.tsx` 생성**

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function FindIdPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    const res = await fetch('/api/auth/find-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? '오류가 발생했습니다.')
    } else {
      setResult(data.username)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        <h1 className="text-xl font-bold text-gray-800">아이디 찾기</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="text" placeholder="이름" value={name} onChange={e => setName(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          <input type="tel" placeholder="전화번호" value={phone} onChange={e => setPhone(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-3 text-sm" required />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          {result && <p className="text-indigo-600 font-medium text-center">아이디: <strong>{result}</strong></p>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
            {loading ? '찾는 중...' : '찾기'}
          </button>
        </form>
        <Link href="/login" className="text-xs text-gray-400 underline text-center">로그인으로 돌아가기</Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: `app/pending/page.tsx` 생성**

```tsx
'use client'
import { signOut } from 'next-auth/react'

export default function PendingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 items-center justify-center px-6 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">아직 사용할 수 없어요</h1>
      <p className="text-sm text-gray-500 mb-6">
        관리자가 초기 설정을 완료한 후 사용할 수 있습니다.<br />
        설정이 완료되면 다시 접속해 주세요.
      </p>
      <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-gray-400 underline">
        로그아웃
      </button>
    </div>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
git add app/login app/signup app/find-id app/pending
git commit -m "feat: 로그인/회원가입/아이디찾기/대기 페이지 추가"
```

---

### Task 11: 프로필 페이지 및 비밀번호 변경 API

**Files:**
- Create: `app/(app)/profile/page.tsx`
- Create: `components/profile/InviteCodeManager.tsx`
- Create: `app/api/auth/change-password/route.ts`

- [ ] **Step 1: `app/api/auth/change-password/route.ts` 생성**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '현재/새 비밀번호를 입력해 주세요.' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('password_hash')
    .eq('id', session.user.id)
    .single()

  if (!member) return NextResponse.json({ error: '계정을 찾을 수 없습니다.' }, { status: 404 })

  const valid = await bcrypt.compare(currentPassword, member.password_hash)
  if (!valid) return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })

  const newHash = await bcrypt.hash(newPassword, 10)
  await supabase.from('members').update({ password_hash: newHash }).eq('id', session.user.id)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: `components/profile/InviteCodeManager.tsx` 생성**

```tsx
'use client'
import { useState, useEffect } from 'react'

interface InviteCode {
  code: string
  expires_at: string
  used_at: string | null
}

export default function InviteCodeManager() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/invite-codes').then(r => r.json()).then(setCodes)
  }, [])

  async function generate() {
    setLoading(true)
    const res = await fetch('/api/invite-codes', { method: 'POST' })
    const newCode = await res.json()
    setCodes(prev => [newCode, ...prev])
    setLoading(false)
  }

  const active = codes.filter(c => !c.used_at && new Date(c.expires_at) > new Date())
  const expired = codes.filter(c => c.used_at || new Date(c.expires_at) <= new Date())

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">초대 코드 관리</p>
        <button onClick={generate} disabled={loading} className="text-sm text-indigo-600 font-medium disabled:opacity-50">+ 생성</button>
      </div>
      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">사용 가능 (24시간)</p>
          {active.map(c => (
            <div key={c.code} className="flex items-center justify-between bg-indigo-50 rounded-lg px-3 py-2">
              <span className="font-mono text-sm font-bold text-indigo-700">{c.code}</span>
              <button onClick={() => navigator.clipboard.writeText(c.code)} className="text-xs text-indigo-600">복사</button>
            </div>
          ))}
        </div>
      )}
      {expired.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">사용됨 / 만료</p>
          {expired.map(c => (
            <div key={c.code} className="flex items-center justify-between px-3 py-1">
              <span className="font-mono text-sm text-gray-400 line-through">{c.code}</span>
              <span className="text-xs text-gray-400">{c.used_at ? '사용됨' : '만료'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `app/(app)/profile/page.tsx` 생성**

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { getMemberCreatedData } from '@/lib/queries'
import { formatAmount } from '@/lib/utils'
import InviteCodeManager from '@/components/profile/InviteCodeManager'

interface CreatedData {
  transactions: Array<{ id: string; type: string; amount: number; date: string; memo: string | null }>
  assets: Array<{ id: string; name: string; category: string; initial_balance: number }>
  fixedItems: Array<{ id: string; name: string; amount: number; group_name: string }>
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [createdData, setCreatedData] = useState<CreatedData | null>(null)
  const [tab, setTab] = useState<'transactions' | 'assets' | 'fixedItems'>('transactions')

  useEffect(() => {
    if (session?.user.id) getMemberCreatedData(session.user.id).then(setCreatedData)
  }, [session])

  if (!session) return null

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <div className="bg-indigo-600 text-white px-4 py-5">
        <h1 className="text-lg font-bold">내 정보</h1>
        <p className="text-sm text-indigo-200 mt-1">{session.user.name} · {session.user.role}</p>
      </div>

      <div className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm">
        {!session.user.isMaster && (
          <div className="mb-3">
            <p className="text-xs text-gray-400">아이디</p>
            <p className="text-sm font-medium">{session.user.username}</p>
          </div>
        )}
        <PasswordResetForm />
      </div>

      {session.user.isMaster && (
        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
          <InviteCodeManager />
        </div>
      )}

      {!session.user.isMaster && createdData && (
        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-3">내가 입력한 데이터</p>
          <div className="flex gap-2 mb-3">
            {(['transactions', 'assets', 'fixedItems'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full text-xs ${tab === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {t === 'transactions' ? '거래내역' : t === 'assets' ? '자산' : '고정비'}
              </button>
            ))}
          </div>
          {tab === 'transactions' && createdData.transactions.map(t => (
            <div key={t.id} className="flex justify-between text-sm py-1">
              <span className="text-gray-600">{t.date} {t.memo ?? ''}</span>
              <span className={t.type === 'income' ? 'text-blue-600' : 'text-red-500'}>{formatAmount(t.amount)}원</span>
            </div>
          ))}
          {tab === 'assets' && createdData.assets.map(a => (
            <div key={a.id} className="flex justify-between text-sm py-1">
              <span className="text-gray-600">{a.name} ({a.category})</span>
              <span className="text-emerald-600">{formatAmount(a.initial_balance)}원</span>
            </div>
          ))}
          {tab === 'fixedItems' && createdData.fixedItems.map(f => (
            <div key={f.id} className="flex justify-between text-sm py-1">
              <span className="text-gray-600">{f.name} ({f.group_name})</span>
              <span className="text-gray-700">{formatAmount(f.amount)}원</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => signOut({ callbackUrl: '/login' })} className="mx-4 mt-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 text-center">
        로그아웃
      </button>
    </div>
  )
}

function PasswordResetForm() {
  const { data: session } = useSession()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.user.id) return
    setLoading(true)
    setMsg(null)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    const data = await res.json()
    setLoading(false)
    setMsg(res.ok ? '비밀번호가 변경되었습니다.' : (data.error ?? '오류가 발생했습니다.'))
    if (res.ok) { setCurrent(''); setNext('') }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 font-medium">비밀번호 재설정</p>
      <input type="password" placeholder="현재 비밀번호" value={current} onChange={e => setCurrent(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
      <input type="password" placeholder="새 비밀번호" value={next} onChange={e => setNext(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
      {msg && <p className={`text-xs ${msg.includes('변경') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
      <button type="submit" disabled={loading} className="py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50">
        {loading ? '변경 중...' : '변경'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add app/\(app\)/profile components/profile app/api/auth/change-password
git commit -m "feat: 프로필 페이지, 초대코드 관리, 비밀번호 변경 추가"
```

---

### Task 12: 테스트 업데이트

**Files:**
- Modify: `__tests__/OnboardingWizard.test.tsx`
- Modify: `__tests__/AssetForm.test.tsx`
- Modify: `__tests__/FixedItemRow.test.tsx`
- Modify: `__tests__/AssetRow.test.tsx`

- [ ] **Step 1: `__tests__/OnboardingWizard.test.tsx` 교체**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'user1', name: '테스트', role: '엄마', isMaster: false } },
    status: 'authenticated',
  }),
}))

jest.mock('@/lib/queries', () => ({
  updateSettings: jest.fn().mockResolvedValue(undefined),
  createAsset: jest.fn().mockResolvedValue({}),
  getSettings: jest.fn().mockResolvedValue({ onboarding_completed: false }),
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
  it('DB에 저장된 데이터가 없으면 Step 1을 표시한다', async () => {
    render(<OnboardingWizard />)
    await waitFor(() => expect(screen.getByText('Step 1 / 4')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: `__tests__/AssetForm.test.tsx`, `FixedItemRow.test.tsx`, `AssetRow.test.tsx` 업데이트**

`family_id` 필드를 `created_by`/`updated_by`로 교체.

`AssetForm.test.tsx` Asset mock:
```ts
const asset: Asset = {
  id: '1',
  name: '국내주식',
  category: '투자',
  initial_balance: 5000000,
  linked_fixed_item_id: null,
  created_by: 'user1',
  updated_by: null,
  created_at: '2026-01-01',
}
```

`FixedItemRow.test.tsx` FixedItem mock:
```ts
const mockItem: FixedItem = {
  id: '1',
  name: '유튜브 구독료',
  amount: 14900,
  group_name: '구독/서비스',
  billing_day: 1,
  payment_method: null,
  memo: null,
  is_active: true,
  created_by: 'user1',
  updated_by: null,
  created_at: '2026-01-01',
}
```

`AssetRow.test.tsx`에도 동일하게 `family_id` → `created_by: 'user1', updated_by: null` 교체.

- [ ] **Step 3: 테스트 실행**

```bash
npm test 2>&1
```

Expected: All tests pass

- [ ] **Step 4: 커밋**

```bash
git add __tests__/
git commit -m "test: family_id → created_by/updated_by 테스트 픽스처 업데이트"
```

---

### Task 13: 빌드 검증

- [ ] **Step 1: TypeScript 전체 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 2: Next.js 빌드**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: 개발 서버 실행 및 수동 검증**

```bash
npm run dev
```

검증 항목:
- `/login` → 로그인 폼 표시
- `master` / `qwer1234!` 로그인 → `/onboarding` 리다이렉트 (온보딩 미완료 시)
- 온보딩 완료 → `/` 대시보드
- 로그아웃 → `/login` 리다이렉트
- `/signup` → 초대 코드 없이 접근 시 가입 폼 표시 (코드 제출 시 유효성 검사)
- `/pending` → 일반 유저가 온보딩 전 접근 시 표시
- `/profile` → 프로필 페이지, master는 초대코드 관리 표시

- [ ] **Step 4: 최종 커밋**

```bash
git add -u
git commit -m "feat: 회원가입/로그인 인증 시스템 완성"
```
