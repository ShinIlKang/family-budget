import { render, screen } from '@testing-library/react'
import SummaryCards from '@/components/dashboard/SummaryCards'

describe('SummaryCards', () => {
  it('수입, 지출, 잔액을 표시한다', () => {
    render(<SummaryCards income={3200000} expense={1850000} />)
    expect(screen.getByText(/3,200,000/)).toBeInTheDocument()
    expect(screen.getByText(/1,850,000/)).toBeInTheDocument()
    expect(screen.getByText(/1,350,000/)).toBeInTheDocument()
  })
})
