# 가족 공유 가계부 웹사이트 설계

**날짜:** 2026-04-27  
**상태:** 승인됨

---

## 개요

가족이 함께 수입/지출을 기록하고 예산을 관리하는 웹 애플리케이션. 로그인 없이 공유 URL 하나로 가족 모두가 접속하여 실시간으로 가계부를 공유한다.

---

## 요구사항

### 기능 요구사항

| 기능 | 설명 |
|------|------|
| 수입/지출 내역 | 날짜, 금액, 카테고리, 메모 입력. 추가/수정/삭제 |
| 카테고리 분류 | 기본 카테고리 제공 (식비, 교통, 의료, 교육, 쇼핑, 저축, 기타). 커스텀 추가 가능 |
| 월별 예산 설정 | 카테고리별 예산 금액 설정. 사용률 시각화 및 초과 시 강조 표시 |
| 통계/차트 | 월별 수입/지출 막대 그래프. 카테고리별 지출 파이 차트. 월 선택 |
| 가족 공유 | 고유 URL 생성. 로그인 없이 URL 아는 구성원 모두 읽기/쓰기 |

### 비기능 요구사항

- 모바일 우선 반응형 UI
- Vercel 무료 티어 배포
- Supabase 무료 티어 (500MB) 내 운영

---

## 기술 스택

| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| 프레임워크 | Next.js 15 (App Router) | 풀스택, Vercel 최적화, SSR 지원 |
| 언어 | TypeScript | 타입 안전성 |
| 스타일 | Tailwind CSS | 빠른 모바일 우선 UI 개발 |
| 데이터베이스 | Supabase (PostgreSQL) | 실시간 동기화, 무료 500MB |
| 차트 | Recharts | React 친화적, 선언적 API |
| 배포 | Vercel | GitHub 연동 자동 배포, 무료 |

---

## 아키텍처

```
사용자 브라우저
    ↕ HTTPS
Next.js (Vercel Edge/Serverless)
  ├── App Router (페이지 렌더링)
  └── API Routes / Server Actions (데이터 처리)
    ↕ Supabase JS Client
Supabase (PostgreSQL + Realtime)
```

**공유 방식:**
- 첫 접속(`/`) 시 `nanoid`로 고유 `familyId` 생성
- `/<familyId>` 경로로 리다이렉트 (예: `yourapp.vercel.app/abc123xyz`)
- 이 URL을 가족과 공유하면 동일한 가계부에 접근

---

## 데이터 모델

```sql
-- 거래 내역
CREATE TABLE transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount      INTEGER NOT NULL,        -- 원 단위 정수
  category_id UUID REFERENCES categories(id),
  memo        TEXT,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 카테고리
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,           -- hex color
  icon        TEXT NOT NULL,           -- emoji
  is_default  BOOLEAN DEFAULT FALSE
);

-- 예산
CREATE TABLE budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  amount      INTEGER NOT NULL,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  UNIQUE (family_id, category_id, year, month)
);
```

**기본 카테고리 (시드 데이터):**
식비 🍽️, 교통 🚌, 의료 💊, 교육 📚, 쇼핑 🛒, 저축 💰, 기타 📌

---

## 화면 구성

### 레이아웃: 모바일 우선 하단 탭 네비게이션

```
┌─────────────────────────┐
│  상단 헤더 (월 선택)      │
├─────────────────────────┤
│                         │
│       페이지 콘텐츠       │
│                         │
├─────────────────────────┤
│ 🏠홈 │📋내역│🎯예산│📈통계 │
└─────────────────────────┘
```

### 1. 홈 (대시보드)

- 이번 달 수입 / 지출 / 잔액 요약 카드 (3개)
- 예산 전체 진행률 바
- 카테고리별 예산 사용률 목록
- 최근 내역 5건

### 2. 내역

- 월 필터 (이전/다음 버튼)
- 수입/지출 전체 탭 선택
- 날짜순 거래 목록 (카테고리 아이콘, 금액, 메모)
- FAB(Floating Action Button)으로 내역 추가
- 항목 탭하면 수정/삭제

### 3. 예산

- 현재 월 표시
- 카테고리별 예산 설정 카드
  - 설정 금액, 사용 금액, 진행률 바
  - 초과 시 빨간색 강조
- 예산 미설정 카테고리는 "설정" 버튼 표시

### 4. 통계

- 월 선택 드롭다운
- 월별 수입/지출 막대 그래프 (최근 6개월)
- 카테고리별 지출 파이 차트
- 카테고리별 지출 금액 순위 목록

---

## 컴포넌트 구조

```
app/
├── layout.tsx                  # 루트 레이아웃, 하단 탭 네비게이션 포함
├── page.tsx                    # 홈 리다이렉트 (familyId 처리)
├── [familyId]/
│   ├── layout.tsx              # 가족 공간 레이아웃
│   ├── page.tsx                # 대시보드 (홈)
│   ├── transactions/page.tsx   # 내역
│   ├── budgets/page.tsx        # 예산
│   └── stats/page.tsx          # 통계
├── api/
│   └── families/route.ts       # familyId 생성 API
components/
├── layout/
│   ├── BottomNav.tsx
│   └── MonthSelector.tsx
├── dashboard/
│   ├── SummaryCards.tsx
│   ├── BudgetProgress.tsx
│   └── RecentTransactions.tsx
├── transactions/
│   ├── TransactionList.tsx
│   ├── TransactionForm.tsx     # 추가/수정 모달
│   └── TransactionItem.tsx
├── budgets/
│   ├── BudgetCard.tsx
│   └── BudgetForm.tsx
├── stats/
│   ├── MonthlyBarChart.tsx
│   └── CategoryPieChart.tsx
└── ui/
    ├── FAB.tsx
    └── Modal.tsx
lib/
├── supabase.ts                 # Supabase 클라이언트
├── queries.ts                  # DB 쿼리 함수
└── utils.ts                    # 금액 포매팅 등 유틸
```

---

## 오류 처리

- Supabase 연결 오류: 토스트 알림 표시, 재시도 버튼 제공
- 잘못된 `familyId` URL 접근: 새 가계부 생성 안내 페이지로 이동
- 금액 입력 검증: 숫자만 허용, 0 이하 불가
- 예산 초과: UI에서 시각적으로만 표시 (입력 자체는 막지 않음)

---

## 보안 고려사항

- `familyId`는 `nanoid`(21자리 URL-safe) 사용으로 무작위 추측 방지
- Supabase Row Level Security(RLS) 비활성화 (인증 없는 공유 방식 특성상)
- 향후 확장: 간단한 비밀번호 보호 추가 가능 (현재 스코프 외)

---

## 배포 계획

1. GitHub 저장소 생성
2. Supabase 프로젝트 생성 → 스키마 적용 → 환경변수 복사
3. Vercel에 GitHub 연동 → 환경변수 설정 → 배포
4. 배포된 URL을 가족과 공유
