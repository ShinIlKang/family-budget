import { render, screen, fireEvent } from '@testing-library/react'
import AssetForm from '@/components/assets/AssetForm'
import type { Asset, FixedItem } from '@/types'

const mockFixedItems: FixedItem[] = [
  {
    id: 'fi1',
    family_id: 'fam1',
    name: '적금',
    amount: 200000,
    group_name: '저축/투자',
    billing_day: 25,
    payment_method: null,
    memo: null,
    is_active: true,
    created_at: '2026-01-01',
  },
]

describe('AssetForm', () => {
  it('빈 폼을 렌더링한다', () => {
    render(
      <AssetForm
        initial={null}
        fixedItems={mockFixedItems}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        onDelete={undefined}
      />
    )
    expect(screen.getByPlaceholderText('항목 이름')).toBeInTheDocument()
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    const onCancel = jest.fn()
    render(
      <AssetForm
        initial={null}
        fixedItems={[]}
        onSubmit={jest.fn()}
        onCancel={onCancel}
        onDelete={undefined}
      />
    )
    fireEvent.click(screen.getByText('취소'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('initial이 있으면 수정 버튼을 표시한다', () => {
    const asset: Asset = {
      id: '1',
      family_id: 'fam1',
      name: '국내주식',
      category: '투자',
      initial_balance: 5000000,
      linked_fixed_item_id: null,
      created_at: '2026-01-01',
    }
    render(
      <AssetForm
        initial={asset}
        fixedItems={[]}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText('수정')).toBeInTheDocument()
  })
})
