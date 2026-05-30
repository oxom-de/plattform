"use client";

import { BRAND_NAME } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteFooter() {
	return (
		<footer className="border-t border-border/60 py-6 px-6">
			<div className="mx-auto flex w-full max-w-6xl items-center justify-between">
				<p className="font-mono text-xs tracking-wider text-muted-foreground">
					© {new Date().getFullYear()} {BRAND_NAME}
				</p>
				<ThemeToggle />
			</div>
		</footer>
	);
}
