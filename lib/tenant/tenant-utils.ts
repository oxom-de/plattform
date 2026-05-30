export const MAIN_APP_HOSTS = new Set([
	"www.oxom.de",
	"app.oxom.de",
	"localhost",
	"127.0.0.1",
]);

export function normalizeWorkspaceSlug(
	value: string | null | undefined,
): string {
	return (value || "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9-_]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 64);
}

export function extractWorkspaceSlugFromObjectKey(key: string): string {
	const first = key.split("/")[0] || "";
	return normalizeWorkspaceSlug(first);
}

export function normalizeHostname(host: string): string {
	const trimmed = host.trim().toLowerCase();
	if (!trimmed) return "";

	const withoutScheme = trimmed.replace(/^https?:\/\//, "");
	const [withoutPath] = withoutScheme.split("/");
	if (!withoutPath) return "";

	const withoutPort = withoutPath.replace(/:\d+$/, "");
	return withoutPort.replace(/\.+$/, "");
}

export function isMainHost(hostname: string): boolean {
	return MAIN_APP_HOSTS.has(hostname);
}

export function parseWorkspaceFromOxomSubdomain(
	hostname: string,
): string | null {
	if (!hostname.endsWith(".oxom.de") || hostname === "www.oxom.de") {
		return null;
	}

	const labels = hostname.split(".");
	if (labels.length !== 3) {
		return null;
	}

	const [workspaceSlug, second, third] = labels;
	if (!workspaceSlug || second !== "oxom" || third !== "de") {
		return null;
	}

	return workspaceSlug;
}
