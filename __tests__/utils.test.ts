import { formatAmount, formatDate, getMonthRange, addMonths } from '@/lib/utils'

describe('formatAmount', () => {
  it('양수를 원화 형식으로 포매팅한다', () => {
    expect(formatAmount(1234567)).toBe('1,234,567')
  })
  it('0을 포매팅한다', () => {
    expect(formatAmount(0)).toBe('0')
  })
})

describe('formatDate', () => {
  it('YYYY-MM-DD를 M월 D일 형식으로 변환한다', () => {
    expect(formatDate('2026-04-27')).toBe('4월 27일')
  })
})

describe('getMonthRange', () => {
  it('해당 월의 시작일과 종료일을 반환한다', () => {
    expect(getMonthRange(2026, 4)).toEqual({ start: '2026-04-01', end: '2026-04-30' })
  })
  it('2월 윤년을 처리한다', () => {
    expect(getMonthRange(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' })
  })
})

describe('addMonths', () => {
  it('월을 더한다', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
  })
  it('월을 뺀다', () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })
})
