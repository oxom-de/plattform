import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/audit-logger";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { syncUpdateOrgMemberRole } from "@/lib/clerk/org-sync";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
	membershipId: z.string().uuid(),
	workspaceId: z.string().uuid(),
	role: z.enum(["ADMIN", "MODERATOR", "EDITOR", "MEMBER"]),
});

export async function PATCH(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
	}

	const { membershipId, workspaceId, role } = parsed.data;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const supabase = createServerSupabaseAdminClient();
	const { data: targetMembership } = await supabase
		.from("workspace_memberships")
		.select("user_id, role")
		.eq("id", membershipId)
		.eq("workspace_id", access.workspaceId)
		.maybeSingle<{
			user_id: string;
			role: "ADMIN" | "MODERATOR" | "EDITOR" | "MEMBER";
		}>();

	if (!targetMembership) {
		return NextResponse.json(
			{ error: "Membership nicht gefunden." },
			{ status: 404 },
		);
	}

	if (targetMembership.user_id === access.userId) {
		return NextResponse.json(
			{ error: "Eigene Rolle kann nicht geändert werden." },
			{ status: 400 },
		);
	}

	const { error } = await supabase
		.from("workspace_memberships")
		.update({ role })
		.eq("id", membershipId)
		.eq("workspace_id", access.workspaceId);

	if (error) {
		return NextResponse.json(
			{
				error: "Rolle konnte nicht geändert werden.",
				code: error.code || null,
			},
			{ status: 500 },
		);
	}

	if (access.clerkOrgId) {
		await syncUpdateOrgMemberRole(
			access.clerkOrgId,
			targetMembership.user_id,
			role,
		);
	}

	await auditLog({
		workspaceId: access.workspaceId,
		actorId: access.userId,
		action: "member.role_changed",
		targetId: membershipId,
		targetLabel: `@${targetMembership.user_id}`,
		metadata: {
			old_role: targetMembership.role,
			new_role: role,
		},
	});

	return NextResponse.json({ success: true, role }, { status: 200 });
}
