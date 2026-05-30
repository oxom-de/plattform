"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

export type ActivePage = "home" | string;

export interface SiteHeaderProps {
	activePage?: ActivePage;
}

export function SiteHeader(_props: SiteHeaderProps = {}) {
	return (
		<header className="flex h-14 items-center justify-between border-b px-6">
			<Link href="/" className="font-semibold tracking-tight">
				{BRAND_NAME}
			</Link>
			<nav className="flex items-center gap-2">
				<Button asChild variant="ghost" size="sm">
					<Link href="/sign-in">Sign in</Link>
				</Button>
				<Button asChild size="sm">
					<Link href="/sign-up">Get started</Link>
				</Button>
			</nav>
		</header>
	);
}
