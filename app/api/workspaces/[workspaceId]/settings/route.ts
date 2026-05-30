import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

const workspaceBrandingUpdateSchema = z.object({
	logo_url: z.string().trim().url().max(500).nullable(),
	brand_color: z
		.string()
		.trim()
		.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
		.nullable(),
	hide_oxom_branding: z.boolean(),
});

type WorkspaceBrandingRow = {
	id: string;
	slug: string;
	name: string;
	logo_url: string | null;
	brand_color: string | null;
	hide_oxom_branding: boolean | null;
};

interface RouteContext {
	params: Promise<{ workspaceId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "read",
		route: "/api/workspaces/[workspaceId]/settings:get",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspaces")
		.select("id, slug, name, logo_url, brand_color, hide_oxom_branding")
		.eq("id", access.workspaceId)
		.maybeSingle<WorkspaceBrandingRow>();

	if (error || !data) {
		return NextResponse.json(
			{ error: error?.message || "Workspace not found" },
			{ status: 404 },
		);
	}

	return NextResponse.json({ workspace: data });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/settings:patch",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = await req.json().catch(() => ({}));
	const parsed = workspaceBrandingUpdateSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json(
			{
				error: "Invalid payload",
				details: parsed.error.issues,
			},
			{ status: 400 },
		);
	}

	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspaces")
		.update(parsed.data)
		.eq("id", access.workspaceId)
		.select("id, slug, name, logo_url, brand_color, hide_oxom_branding")
		.maybeSingle<WorkspaceBrandingRow>();

	if (error || !data) {
		return NextResponse.json(
			{ error: error?.message || "Failed to update workspace" },
			{ status: 500 },
		);
	}

	return NextResponse.json({ success: true, workspace: data });
}
