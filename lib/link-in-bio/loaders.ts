import "server-only";

import type {
	LinkInBioLinkItem,
	LinkInBioProfile,
	LinkInBioWorkspaceSummary,
} from "@/lib/link-in-bio/types";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveWorkspaceByPathSlug } from "@/lib/tenant/resolve-workspace";

type LinkInBioRow = {
	workspace_id: string;
	avatar_url: string | null;
	display_name: string;
	bio: string | null;
	featured_link_label: string | null;
	featured_link_url: string | null;
	links: unknown;
	social_links: unknown;
	is_published: boolean;
	published_at: string | null;
	created_at: string | null;
	updated_at: string | null;
};

type DbError = {
	code?: string | null;
	message?: string | null;
};

export type LinkInBioLoadResult = {
	profile: LinkInBioProfile | null;
	missingTable: boolean;
	error: DbError | null;
};

export type PublicLinkInBioLoadResult = {
	workspace: LinkInBioWorkspaceSummary | null;
	profile: LinkInBioProfile | null;
	missingTable: boolean;
	error: DbError | null;
};

const SELECT_CLAUSE =
	"workspace_id, avatar_url, display_name, bio, featured_link_label, featured_link_url, links, social_links, is_published, published_at, created_at, updated_at";

function isMissingTableError(error: DbError | null): boolean {
	if (!error) return false;
	const message = (error.message || "").toLowerCase();
	return (
		error.code === "42P01" ||
		error.code === "PGRST205" ||
		message.includes("could not find the table")
	);
}

function sanitizeLinkItems(value: unknown): LinkInBioLinkItem[] {
	if (!Array.isArray(value)) return [];

	const items: LinkInBioLinkItem[] = [];
	for (let index = 0; index < value.length; index += 1) {
		const item = value[index];
		if (!item || typeof item !== "object") continue;

		const row = item as Record<string, unknown>;
		const label = typeof row.label === "string" ? row.label.trim() : "";
		const url = typeof row.url === "string" ? row.url.trim() : "";
		if (!label || !url) continue;

		const rawId = typeof row.id === "string" ? row.id.trim() : "";
		const id = rawId || `item-${index + 1}`;
		const isAd =
			typeof row.is_ad === "boolean"
				? row.is_ad
				: typeof row.isAd === "boolean"
					? row.isAd
					: false;
		const isCal =
			typeof row.is_cal === "boolean"
				? row.is_cal
				: typeof row.isCal === "boolean"
					? row.isCal
					: false;
		items.push({ id, label, url, is_ad: isAd, is_cal: isCal });
	}

	return items;
}

