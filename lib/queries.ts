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
