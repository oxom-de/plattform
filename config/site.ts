// This file contains the configuration for the site.

export const siteConfig = {
	routing: {
		publicPathPrefixes: [
			"/",
			"/about",
			"/sign-in",
			"/sign-up",
			"/user-profile",
			"/unauthorized",
			"/switcher",
			"/dashboard",
			"/_tenant-not-found",
			"/security",
			"/.well-known",
			"/community",
			"/sponsor",
			"/deals",
			"/pricing",
			"/features",
			"/app",
			"/sign-out",
			"/partner",
			"/upload",
			"/update",
			"/invite",
			"/onboarding",
			"/api",
			"/qr",
			"/safety",
			"/en",
			"/nl",
		] as const,
	},

	version: {
		number: "0.1.0",
		isBeta: false,
		isAlpha: true,
		stable: false,
		isDEV: true,
	},
};

export type SiteConfig = typeof siteConfig;
