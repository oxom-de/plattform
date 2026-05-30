"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { BRAND_NAME } from "@/lib/brand";

export type TourStepId = "welcome" | "drive" | "notes" | "docs";

export interface TourStep {
	id: TourStepId;
	title: string;
	description: string;
	targetSelector?: string;
	position?: "top" | "bottom" | "left" | "right";
}

export const TOUR_STEPS: TourStep[] = [
	{
		id: "welcome",
		title: `Willkommen bei ${BRAND_NAME}`,
		description:
			`${BRAND_NAME} ist dein Workspace für Dateien, Notizen, Dokumente und Links. Wir zeigen dir kurz die wichtigsten Bereiche.`,
	},
	{
		id: "drive",
		title: "Drive",
		description: "Lade Dateien hoch und teile Assets mit deinem Team.",
		targetSelector: "[data-tour='drive']",
		position: "right",
	},
	{
		id: "notes",
		title: "Notes",
		description: "Halte Ideen, Notizen und Content-Pläne direkt im Workspace fest.",
		targetSelector: "[data-tour='notes']",
		position: "right",
	},
	{
		id: "docs",
		title: "Docs",
		description: "Skripte, Briefings und Dokumente an einem Ort.",
		targetSelector: "[data-tour='docs']",
		position: "right",
	},
];

interface OnboardingContextValue {
	isActive: boolean;
	currentStep: TourStep | null;
	currentIndex: number;
	totalSteps: number;
	next: () => void;
	skip: () => void;
	isCompleting: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
	const context = useContext(OnboardingContext);
	if (!context)
		throw new Error("useOnboarding must be used within OnboardingProvider");
	return context;
}

interface OnboardingProviderProps {
	children: ReactNode;
	needsOnboarding: boolean;
	workspaceId: string;
}

export function OnboardingProvider({
	children,
	needsOnboarding,
	workspaceId,
}: OnboardingProviderProps) {
	const [isActive, setIsActive] = useState(false);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isCompleting, setIsCompleting] = useState(false);

	useEffect(() => {
		if (!needsOnboarding) return;
		const timer = setTimeout(() => setIsActive(true), 800);
		return () => clearTimeout(timer);
	}, [needsOnboarding]);

	const complete = useCallback(async () => {
		setIsCompleting(true);
		try {
			await fetch("/api/onboarding/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId }),
			});
		} catch {
			// non-blocking
		} finally {
			setIsActive(false);
			setIsCompleting(false);
		}
	}, [workspaceId]);

	const next = useCallback(() => {
		setCurrentIndex((index) => {
			if (index >= TOUR_STEPS.length - 1) {
				void complete();
				return index;
			}
			return index + 1;
		});
	}, [complete]);

	const skip = useCallback(() => {
		void complete();
	}, [complete]);

	const currentStep = isActive ? (TOUR_STEPS[currentIndex] ?? null) : null;

	return (
		<OnboardingContext.Provider
			value={{
				isActive,
				currentStep,
				currentIndex,
				totalSteps: TOUR_STEPS.length,
				next,
				skip,
				isCompleting,
			}}
		>
			{children}
		</OnboardingContext.Provider>
	);
}
