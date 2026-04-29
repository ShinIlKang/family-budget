import { render, screen, fireEvent } from '@testing-library/react'
import FixedItemRow from '@/components/fixed-items/FixedItemRow'
import type { FixedItem } from '@/types'

const mockItem: FixedItem = {
  id: '1',
  family_id: 'fam1',
  name: '유튜브 구독료',
  amount: 14900,
  group_name: '구독/서비스',
  billing_day: 1,
  memo: null,
  is_active: true,
  created_at: '2026-01-01',
}

describe('FixedItemRow', () => {
  it('항목 이름과 금액을 표시한다', () => {
    render(<FixedItemRow item={mockItem} onEdit={jest.fn()} />)
    expect(screen.getByText('유튜브 구독료')).toBeInTheDocument()
    expect(screen.getByText(/14,900/)).toBeInTheDocument()
  })

  it('납부일이 있으면 표시한다', () => {
    render(<FixedItemRow item={mockItem} onEdit={jest.fn()} />)
    expect(screen.getByText(/매월 1일/)).toBeInTheDocument()
  })

  it('납부일이 없으면 납부일 텍스트가 없다', () => {
    render(<FixedItemRow item={{ ...mockItem, billing_day: null }} onEdit={jest.fn()} />)
    expect(screen.queryByText(/매월/)).not.toBeInTheDocument()
  })

  it('비활성 항목은 opacity-40 클래스를 가진다', () => {
    const { container } = render(
      <FixedItemRow item={{ ...mockItem, is_active: false }} onEdit={jest.fn()} />
    )
    expect(container.firstChild).toHaveClass('opacity-40')
  })

  it('클릭하면 onEdit이 호출된다', () => {
    const onEdit = jest.fn()
    render(<FixedItemRow item={mockItem} onEdit={onEdit} />)
    fireEvent.click(screen.getByText('유튜브 구독료'))
    expect(onEdit).toHaveBeenCalledWith(mockItem)
  })
})
