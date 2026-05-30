import "server-only";

import { cache } from "react";
import type { Workspace } from "@/lib/db/types";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import {
	isMainHost as isMainHostBase,
	normalizeHostname as normalizeHostnameBase,
	parseWorkspaceFromOxomSubdomain as parseWorkspaceFromOxomSubdomainBase,
} from "@/lib/tenant/tenant-utils";

export type { Workspace } from "@/lib/db/types";

type WorkspaceRow = {
	id: string;
	slug: string;
	name: string;
	plan: "CORE" | "ELITE";
	root_domain: string | null;
	logo_url: string | null;
	brand_color: string | null;
	hide_oxom_branding: boolean | null;
	clerk_org_id: string | null;
};

type WorkspaceByHostnameRow = {
	workspace: WorkspaceRow | null;
};

function toWorkspace(row: WorkspaceRow | null): Workspace | null {
	if (!row) return null;

	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		plan: row.plan,
		root_domain: row.root_domain,
		logo_url: row.logo_url,
		brand_color: row.brand_color,
		hide_oxom_branding: row.hide_oxom_branding,
		clerk_org_id: row.clerk_org_id,
	};
}

function toDevDbError(context: string, error: unknown): Error {
	if (!error || typeof error !== "object") {
		return new Error(`${context}: Unknown database error`);
	}

	const typed = error as Record<string, unknown>;
	const code = typeof typed.code === "string" ? typed.code : "unknown";
	const message =
		typeof typed.message === "string" ? typed.message : "unknown error";
	const hint = typeof typed.hint === "string" ? typed.hint : "";

	const tableOrColumnMissing = code === "42P01" || code === "42703";
	const suffix = tableOrColumnMissing
		? " Check schema/migration for tenant tables/columns."
		: "";

	return new Error(
		`${context}: ${message} (code ${code}).${hint ? ` Hint: ${hint}.` : ""}${suffix}`,
	);
}

export const normalizeHostname = normalizeHostnameBase;
export const isMainHost = isMainHostBase;
export const parseWorkspaceFromOxomSubdomain =
	parseWorkspaceFromOxomSubdomainBase;

async function queryWorkspaceBySlug(
	slug: string,
): Promise<{ data: WorkspaceRow | null; error: unknown }> {
	// Tenant resolution must stay fast and deterministic.
	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspaces")
		.select(
			"id, slug, name, plan, root_domain, logo_url, brand_color, hide_oxom_branding, clerk_org_id",
		)
		.eq("slug", slug)
		.maybeSingle<WorkspaceRow>();

	return { data: data || null, error };
}

async function queryWorkspaceByHostname(
	hostname: string,
): Promise<{ data: WorkspaceByHostnameRow | null; error: unknown }> {
	// Tenant resolution must stay fast and deterministic.
	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("domains")
		.select(
			"workspace:workspaces(id, slug, name, plan, root_domain, logo_url, brand_color, hide_oxom_branding, clerk_org_id)",
		)
		.eq("hostname", hostname)
		.eq("verified", true)
		.in("purpose", ["CUSTOM_DASHBOARD", "PLATFORM_SUBDOMAIN", "LINK_IN_BIO"])
		.neq("purpose", "ROOT_PREVIEW")
		.maybeSingle<WorkspaceByHostnameRow>();

	return { data: data || null, error };
}

const getWorkspaceBySlugCached = cache(
	async (slug: string): Promise<Workspace | null> => {
		const normalizedSlug = slug.trim().toLowerCase();
		if (!normalizedSlug) return null;

		const { data, error } = await queryWorkspaceBySlug(normalizedSlug);

		if (error) {
			if (process.env.NODE_ENV !== "production")
				throw toDevDbError("getWorkspaceBySlug", error);
			return null;
		}

		return toWorkspace(data);
	},
);

const getWorkspaceByHostnameCached = cache(
	async (hostname: string): Promise<Workspace | null> => {
		const normalizedHostname = normalizeHostname(hostname);
		if (!normalizedHostname) return null;

		const parsedSlug = parseWorkspaceFromOxomSubdomain(normalizedHostname);
		if (parsedSlug) {
			return getWorkspaceBySlugCached(parsedSlug);
		}

		const { data, error } = await queryWorkspaceByHostname(normalizedHostname);

		if (error) {
			if (process.env.NODE_ENV !== "production")
				throw toDevDbError("getWorkspaceByHostname", error);
			return null;
		}

		return toWorkspace(data?.workspace || null);
	},
);

// Compatibility aliases for existing imports.
export const isMainAppHost = isMainHost;
export const parseWorkspaceFromSubdomain = parseWorkspaceFromOxomSubdomain;
export const resolveWorkspaceByPathSlug = getWorkspaceBySlugCached;
export const resolveWorkspaceByHostname = getWorkspaceByHostnameCached;

export const getWorkspaceBySlug = getWorkspaceBySlugCached;
export const getWorkspaceByHostname = getWorkspaceByHostnameCached;
