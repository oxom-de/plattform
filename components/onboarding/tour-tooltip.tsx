"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboarding } from "./onboarding-provider";

interface TooltipPosition {
	top: number;
	left: number;
}

function getTooltipPosition(
	targetRect: DOMRect,
	tooltipWidth: number,
	tooltipHeight: number,
	preferred: "top" | "bottom" | "left" | "right" = "right",
): TooltipPosition {
	const gap = 12;
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	const candidates = {
		right: {
			top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
			left: targetRect.right + gap,
		},
		left: {
			top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
			left: targetRect.left - tooltipWidth - gap,
		},
		bottom: {
			top: targetRect.bottom + gap,
			left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
		},
		top: {
			top: targetRect.top - tooltipHeight - gap,
			left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
		},
	};

	const candidate = candidates[preferred];
	return {
		top: Math.max(
			8,
			Math.min(candidate.top, viewportHeight - tooltipHeight - 8),
		),
		left: Math.max(
			8,
			Math.min(candidate.left, viewportWidth - tooltipWidth - 8),
		),
	};
}

export function TourTooltip() {
	const {
		isActive,
		currentStep,
		currentIndex,
		totalSteps,
		next,
		skip,
		isCompleting,
	} = useOnboarding();
	const [tooltipPosition, setTooltipPosition] =
		useState<TooltipPosition | null>(null);
	const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);

	const isTooltipStep = isActive && currentStep && currentStep.id !== "welcome";

	useEffect(() => {
		if (!isTooltipStep || !currentStep.targetSelector) {
			setTooltipPosition(null);
			setHighlightRect(null);
			return;
		}

		const updatePosition = () => {
			const target = document.querySelector(currentStep.targetSelector);
			if (!target) {
				setTooltipPosition(null);
				setHighlightRect(null);
				return;
			}

			const targetRect = target.getBoundingClientRect();
			const tooltipRect = tooltipRef.current?.getBoundingClientRect();
			const width = tooltipRect?.width || 288;
			const height = tooltipRect?.height || 180;

			setHighlightRect(targetRect);
			setTooltipPosition(
				getTooltipPosition(targetRect, width, height, currentStep.position),
			);
		};

		updatePosition();
		const resizeObserver = new ResizeObserver(updatePosition);
		resizeObserver.observe(document.body);
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [isTooltipStep, currentStep]);

	if (!isTooltipStep) return null;

	const isLastStep = currentIndex === totalSteps - 1;

	return createPortal(
		<>
			<div className="pointer-events-none fixed inset-0 z-50">
				<div className="absolute inset-0 bg-black/25" />
				{highlightRect ? (
					<div
						className="absolute rounded-lg bg-transparent ring-2 ring-primary ring-offset-2"
						style={{
							top: highlightRect.top - 4,
							left: highlightRect.left - 4,
							width: highlightRect.width + 8,
							height: highlightRect.height + 8,
							boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
						}}
					/>
				) : null}
			</div>

			{tooltipPosition ? (
				<div
					ref={tooltipRef}
					className="pointer-events-auto fixed z-[60] flex w-72 flex-col gap-3 rounded-2xl border bg-background p-4 shadow-xl"
					style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
				>
					<div className="flex items-center justify-between">
						<div className="flex gap-1">
							{Array.from({ length: totalSteps - 1 }).map((_, index) => (
								<span
									key={index}
									className={cn(
										"h-1 w-4 rounded-full transition-colors",
										index === currentIndex - 1 ? "bg-primary" : "bg-muted",
									)}
								/>
							))}
						</div>
						<button
							type="button"
							onClick={skip}
							className="text-xs text-muted-foreground transition-colors hover:text-foreground"
							disabled={isCompleting}
						>
							Überspringen
						</button>
					</div>

					<div>
						<p className="text-sm font-medium">{currentStep.title}</p>
						<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
							{currentStep.description}
						</p>
					</div>

					<Button
						size="sm"
						className="w-full rounded-full"
						onClick={next}
						disabled={isCompleting}
					>
						{isLastStep ? "Tour abschließen" : "Weiter"}
					</Button>
				</div>
			) : null}
		</>,
		document.body,
	);
}
