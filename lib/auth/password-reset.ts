import "server-only";

export const FORCE_PASSWORD_CHANGE_METADATA_KEY = "oxomMustChangePassword";

type ClerkUserLike =
	| {
			publicMetadata?: Record<string, unknown> | null;
	  }
	| null
	| undefined;

export function shouldForcePasswordChange(user: ClerkUserLike): boolean {
	if (!user?.publicMetadata) return false;
	const value = user.publicMetadata[FORCE_PASSWORD_CHANGE_METADATA_KEY];
	return value === true || value === "true" || value === 1;
}

export function withForcePasswordChangeDisabled(
	metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
	return {
		...(metadata || {}),
		[FORCE_PASSWORD_CHANGE_METADATA_KEY]: false,
	};
}

export function normalizeInternalRedirectPath(
	value: string | null | undefined,
	fallback = "/switcher",
): string {
	const raw = (value || "").trim();
	if (!raw) return fallback;
	if (!raw.startsWith("/")) return fallback;
	if (raw.startsWith("//")) return fallback;
	if (raw.includes("\\") || raw.includes("\u0000")) return fallback;

	try {
		const parsed = new URL(raw, "https://oxom.local");
		if (parsed.origin !== "https://oxom.local") return fallback;
		return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
	} catch {
		return fallback;
	}
}
