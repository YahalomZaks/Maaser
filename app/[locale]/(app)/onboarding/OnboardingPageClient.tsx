'use client';

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { RequireAuth } from "@/components/shared/RequireAuth";

const OnboardingPageClient = () => {
	return (
		<RequireAuth>
			<section className="content-page onboarding p-0">
				<OnboardingWizard />
			</section>
		</RequireAuth>
	);
};

export default OnboardingPageClient;
