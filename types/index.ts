export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  family_id: string
  name: string
  color: string   // hex, 예: '#ef4444'
  icon: string    // emoji, 예: '🍽️'
  is_default: boolean
  created_at: string
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
