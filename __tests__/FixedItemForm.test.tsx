import { render, screen, fireEvent } from '@testing-library/react'
import FixedItemForm from '@/components/fixed-items/FixedItemForm'
import type { FixedItem } from '@/types'

const mockItem: FixedItem = {
  id: '1',
  family_id: 'fam1',
  name: '유튜브 구독료',
  amount: 14900,
  group_name: '구독/서비스',
  billing_day: 1,
  payment_method: '신용카드',
  memo: '가족 플랜',
  is_active: true,
  created_at: '2026-01-01',
}

describe('FixedItemForm', () => {
  it('신규 추가 시 빈 폼을 렌더링하고 삭제 버튼이 없다', () => {
    render(
      <FixedItemForm initial={null} onSubmit={jest.fn()} onCancel={jest.fn()} onDelete={undefined} />
    )
    expect(screen.getByPlaceholderText('항목 이름')).toHaveValue('')
    expect(screen.queryByText('삭제')).not.toBeInTheDocument()
  })

  it('수정 시 기존 값이 채워지고 삭제 버튼이 있다', () => {
    render(
      <FixedItemForm initial={mockItem} onSubmit={jest.fn()} onCancel={jest.fn()} onDelete={jest.fn()} />
    )
    expect(screen.getByPlaceholderText('항목 이름')).toHaveValue('유튜브 구독료')
    expect(screen.getByText('삭제')).toBeInTheDocument()
  })

  it('이름이 비어 있으면 onSubmit이 호출되지 않는다', () => {
    const onSubmit = jest.fn()
    render(
      <FixedItemForm initial={null} onSubmit={onSubmit} onCancel={jest.fn()} onDelete={undefined} />
    )
    fireEvent.change(screen.getByPlaceholderText('금액 (원)'), { target: { value: '10000' } })
    fireEvent.click(screen.getByText('저장'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    const onCancel = jest.fn()
    render(
      <FixedItemForm initial={null} onSubmit={jest.fn()} onCancel={onCancel} onDelete={undefined} />
    )
    fireEvent.click(screen.getByText('취소'))
    expect(onCancel).toHaveBeenCalled()
  })
})
