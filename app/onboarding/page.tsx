import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <div className="bg-indigo-600 text-white px-4 py-5">
        <p className="text-xs text-indigo-200 mb-1">가족 가계부 설정</p>
        <h1 className="text-xl font-bold">처음 시작하기</h1>
        <p className="text-sm text-indigo-200 mt-1">기본 정보를 입력하면 앱을 사용할 수 있어요</p>
      </div>
      <div className="flex-1 flex flex-col">
        <OnboardingWizard />
      </div>
    </div>
  )
}
