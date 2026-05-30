"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { TOUR_STEPS, useOnboarding } from "./onboarding-provider";

export function WelcomeModal() {
	const { isActive, currentStep, next, skip, isCompleting } = useOnboarding();

	if (!isActive || currentStep?.id !== "welcome") return null;

	return (
		<Dialog open>
			<DialogContent
				className="max-w-sm gap-0 overflow-hidden p-0"
				onInteractOutside={(event) => event.preventDefault()}
				showCloseButton={false}
			>
				<div className="flex flex-col items-center gap-3 bg-primary/5 px-6 pb-6 pt-8 text-center">
					<div className="text-4xl">👋</div>
					<div>
						<DialogTitle className="text-base font-semibold">
							{currentStep.title}
						</DialogTitle>
						<DialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
							{currentStep.description}
						</DialogDescription>
					</div>
				</div>

				<div className="flex flex-col gap-2 px-6 py-4">
					{TOUR_STEPS.filter((step) => step.id !== "welcome").map(
						(step, index) => (
							<div key={step.id} className="flex items-center gap-3 text-sm">
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
									{index + 1}
								</span>
								<span className="text-muted-foreground">{step.title}</span>
							</div>
						),
					)}
				</div>

				<div className="flex gap-2 px-6 pb-6">
					<Button
						variant="outline"
						className="flex-1 rounded-full"
						onClick={skip}
						disabled={isCompleting}
					>
						Überspringen
					</Button>
					<Button
						className="flex-1 rounded-full"
						onClick={next}
						disabled={isCompleting}
					>
						Los geht&apos;s
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
