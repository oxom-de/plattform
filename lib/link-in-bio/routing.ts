const DEFAULT_HOST_SUFFIXES = ["oxom.de"] as const;
const RESERVED_SUBDOMAINS = new Set(["www", "app", "cdn", "status", "admin", "docs", "guide", "g", "mail", "api"]);

function normalizeHostSuffix(value: string): string | null {
	const normalized = value.trim().toLowerCase().replace(/\.+$/, "");
	if (!normalized) return null;
	if (!/^[a-z0-9.-]+$/.test(normalized)) return null;
	if (normalized.startsWith(".") || normalized.endsWith(".")) return null;
	if (normalized.includes("..")) return null;
	return normalized;
}

function parseHostSuffixesFromEnv(raw: string | undefined): string[] {
	if (!raw?.trim()) {
		return [...DEFAULT_HOST_SUFFIXES];
	}

	const parsed = raw
		.split(",")
		.map((part) => normalizeHostSuffix(part))
		.filter((part): part is string => Boolean(part));

	if (parsed.length === 0) {
		return [...DEFAULT_HOST_SUFFIXES];
	}

	// Keep env-defined suffixes first for preferred URL generation,
	// but always support the default oxom.de wildcard as fallback.
	return Array.from(new Set([...parsed, ...DEFAULT_HOST_SUFFIXES]));
}

export function getLinkInBioHostSuffixes(): string[] {
	return parseHostSuffixesFromEnv(process.env.OXOM_LINK_IN_BIO_HOST_SUFFIXES);
}

export function parseWorkspaceFromLinkInBioHost(
	hostname: string,
): string | null {
	const normalizedHostname = hostname.trim().toLowerCase().replace(/\.+$/, "");
	if (!normalizedHostname) return null;

	const hostLabels = normalizedHostname.split(".").filter(Boolean);
	if (hostLabels.length < 3) return null;

	for (const suffix of getLinkInBioHostSuffixes()) {
		const suffixLabels = suffix.split(".");
		if (hostLabels.length !== suffixLabels.length + 1) continue;

		const hostSuffix = hostLabels.slice(1).join(".");
		if (hostSuffix !== suffix) continue;

		const workspaceSlug = hostLabels[0];
		if (!workspaceSlug || RESERVED_SUBDOMAINS.has(workspaceSlug)) return null;
		if (!/^[a-z0-9_-]{1,64}$/.test(workspaceSlug)) return null;
		return workspaceSlug;
	}

	return null;
}

export function isManagedLinkInBioHost(hostname: string): boolean {
	const normalizedHostname = hostname.trim().toLowerCase().replace(/\.+$/, "");
	if (!normalizedHostname) return false;

	for (const suffix of getLinkInBioHostSuffixes()) {
		if (normalizedHostname === suffix) return true;
		if (normalizedHostname.endsWith(`.${suffix}`)) return true;
	}

	return false;
}

export function buildLinkInBioPublicUrl(workspaceSlug: string): string {
	const normalizedSlug = workspaceSlug.trim().toLowerCase();
	const suffix = getLinkInBioHostSuffixes()[0] || DEFAULT_HOST_SUFFIXES[0];
	return `https://${normalizedSlug}.${suffix}`;
}
