import { supabase } from '@/lib/supabase'
import type { Transaction, Category, Budget, MonthYear, BudgetWithUsage, FixedItem, Family, Asset, AssetCategory } from '@/types'
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


// ─── 고정비 항목 ────────────────────────────────────────────

export async function getFixedItems(familyId: string): Promise<FixedItem[]> {
  const { data, error } = await supabase
    .from('fixed_items')
    .select('*')
    .eq('family_id', familyId)
    .order('group_name')
    .order('name')
  if (error) throw error
  return data
}

export async function createFixedItem(
  familyId: string,
  input: Omit<FixedItem, 'id' | 'family_id' | 'created_at'>
): Promise<FixedItem> {
  const { data, error } = await supabase
    .from('fixed_items')
    .insert({ family_id: familyId, ...input })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFixedItem(
  id: string,
  input: Omit<FixedItem, 'id' | 'family_id' | 'created_at'>
): Promise<FixedItem> {
  const { data, error } = await supabase
    .from('fixed_items')
    .update(input)
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

export async function getFixedItemsSummary(
  familyId: string
): Promise<{ total: number; activeCount: number }> {
  const { data, error } = await supabase
    .from('fixed_items')
    .select('amount')
    .eq('family_id', familyId)
    .eq('is_active', true)
  if (error) throw error
  return {
    total: (data ?? []).reduce((s, i) => s + i.amount, 0),
    activeCount: (data ?? []).length,
  }
}

// ─── 가족 설정 ───────────────────────────────────────────────

export async function getOrCreateFamily(familyId: string): Promise<Family> {
  const { data: existing, error: sErr } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .maybeSingle()
  if (sErr) throw sErr
  if (existing) return existing

  const { data, error } = await supabase
    .from('families')
    .insert({ id: familyId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFamily(
  familyId: string,
  data: Partial<Pick<Family, 'monthly_income' | 'onboarding_completed'>>
): Promise<void> {
  const { error } = await supabase.from('families').update(data).eq('id', familyId)
  if (error) throw error
}

// ─── 자산 ────────────────────────────────────────────────────

export async function getAssetsWithBalance(familyId: string): Promise<Asset[]> {
  const { data: assets, error: aErr } = await supabase
    .from('assets')
    .select('*, fixed_item:fixed_items!linked_fixed_item_id(name, billing_day)')
    .eq('family_id', familyId)
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
      family_id: a.family_id,
      name: a.name,
      category: a.category as AssetCategory,
      initial_balance: a.initial_balance,
      linked_fixed_item_id: a.linked_fixed_item_id,
      created_at: a.created_at,
      current_balance: a.initial_balance + (sums.get(a.id) ?? 0),
      linked_fixed_item_name: fi?.name ?? null,
      linked_billing_day: fi?.billing_day ?? null,
    }
  })
}

export async function createAsset(
  familyId: string,
  input: Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .insert({ family_id: familyId, ...input })
    .select()
    .single()
  if (error) throw error
  return { ...data, category: data.category as AssetCategory }
}

export async function updateAsset(
  id: string,
  input: Partial<Pick<Asset, 'name' | 'category' | 'initial_balance' | 'linked_fixed_item_id'>>
): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .update(input)
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

export async function getAssetsSummary(
  familyId: string
): Promise<{ total: number; byCategory: Record<AssetCategory, number> }> {
  const assets = await getAssetsWithBalance(familyId)
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

export async function autoAccumulateAssets(familyId: string): Promise<void> {
  const { data: assets, error: aErr } = await supabase
    .from('assets')
    .select('id, initial_balance, created_at, linked_fixed_item_id, fixed_item:fixed_items!linked_fixed_item_id(billing_day, amount)')
    .eq('family_id', familyId)
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
    }))
    const { error: uErr } = await supabase
      .from('asset_ledger')
      .upsert(rows, { onConflict: 'asset_id,recorded_month', ignoreDuplicates: true })
    if (uErr) throw uErr
  }
}

// recorded_month를 삽입하지 않아 NULL로 저장 — PostgreSQL UNIQUE는 NULL을 별개 값으로 취급하므로 수동 항목은 월별 중복 제한 없이 복수 등록 가능
export async function addManualLedgerEntry(
  assetId: string,
  amount: number,
  sourceId: string,
  memo?: string
): Promise<void> {
  const { error } = await supabase.from('asset_ledger').insert({
    asset_id: assetId,
    amount,
    entry_type: 'manual',
    source_type: 'transaction',
    source_id: sourceId,
    memo: memo ?? null,
  })
  if (error) throw error
}
