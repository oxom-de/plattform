import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { type ReactNode, Suspense } from "react";

import { StaffToolbar } from "../components/staff-toolbar";

import "./globals.css";

import { Analytics } from "@vercel/analytics/next";
import { ClerkProviderClient } from "@/components/clerk-provider-client";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || "plattform";

export const metadata: Metadata = {
	title: brandName,
	robots: { index: false, follow: false },
};

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProviderClient>
			<html lang="de" suppressHydrationWarning>
				<body
					className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
				>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem
						disableTransitionOnChange
					>
						<NuqsAdapter>
								{children}
								<Suspense fallback={null}>
									<StaffToolbar />
								</Suspense>
								<a
									rel="me"
									href="https://social.oxom.de/@leon"
									className="hidden"
								>
									Mastodon
								</a>
						</NuqsAdapter>
					</ThemeProvider>

					<Analytics />
					<Toaster />
				</body>
			</html>
		</ClerkProviderClient>
	);
}
