import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { isLinkInBioEnabledForWorkspace } from "@/lib/feature-flags";
import { getLinkInBioProfileByWorkspaceId } from "@/lib/link-in-bio/loaders";
import type {
	LinkInBioLinkItem,
	LinkInBioProfile,
} from "@/lib/link-in-bio/types";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

interface RouteContext {
	params: Promise<{ workspaceId: string }>;
}

function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

const linkItemSchema = z.object({
	id: z.string().trim().min(1).max(64),
	label: z.string().trim().min(1).max(80),
	url: z
		.string()
		.trim()
		.max(500)
		.refine(isHttpUrl, "URL must start with http:// or https://"),
	is_ad: z.boolean().optional().default(false),
	is_cal: z.boolean().optional().default(false),
});

const featuredLinkSchema = z
	.object({
		label: z.string().trim().min(1).max(80),
		url: z
			.string()
			.trim()
			.max(500)
			.refine(isHttpUrl, "URL must start with http:// or https://"),
	})
	.nullable();

const updateSchema = z.object({
	avatarUrl: z
		.string()
		.trim()
		.max(500)
		.refine(isHttpUrl, "URL must start with http:// or https://")
		.nullable(),
	displayName: z.string().trim().min(1).max(80),
	bio: z.string().trim().max(280).nullable(),
	featuredLink: featuredLinkSchema,
	links: z.array(linkItemSchema).max(24),
	socialLinks: z.array(linkItemSchema).max(6),
	isPublished: z.boolean(),
});

function isMissingTableError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const typed = error as { code?: string; message?: string };
	const message = (typed.message || "").toLowerCase();
	return (
		typed.code === "42P01" ||
		typed.code === "PGRST205" ||
		message.includes("could not find the table")
	);
}

function normalizeItems(items: LinkInBioLinkItem[]): LinkInBioLinkItem[] {
	return items.map((item, index) => {
		const id = item.id?.trim() || `item-${index + 1}`;
		return {
			id,
			label: item.label.trim(),
			url: item.url.trim(),
			is_ad: item.is_ad === true,
			is_cal: false,
		};
	});
}

function formatProfileFromInput(
	workspaceId: string,
	payload: z.infer<typeof updateSchema>,
	persisted: Pick<
		LinkInBioProfile,
		"created_at" | "updated_at" | "published_at"
	> | null,
): LinkInBioProfile {
	return {
		workspace_id: workspaceId,
		avatar_url: payload.avatarUrl?.trim() || null,
		display_name: payload.displayName.trim(),
		bio: payload.bio?.trim() || null,
		featured_link: payload.featuredLink
			? {
					label: payload.featuredLink.label.trim(),
					url: payload.featuredLink.url.trim(),
				}
			: null,
		links: normalizeItems(payload.links),
		social_links: normalizeItems(payload.socialLinks),
		is_published: payload.isPublished,
		published_at: payload.isPublished
			? persisted?.published_at || new Date().toISOString()
			: null,
		created_at: persisted?.created_at || null,
		updated_at: persisted?.updated_at || null,
	};
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId);
	if (access instanceof NextResponse) return access;

	if (!(await isLinkInBioEnabledForWorkspace(access.workspaceId))) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const limit = await checkRateLimit({
		tier: "read",
		route: "/api/workspaces/[workspaceId]/link-in-bio:get",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const result = await getLinkInBioProfileByWorkspaceId(access.workspaceId);
	if (result.error) {
		if (result.missingTable) {
			return NextResponse.json(
				{
					error:
						"Link in Bio table missing. Apply docs/sql/link-in-bio.sql first.",
					code: result.error.code || null,
				},
				{ status: 501 },
			);
		}

		return NextResponse.json(
			{
				error: result.error.message || "Failed to load Link in Bio profile",
				code: result.error.code || null,
			},
			{ status: 500 },
		);
	}

	return NextResponse.json({ profile: result.profile });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId, "MODERATOR");
	if (access instanceof NextResponse) return access;

	if (!(await isLinkInBioEnabledForWorkspace(access.workspaceId))) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/link-in-bio:put",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = await req.json().catch(() => ({}));
	const parsed = updateSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Invalid payload",
				details: parsed.error.issues,
			},
			{ status: 400 },
		);
	}

	const clean = parsed.data;
	if (clean.isPublished && !clean.featuredLink && clean.links.length === 0) {
		return NextResponse.json(
			{
				error:
					"Zum Veröffentlichen brauchst du mindestens einen normalen oder hervorgehobenen Link.",
			},
			{ status: 400 },
		);
	}

	const supabase = createServerSupabaseAdminClient();
	const existingResult = await getLinkInBioProfileByWorkspaceId(
		access.workspaceId,
	);
	if (existingResult.error && !existingResult.missingTable) {
		return NextResponse.json(
			{
				error:
					existingResult.error.message || "Failed to load existing profile",
				code: existingResult.error.code || null,
			},
			{ status: 500 },
		);
	}

	const nextPublishedAt = clean.isPublished
		? existingResult.profile?.published_at || new Date().toISOString()
		: null;

	const upsertPayload = {
		workspace_id: access.workspaceId,
		avatar_url: clean.avatarUrl?.trim() || null,
		display_name: clean.displayName.trim(),
		bio: clean.bio?.trim() || null,
		featured_link_label: clean.featuredLink?.label.trim() || null,
		featured_link_url: clean.featuredLink?.url.trim() || null,
		links: normalizeItems(clean.links),
		social_links: normalizeItems(clean.socialLinks),
		is_published: clean.isPublished,
		published_at: nextPublishedAt,
	};

	const upsertResult = await supabase
		.from("workspace_link_bio_profiles")
		.upsert(upsertPayload, { onConflict: "workspace_id" })
		.select(
			"workspace_id, avatar_url, display_name, bio, featured_link_label, featured_link_url, links, social_links, is_published, published_at, created_at, updated_at",
		)
		.maybeSingle<{
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
		}>();

	if (upsertResult.error || !upsertResult.data) {
		if (isMissingTableError(upsertResult.error)) {
			return NextResponse.json(
				{
					error:
						"Link in Bio table missing. Apply docs/sql/link-in-bio.sql first.",
					code: upsertResult.error?.code || null,
				},
				{ status: 501 },
			);
		}

		return NextResponse.json(
			{
				error:
					upsertResult.error?.message || "Failed to save Link in Bio profile",
				code: upsertResult.error?.code || null,
			},
			{ status: 500 },
		);
	}

	const responseProfile = formatProfileFromInput(access.workspaceId, clean, {
		created_at: upsertResult.data.created_at,
		updated_at: upsertResult.data.updated_at,
		published_at: upsertResult.data.published_at,
	});

	return NextResponse.json({ success: true, profile: responseProfile });
}
