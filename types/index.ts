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
