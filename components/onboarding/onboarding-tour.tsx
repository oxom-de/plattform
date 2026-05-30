"use client";

import { TourTooltip } from "./tour-tooltip";
import { WelcomeModal } from "./welcome-modal";

export function OnboardingTour() {
	return (
		<>
			<WelcomeModal />
			<TourTooltip />
		</>
	);
}
