import { render, screen, waitFor } from '@testing-library/react'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

jest.mock('@/lib/queries', () => ({
  updateFamily: jest.fn().mockResolvedValue(undefined),
  createAsset: jest.fn().mockResolvedValue({}),
  getOrCreateFamily: jest.fn().mockResolvedValue({ monthly_income: 0, onboarding_completed: false }),
  getFixedItems: jest.fn().mockResolvedValue([]),
  getAssetsWithBalance: jest.fn().mockResolvedValue([]),
  getBudgetsWithUsage: jest.fn().mockResolvedValue([]),
  getCategories: jest.fn().mockResolvedValue([]),
  seedDefaultCategories: jest.fn().mockResolvedValue(undefined),
  deleteFixedItem: jest.fn().mockResolvedValue(undefined),
  createFixedItem: jest.fn().mockResolvedValue({}),
  updateAsset: jest.fn().mockResolvedValue({}),
  upsertBudget: jest.fn().mockResolvedValue({}),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}))

jest.mock('@/lib/monthStore', () => ({
  useMonthStore: () => ({ current: { year: 2026, month: 4 } }),
}))

describe('OnboardingWizard', () => {
  it('DB에 저장된 데이터가 없으면 Step 1을 표시한다', async () => {
    render(<OnboardingWizard familyId="fam1" />)
    await waitFor(() => expect(screen.getByText('Step 1 / 4')).toBeInTheDocument())
  })
})
