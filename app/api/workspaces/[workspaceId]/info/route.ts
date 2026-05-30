import { type NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessByIdOrServiceToken } from "@/lib/authz/workspace-service-token";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

interface RouteContext {
	params: Promise<{ workspaceId: string }>;
}

type WorkspaceInfoRow = {
	name: string;
	slug: string;
	plan: string;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessByIdOrServiceToken(req, workspaceId);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "read",
		route: "/api/workspaces/[workspaceId]/info:get",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspaces")
		.select("name, slug, plan")
		.eq("id", access.workspaceId)
		.maybeSingle<WorkspaceInfoRow>();

	if (error || !data) {
		return NextResponse.json(
			{ error: error?.message || "Workspace not found" },
			{ status: 404 },
		);
	}

	return NextResponse.json({
		data: {
			name: data.name,
			slug: data.slug,
			plan: data.plan,
		},
	});
}
