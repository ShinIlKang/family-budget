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

// 급여 기준 월: N월 24일 ~ (N+1)월 23일
describe('getMonthRange', () => {
  it('급여 기준 월 범위를 반환한다', () => {
    expect(getMonthRange(2026, 4)).toEqual({ start: '2026-04-24', end: '2026-05-23' })
  })
  it('12월은 다음 해 1월 23일까지', () => {
    expect(getMonthRange(2025, 12)).toEqual({ start: '2025-12-24', end: '2026-01-23' })
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