function toProfile(row: LinkInBioRow): LinkInBioProfile {
	const featuredLabel = row.featured_link_label?.trim() || null;
	const featuredUrl = row.featured_link_url?.trim() || null;

	return {
		workspace_id: row.workspace_id,
		avatar_url: row.avatar_url?.trim() || null,
		display_name: row.display_name?.trim() || "",
		bio: row.bio?.trim() || null,
		featured_link:
			featuredLabel && featuredUrl
				? { label: featuredLabel, url: featuredUrl }
				: null,
		links: sanitizeLinkItems(row.links),
		social_links: sanitizeLinkItems(row.social_links).slice(0, 6),
		is_published: row.is_published,
		published_at: row.published_at,
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

async function getLinkInBioVerificationLabel(
	supabase: ReturnType<typeof createServerSupabaseAdminClient>,
	workspaceId: string,
): Promise<string | null> {
	const normalizedWorkspaceId = workspaceId.trim();
	if (!normalizedWorkspaceId) return null;

	const { data: oxomWorkspace, error: oxomWorkspaceError } = await supabase
		.from("workspaces")
		.select("id")
		.eq("slug", "oxom")
		.maybeSingle<{ id: string }>();

	if (oxomWorkspaceError || !oxomWorkspace?.id) return null;
	if (oxomWorkspace.id === normalizedWorkspaceId) return "oxom Team";

	const { data: memberRows, error: membersError } = await supabase
		.from("workspace_memberships")
		.select("user_id")
		.eq("workspace_id", normalizedWorkspaceId)
		.limit(100);

	if (membersError || !memberRows?.length) return null;

	const userIds = Array.from(
		new Set(
			memberRows
				.map((row) =>
					typeof row.user_id === "string" ? row.user_id.trim() : "",
				)
				.filter(Boolean),
		),
	);
	if (userIds.length === 0) return null;

	const { data: overlapRows, error: overlapError } = await supabase
		.from("workspace_memberships")
		.select("user_id")
		.eq("workspace_id", oxomWorkspace.id)
		.in("user_id", userIds)
		.limit(1);

	if (overlapError || !overlapRows?.length) return null;
	return "oxom Team Member";
}

export async function getLinkInBioVerificationLabelForWorkspaceId(
	workspaceId: string,
): Promise<string | null> {
	const supabase = createServerSupabaseAdminClient();
	return getLinkInBioVerificationLabel(supabase, workspaceId);
}

export function createDefaultLinkInBioProfile(
	workspaceId: string,
	workspaceName: string,
): LinkInBioProfile {
	return {
		workspace_id: workspaceId,
		avatar_url: null,
		display_name: workspaceName,
		bio: null,
		featured_link: null,
		links: [],
		social_links: [],
		is_published: false,
		published_at: null,
		created_at: null,
		updated_at: null,
	};
}

export async function getLinkInBioProfileByWorkspaceId(
	workspaceId: string,
): Promise<LinkInBioLoadResult> {
	const normalizedWorkspaceId = workspaceId.trim();
	if (!normalizedWorkspaceId) {
		return { profile: null, missingTable: false, error: null };
	}

	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspace_link_bio_profiles")
		.select(SELECT_CLAUSE)
		.eq("workspace_id", normalizedWorkspaceId)
		.maybeSingle<LinkInBioRow>();

	if (error) {
		return {
			profile: null,
			missingTable: isMissingTableError(error),
			error,
		};
	}

	return {
		profile: data ? toProfile(data) : null,
		missingTable: false,
		error: null,
	};
}

export async function getPublicLinkInBioByWorkspaceSlug(
	slug: string,
): Promise<PublicLinkInBioLoadResult> {
	const normalizedSlug = slug.trim().toLowerCase();
	if (!normalizedSlug) {
		return { workspace: null, profile: null, missingTable: false, error: null };
	}

	const workspace = await resolveWorkspaceByPathSlug(normalizedSlug);
	if (!workspace) {
		return { workspace: null, profile: null, missingTable: false, error: null };
	}
	const supabase = createServerSupabaseAdminClient();

	const workspaceSummary: LinkInBioWorkspaceSummary = {
		id: workspace.id,
		slug: workspace.slug,
		name: workspace.name,
		logo_url: workspace.logo_url,
		hide_oxom_branding: workspace.hide_oxom_branding,
		verification_label: await getLinkInBioVerificationLabel(supabase, workspace.id),
	};

	const result = await getLinkInBioProfileByWorkspaceId(workspace.id);
	if (result.error) {
		return {
			workspace: workspaceSummary,
			profile: null,
			missingTable: result.missingTable,
			error: result.error,
		};
	}

	if (!result.profile || !result.profile.is_published) {
		return {
			workspace: workspaceSummary,
			profile: null,
			missingTable: false,
			error: null,
		};
	}

	return {
		workspace: workspaceSummary,
		profile: result.profile,
		missingTable: false,
		error: null,
	};
}

export async function isVerifiedCustomLinkInBioDomainForWorkspace(
	hostname: string,
	workspaceId: string,
): Promise<boolean> {
	const normalizedHostname = hostname.trim().toLowerCase();
	const normalizedWorkspaceId = workspaceId.trim();
	if (!normalizedHostname || !normalizedWorkspaceId) {
		return false;
	}

	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("domains")
		.select("purpose, verified")
		.eq("hostname", normalizedHostname)
		.eq("workspace_id", normalizedWorkspaceId)
		.maybeSingle<{ purpose: string; verified: boolean }>();

	if (error || !data) {
		return false;
	}

	return data.verified === true && data.purpose === "LINK_IN_BIO";
}
