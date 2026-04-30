# 가족 가계부

가족 구성원이 함께 사용하는 월별 가계부 앱입니다. 매달 24일 월급 기준으로 고정비·투자를 정산하고, 남은 예산으로 생활비를 관리합니다.

## 주요 기능

- **월별 정산**: 매달 24일 기준으로 고정비·투자 차감 후 예산 설정
- **고정비 관리**: 구독/보험/공과금 등 그룹별 월별 고정비 등록 및 관리
- **예산 관리**: 생활비·의료비·경조사비 카테고리별 예산 설정 및 사용량 추적
- **거래 내역**: 수입·지출 내역 기록 및 조회
- **자산 관리**: 금융·투자·보증금 자산 등록 및 잔액 추적
- **통계**: 월별 수입/지출 추이, 카테고리별 지출, 고정비 그룹별 분석 차트
- **가족 계정**: 초대 코드 기반 가족 구성원 공유

## 기술 스택

| 항목 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 인증 | NextAuth v5 (Credentials) |
| 데이터베이스 | Supabase (PostgreSQL) |
| 상태 관리 | Zustand |
| 차트 | Recharts |
| 스타일 | Tailwind CSS v4 |
| 테스트 | Jest + Testing Library |

## 시작하기

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에 접속해 회원가입 후 새 프로젝트를 생성합니다.
2. 프로젝트 생성 완료 후 **Settings → API** 메뉴에서 아래 값을 복사합니다.
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. 환경변수 설정

`.env.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
AUTH_SECRET=your-random-secret
```

`AUTH_SECRET`은 아래 명령으로 생성할 수 있습니다.

```bash
openssl rand -base64 32
```

### 3. DB 스키마 적용

Supabase Dashboard의 **SQL Editor**에서 아래 파일을 순서대로 실행합니다.

```
supabase/schema-v2.sql
supabase/add-settlements.sql
supabase/add-fixed-items-month.sql
```

### 4. 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

## 정산 플로우

1. 매달 24일 월급 입금
2. 해당 월(1일~말일) 고정비(카드·자동이체) 차감
3. 저축·투자 차감
4. 나머지로 생활비·의료비·경조사비 예산 설정
5. 지출·수입 발생 시 그때그때 내역 기록

## 배포 (Vercel)

1. GitHub에 레포 push
2. [Vercel](https://vercel.com)에서 레포 import
3. Environment Variables에 아래 3개 입력

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 |
| `AUTH_SECRET` | NextAuth JWT 시크릿 |

4. Deploy

## 테스트

```bash
npm test
```
