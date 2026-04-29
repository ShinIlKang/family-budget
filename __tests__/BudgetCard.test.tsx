import { render, screen } from '@testing-library/react'
import BudgetCard from '@/components/budgets/BudgetCard'
import type { BudgetWithUsage } from '@/types'

const mockBudget: BudgetWithUsage = {
  id: '1',
  family_id: 'fam1',
  category_id: 'cat1',
  amount: 300000,
  year: 2026,
  month: 4,
  used: 150000,
  category: { id: 'cat1', family_id: 'fam1', name: '식비', color: '#ef4444', icon: '🍽️', is_default: true, created_at: '2026-01-01' },
}

describe('BudgetCard', () => {
  it('카테고리명과 예산 금액을 렌더링한다', () => {
    render(<BudgetCard budget={mockBudget} onEdit={jest.fn()} />)
    expect(screen.getByText('식비')).toBeInTheDocument()
    expect(screen.getByText(/300,000/)).toBeInTheDocument()
  })

  it('사용 금액과 진행률을 표시한다', () => {
    render(<BudgetCard budget={mockBudget} onEdit={jest.fn()} />)
    expect(screen.getByText(/150,000/)).toBeInTheDocument()
  })

  it('예산 초과 시 빨간색 진행 바를 표시한다', () => {
    const over = { ...mockBudget, used: 350000 }
    render(<BudgetCard budget={over} onEdit={jest.fn()} />)
    const bar = document.querySelector('.bg-red-500')
    expect(bar).toBeInTheDocument()
  })
})
