"use client";

import { deDE } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

type ClerkProviderClientProps = {
	children: ReactNode;
};

export function ClerkProviderClient({ children }: ClerkProviderClientProps) {
	return (
		<ClerkProvider
			localization={deDE}
			afterSignOutUrl="/"
			signInUrl="/sign-in"
			signUpUrl="/sign-up"
		>
			{children}
		</ClerkProvider>
	);
}
