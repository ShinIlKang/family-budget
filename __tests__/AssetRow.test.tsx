import { render, screen, fireEvent } from '@testing-library/react'
import AssetRow from '@/components/assets/AssetRow'
import type { Asset } from '@/types'

const mockAsset: Asset = {
  id: '1',
  name: '적금 A은행',
  category: '금융',
  initial_balance: 10000000,
  linked_fixed_item_id: 'fi1',
  created_by: 'user1',
  updated_by: null,
  created_at: '2026-01-01',
  current_balance: 12400000,
  linked_fixed_item_name: '적금',
  linked_billing_day: 25,
}

describe('AssetRow', () => {
  it('항목 이름과 잔액을 표시한다', () => {
    render(<AssetRow asset={mockAsset} onEdit={jest.fn()} />)
    expect(screen.getByText('적금 A은행')).toBeInTheDocument()
    expect(screen.getByText(/12,400,000/)).toBeInTheDocument()
  })

  it('연결 고정비 납부일을 표시한다', () => {
    render(<AssetRow asset={mockAsset} onEdit={jest.fn()} />)
    expect(screen.getByText(/매월 25일/)).toBeInTheDocument()
  })

  it('연결 고정비가 없으면 납부일을 표시하지 않는다', () => {
    render(<AssetRow asset={{ ...mockAsset, linked_fixed_item_id: null, linked_billing_day: null }} onEdit={jest.fn()} />)
    expect(screen.queryByText(/매월/)).not.toBeInTheDocument()
  })

  it('클릭하면 onEdit이 호출된다', () => {
    const onEdit = jest.fn()
    render(<AssetRow asset={mockAsset} onEdit={onEdit} />)
    fireEvent.click(screen.getByText('적금 A은행'))
    expect(onEdit).toHaveBeenCalledWith(mockAsset)
  })
})
