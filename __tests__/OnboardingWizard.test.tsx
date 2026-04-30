import { render, screen, waitFor } from '@testing-library/react'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'user1', name: '테스트', role: '엄마', isMaster: false } },
    status: 'authenticated',
  }),
}))

jest.mock('@/lib/queries', () => ({
  updateSettings: jest.fn().mockResolvedValue(undefined),
  createAsset: jest.fn().mockResolvedValue({}),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}))

describe('OnboardingWizard', () => {
  it('자산 현황 등록 단계를 표시한다', async () => {
    render(<OnboardingWizard />)
    await waitFor(() => expect(screen.getByText('자산 현황 등록')).toBeInTheDocument())
  })
})
