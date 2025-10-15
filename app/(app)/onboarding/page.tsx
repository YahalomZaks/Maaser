import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <section className="content-page">
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-3xl">
          <OnboardingWizard />
        </div>
      </div>
    </section>
  );
}
