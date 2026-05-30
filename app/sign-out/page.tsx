"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignOutPage() {
	const { signOut } = useClerk();

	useEffect(() => {
		signOut();
	}, [signOut]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background text-foreground">
			<p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
				Abmelden…
			</p>
		</div>
	);
}
