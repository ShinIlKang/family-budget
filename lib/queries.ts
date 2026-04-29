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
