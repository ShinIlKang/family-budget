# 회원가입/로그인 구현 설계

## 개요

단일 가족 전용 배포 앱에 인증 기능을 추가한다. NextAuth.js (Auth.js) Credentials provider를 사용하며, 자유 문자 username + 비밀번호 방식으로 로그인한다. Supabase는 DB로만 사용한다.

---

## 전제 조건

- 이 앱은 단일 가족 전용이다. 다른 가족이 사용하려면 별도 Supabase 인스턴스가 필요하다.
- master 계정 초기값: `username=master`, `password=qwer1234!` (DB 시드로 제공)
- master가 온보딩(자산·고정비용 초기설정)을 완료해야 일반유저가 회원가입·사용 가능하다.

---

## 데이터베이스 스키마

### 신규 테이블

```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,   -- bcrypt
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,            -- 엄마, 아빠, 아들, 딸 등
  is_master BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_completed BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES members(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invite_codes (
  code TEXT PRIMARY KEY,
  created_by UUID REFERENCES members(id) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
```

### 기존 테이블 변경

모든 데이터 테이블에서 `family_id` 컬럼을 제거하고 아래 두 컬럼을 추가한다:

```sql
-- assets, fixed_items, categories, budgets, asset_ledger 공통
ALTER TABLE <table> DROP COLUMN family_id;
ALTER TABLE <table> ADD COLUMN created_by UUID REFERENCES members(id) NOT NULL;
ALTER TABLE <table> ADD COLUMN updated_by UUID REFERENCES members(id);
```

### 초기 시드

```sql
-- master 계정 (password: qwer1234! → bcrypt hash)
INSERT INTO members (username, password_hash, name, phone, role, is_master)
VALUES ('master', '<bcrypt_hash>', '관리자', NULL, '관리자', true);

-- settings 초기값
INSERT INTO settings (onboarding_completed) VALUES (false);
```

---

## 기술 스택

- **NextAuth.js v5 (Auth.js)**: Credentials provider로 username/password 인증
- **bcryptjs**: 비밀번호 해싱
- **Supabase**: DB (인증 기능은 사용하지 않음)

---

## 인증 흐름

```
접속 (/)
 ├── 세션 없음 → /login
 └── 세션 있음
      ├── master + onboarding 미완료 → /onboarding
      ├── 일반유저 + onboarding 미완료 → /pending
      └── onboarding 완료 → /dashboard
```

### NextAuth 세션 구조

```ts
session.user = {
  id: string        // members.id
  username: string
  name: string
  role: string
  isMaster: boolean
}
```

---

## 페이지 구조

| 경로 | 설명 | 접근 조건 |
|------|------|-----------|
| `/login` | 로그인 (username + password) | 비로그인 |
| `/signup` | 회원가입 (username, password, 이름, 전화번호, 역할, 초대코드) | 비로그인 + `onboarding_completed=true` + 유효한 초대코드 |
| `/find-id` | 아이디 찾기 (이름 + 전화번호 → username 반환) | 비로그인 |
| `/pending` | 초기설정 미완료 안내 화면 | 로그인 + 일반유저 + 온보딩 전 |
| `/onboarding` | 초기설정 (자산·고정비용) | master 전용 |
| `/(app)/` | 대시보드, 예산, 거래내역 등 | 로그인 + 온보딩 완료 |
| `/(app)/profile` | 내 정보 | 로그인 |

### 접근 제어 (middleware)

```
/login, /signup, /find-id → 이미 로그인된 경우 /로 리다이렉트
그 외 → 미로그인 시 /login으로 리다이렉트
master + 온보딩 미완료 → /onboarding 강제
일반유저 + 온보딩 미완료 → /pending 강제
```

---

## 회원가입 조건

회원가입에는 두 가지 조건이 모두 충족되어야 한다:
1. `settings.onboarding_completed = true`
2. 유효한 초대 코드 (master가 발급, 24시간 유효, 1회 사용)

`onboarding_completed = false`인 경우: "아직 초기 설정이 완료되지 않았습니다. 관리자에게 문의하세요." 메시지 표시.
초대 코드 없이 `/signup` 접근 시: "초대 코드가 필요합니다." 메시지 표시.

---

## master 관리 기능 (`/profile` 또는 `/admin`)

master 전용 섹션에서 초대 코드를 생성·관리할 수 있다:
- 초대 코드 생성 버튼 → 6자리 랜덤 코드 생성, 24시간 유효
- 생성된 코드 표시 (복사 버튼 포함)
- 기존 코드 목록 (사용 여부, 만료 시간 표시)

---

## 프로필 페이지 (`/profile`)

### master
- 비밀번호 재설정만 가능

### 일반유저
- 기본정보 보기: 이름, 역할, 전화번호
- 비밀번호 재설정
- 내가 입력한 데이터 목록: `created_by = 나` 기준으로 assets, fixed_items, budgets 조회

---

## 온보딩 완료 처리

기존 `updateFamily(familyId, { onboarding_completed: true })` 호출을 `updateSettings({ onboarding_completed: true, updated_by: memberId })`로 교체한다.

---

## 데이터 조회 방식 변경

기존 `WHERE family_id = ?` → 단일 가족이므로 `WHERE true` (전체 조회) 또는 `WHERE created_by = ?` (개인 데이터).

모든 가족 구성원이 동일한 데이터를 공유하므로 별도 필터링 불필요.

---

## 기존 코드 변경 범위

| 파일 | 변경 내용 |
|------|-----------|
| `lib/supabase.ts` | 기존 유지 (anon client) |
| `lib/queries.ts` | family_id 파라미터 제거, created_by/updated_by 추가 |
| `lib/auth.ts` | NextAuth 설정 신규 |
| `middleware.ts` | 접근 제어 신규 |
| `app/login/page.tsx` | 신규 |
| `app/signup/page.tsx` | 신규 |
| `app/find-id/page.tsx` | 신규 |
| `app/pending/page.tsx` | 신규 |
| `app/[familyId]/` → `app/(app)/` | familyId 라우트 제거 |
| `components/FamilyRedirect.tsx` | 삭제 → middleware로 대체 |
| `components/onboarding/` | updated_by 추가, family_id 제거 |
| `components/*/` | familyId prop 제거 |
