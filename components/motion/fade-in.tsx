"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const fadeUp = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
};

const stagger = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.08 } },
};

const defaultViewport = { once: true, margin: "-60px" } as const;
const defaultTransition = {
	duration: 0.5,
	ease: [0.25, 0.1, 0.25, 1] as const,
};

export function FadeIn({
	children,
	className,
	delay = 0,
}: {
	children: ReactNode;
	className?: string;
	delay?: number;
}) {
	return (
		<motion.div
			className={className}
			initial="hidden"
			whileInView="visible"
			viewport={defaultViewport}
			variants={fadeUp}
			transition={{ ...defaultTransition, delay }}
		>
			{children}
		</motion.div>
	);
}

export function StaggerContainer({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			className={className}
			initial="hidden"
			whileInView="visible"
			viewport={defaultViewport}
			variants={stagger}
		>
			{children}
		</motion.div>
	);
}

export function StaggerItem({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			className={className}
			variants={fadeUp}
			transition={defaultTransition}
		>
			{children}
		</motion.div>
	);
}
