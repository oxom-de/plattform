import { auth, clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/audit-logger";
import { shouldForcePasswordChange } from "@/lib/auth/password-reset";
import { syncAddOrgMember } from "@/lib/clerk/org-sync";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
	token: z.string().trim().min(1).max(255),
});

type InvitationRow = {
	id: string;
	workspace_id: string;
	role: "ADMIN" | "MODERATOR" | "EDITOR" | "MEMBER";
	expires_at: string;
	accepted_at: string | null;
};

type WorkspaceRow = {
	id: string;
	slug: string;
};

export async function POST(req: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const clerk = await clerkClient();
	const user = await clerk.users.getUser(userId).catch(() => null);
	if (!user) {
		return NextResponse.json(
			{ error: "User nicht gefunden." },
			{ status: 404 },
		);
	}
	if (shouldForcePasswordChange(user)) {
		return NextResponse.json(
			{
				error: "Bitte ändere zuerst dein Passwort über den Onboarding-Flow.",
			},
			{ status: 403 },
		);
	}

	const body = await req.json().catch(() => ({}));
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 });
	}

	const token = parsed.data.token;
	const supabase = createServerSupabaseAdminClient();

	const { data: invitation } = await supabase
		.from("workspace_invitations")
		.select("id, workspace_id, role, expires_at, accepted_at")
		.eq("token", token)
		.maybeSingle<InvitationRow>();

	if (!invitation) {
		return NextResponse.json(
			{ error: "Ungültiger Einladungs-Link." },
			{ status: 404 },
		);
	}

	if (invitation.accepted_at) {
		return NextResponse.json(
			{ error: "Dieser Einladungs-Link wurde bereits verwendet." },
			{ status: 409 },
		);
	}

	if (new Date(invitation.expires_at).getTime() <= Date.now()) {
		return NextResponse.json(
			{ error: "Dieser Einladungs-Link ist abgelaufen." },
			{ status: 410 },
		);
	}

	const { data: workspace } = await supabase
		.from("workspaces")
		.select("id, slug, clerk_org_id")
		.eq("id", invitation.workspace_id)
		.maybeSingle<WorkspaceRow & { clerk_org_id: string | null }>();

	if (!workspace) {
		return NextResponse.json(
			{ error: "Workspace nicht gefunden." },
			{ status: 404 },
		);
	}

	const now = new Date().toISOString();

	const { data: existingMembership } = await supabase
		.from("workspace_memberships")
		.select("id")
		.eq("workspace_id", workspace.id)
		.eq("user_id", userId)
		.maybeSingle<{ id: string }>();

	let createdMembership = false;

	if (!existingMembership) {
		const { error: membershipError } = await supabase
			.from("workspace_memberships")
			.insert({
				workspace_id: workspace.id,
				user_id: userId,
				role: invitation.role,
			});

		if (membershipError && membershipError.code !== "23505") {
			return NextResponse.json(
				{
					error: "Beitritt fehlgeschlagen. Bitte erneut versuchen.",
					code: membershipError.code || null,
				},
				{ status: 500 },
			);
		}

		createdMembership = true;

		if (workspace.clerk_org_id) {
			await syncAddOrgMember(workspace.clerk_org_id, userId, invitation.role);
		}
	}

	await supabase
		.from("workspace_invitations")
		.update({ accepted_at: now })
		.eq("id", invitation.id)
		.is("accepted_at", null);

	if (createdMembership) {
		await auditLog({
			workspaceId: workspace.id,
			actorId: userId,
			action: "member.joined",
			metadata: { role: invitation.role },
		});
	}

	return NextResponse.json(
		{
			success: true,
			workspaceSlug: workspace.slug,
		},
		{ status: 200 },
	);
}
