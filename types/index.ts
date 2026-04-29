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
