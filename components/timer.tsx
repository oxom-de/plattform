"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
}

interface CountdownTimerProps {
	targetDate: string;
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
	const [timeLeft, setTimeLeft] = useState<TimeLeft>({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
	});

	useEffect(() => {
		const calculateTimeLeft = () => {
			const difference = +new Date(targetDate) - +new Date();

			if (difference > 0) {
				setTimeLeft({
					days: Math.floor(difference / (1000 * 60 * 60 * 24)),
					hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
					minutes: Math.floor((difference / 1000 / 60) % 60),
					seconds: Math.floor((difference / 1000) % 60),
				});
			}
		};

		calculateTimeLeft();
		const timer = setInterval(calculateTimeLeft, 1000);

		return () => clearInterval(timer);
	}, [targetDate]);

	const timeUnits = [
		{ value: timeLeft.days, label: "TAGE" },
		{ value: timeLeft.hours, label: "STUNDEN" },
		{ value: timeLeft.minutes, label: "MINUTEN" },
		{ value: timeLeft.seconds, label: "SEKUNDEN" },
	];

	return (
		<div className="flex flex-col items-center gap-12 px-4">
			<div className="flex flex-col items-center gap-3">
				<h1 className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
					// 2626 //
				</h1>
				<div className="h-px w-12 bg-border" />
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
				{timeUnits.map((unit, index) => (
					<div key={unit.label} className="flex flex-col items-center gap-3">
						<div className="relative">
							<span className="text-6xl md:text-7xl font-light tabular-nums text-foreground">
								{String(unit.value).padStart(2, "0")}
							</span>
						</div>
						<span className="text-xs font-medium tracking-[0.15em] text-muted-foreground">
							{unit.label}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
