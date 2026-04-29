# 고정비 항목 관리 기능 설계

## 목적

매달 정기적으로 지출되는 고정비(구독료, 보험료, 공과금, 임대료, 저축 등)를 별도로 등록·관리하여 월 고정 지출 합계를 한눈에 파악할 수 있게 한다.

## 선택된 설계 방향

- 대시보드 홈에 고정비 요약 카드 추가 → 카드 탭 시 상세 관리 화면으로 이동
- 상세 화면은 그룹별 상단 탭 필터 방식
- 항목 추가/수정은 모달 폼 (이름, 금액, 그룹, 납부일, 메모, 활성토글)

## 데이터 모델

### `fixed_items` 테이블 (신규)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | UUID | PK | |
| family_id | TEXT | NOT NULL | |
| name | TEXT | NOT NULL | 항목 이름 |
| amount | INTEGER | NOT NULL, > 0 | 월 금액 (원) |
| group_name | TEXT | NOT NULL | 아래 그룹 중 하나 |
| billing_day | INTEGER | 1–31, nullable | 납부일 |
| memo | TEXT | nullable | 메모 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 비활성 시 집계 제외 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### 그룹 목록 (고정값)

- 구독/서비스
- 보험/금융
- 공과금
- 통신/교통
- 주거
- 교육
- 저축/투자

## 화면 구성

### 1. 대시보드 홈 (`/[familyId]`)

- `SummaryCards` 아래에 고정비 요약 카드 추가
- 표시: "이번달 고정비 N,NNN,NNN원" (활성 항목 합계)
- 카드 탭 → `/{familyId}/fixed-items` 로 이동

### 2. 고정비 관리 화면 (`/[familyId]/fixed-items`)

- 상단 탭: 전체 / 구독·서비스 / 보험·금융 / 공과금 / 통신·교통 / 주거 / 교육 / 저축·투자
- 항목 행: 이름, 금액, 납부일(없으면 미표시), 비활성 시 opacity-40
- 하단 고정: 활성 항목 총합
- 우하단 FAB(+): 항목 추가 모달
- 항목 탭: 수정 모달 오픈
- 항목 길게 누르기: 삭제 확인 후 삭제

### 3. 항목 추가/수정 모달

필드:
- 항목 이름 (필수, text)
- 금액 (필수, number, 천단위 콤마 자동 표시)
- 그룹 선택 (필수, select)
- 납부일 1–31일 (선택, select)
- 메모 (선택, textarea)
- 활성 토글 (기본 ON)

## 타입 정의

```typescript
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

export type FixedItemGroup =
  | '구독/서비스'
  | '보험/금융'
  | '공과금'
  | '통신/교통'
  | '주거'
  | '교육'
  | '저축/투자'

export const FIXED_ITEM_GROUPS: FixedItemGroup[] = [
  '구독/서비스', '보험/금융', '공과금', '통신/교통', '주거', '교육', '저축/투자',
]
```

## 비기능 요건

- 고정비 항목은 월별로 분리되지 않음 (항상 동일 목록, 금액 변경 시 직접 수정)
- 비활성 항목은 집계에서 제외되지만 목록에는 표시 (흐리게)
- 삭제는 복구 불가 → 길게 누르기 + 확인 다이얼로그로 실수 방지
