import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/audit-logger";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { syncRemoveOrgMember } from "@/lib/clerk/org-sync";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
	membershipId: z.string().uuid(),
	workspaceId: z.string().uuid(),
});

export async function DELETE(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
	}

	const { membershipId, workspaceId } = parsed.data;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const supabase = createServerSupabaseAdminClient();
	const { data: targetMembership } = await supabase
		.from("workspace_memberships")
		.select("user_id")
		.eq("id", membershipId)
		.eq("workspace_id", access.workspaceId)
		.maybeSingle<{ user_id: string }>();

	if (!targetMembership) {
		return NextResponse.json(
			{ error: "Membership nicht gefunden." },
			{ status: 404 },
		);
	}

	if (targetMembership.user_id === access.userId) {
		return NextResponse.json(
			{ error: "Eigene Membership kann nicht entfernt werden." },
			{ status: 400 },
		);
	}

	const { error } = await supabase
		.from("workspace_memberships")
		.delete()
		.eq("id", membershipId)
		.eq("workspace_id", access.workspaceId);

	if (error) {
		return NextResponse.json(
			{
				error: "Member konnte nicht entfernt werden.",
				code: error.code || null,
			},
			{ status: 500 },
		);
	}

	if (access.clerkOrgId) {
		await syncRemoveOrgMember(access.clerkOrgId, targetMembership.user_id);
	}

	await auditLog({
		workspaceId: access.workspaceId,
		actorId: access.userId,
		action: "member.removed",
		targetId: membershipId,
		targetLabel: `@${targetMembership.user_id}`,
	});

	return NextResponse.json({ success: true }, { status: 200 });
}
