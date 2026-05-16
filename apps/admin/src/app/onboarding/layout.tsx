export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Thin indigo progress bar at the very top — width controlled by child via CSS var */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-indigo-100 z-50">
        <div
          id="onboarding-progress-bar"
          className="h-full bg-indigo-600 transition-all duration-500"
          style={{ width: '20%' }}
        />
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
