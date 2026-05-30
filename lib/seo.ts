import type { Metadata } from "next";

const FALLBACK_SITE_URL = "https://www.oxom.de";

function normalizeBaseUrl(raw: string | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;

	const withProtocol =
		value.startsWith("http://") || value.startsWith("https://")
			? value
			: `https://${value}`;

	try {
		const parsed = new URL(withProtocol);
		return parsed.toString().replace(/\/$/, "");
	} catch {
		return null;
	}
}

export function getSiteUrl(): string {
	return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ?? FALLBACK_SITE_URL;
}

export function absoluteUrl(path: string = "/"): string {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return new URL(normalizedPath, getSiteUrl()).toString();
}

export const NO_INDEX_ROBOTS: Metadata["robots"] = {
	index: false,
	follow: false,
	nocache: true,
	googleBot: {
		index: false,
		follow: false,
		noimageindex: true,
	},
};
