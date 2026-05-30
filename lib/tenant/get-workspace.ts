import "server-only";

import { headers } from "next/headers";
import {
	isMainAppHost,
	normalizeHostname,
	resolveWorkspaceByPathSlug,
	type Workspace,
} from "@/lib/tenant/resolve-workspace";

export async function getWorkspaceFromHeaders(): Promise<Workspace | null> {
	const headerStore = await headers();
	const slug = headerStore.get("x-oxom-workspace")?.trim().toLowerCase();

	if (!slug) {
		return null;
	}

	return resolveWorkspaceByPathSlug(slug);
}

export function tryGetWorkspaceSlugFromPath(pathname: string): string | null {
	const [firstSegment] = pathname.split("/").filter(Boolean);
	if (!firstSegment) {
		return null;
	}

	return firstSegment.trim().toLowerCase() || null;
}

export async function getWorkspaceBasePathFromHeaders(
	workspaceSlug: string,
): Promise<string> {
	const headerStore = await headers();
	const rawHost =
		headerStore.get("x-oxom-hostname") || headerStore.get("host") || "";
	const hostname = normalizeHostname(rawHost);

	return isMainAppHost(hostname) ? `/${workspaceSlug}` : "";
}

export async function getCurrentHostnameFromHeaders(): Promise<string> {
	const headerStore = await headers();
	return normalizeHostname(
		headerStore.get("x-oxom-hostname") || headerStore.get("host") || "",
	);
}

export async function getCurrentPathnameFromHeaders(): Promise<string> {
	const headerStore = await headers();
	return headerStore.get("x-oxom-pathname") || "/";
}
