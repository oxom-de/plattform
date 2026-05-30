import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/audit-logger";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const createSchema = z.object({
	workspaceId: z.string().uuid(),
	role: z.enum(["ADMIN", "MODERATOR", "EDITOR", "MEMBER"]),
});

const revokeSchema = z.object({
	invitationId: z.string().uuid(),
	workspaceId: z.string().uuid(),
});

function getAppBaseUrl(req: NextRequest) {
	const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
	if (explicit) {
		return explicit.replace(/\/+$/, "");
	}
	return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = createSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
	}

	const { workspaceId, role } = parsed.data;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const token = nanoid(32);
	const expiresAt = new Date(
		Date.now() + 7 * 24 * 60 * 60 * 1000,
	).toISOString();

	const supabase = createServerSupabaseAdminClient();
	const { error } = await supabase.from("workspace_invitations").insert({
		workspace_id: access.workspaceId,
		invited_by: access.userId,
		role,
		token,
		expires_at: expiresAt,
	});

	if (error) {
		return NextResponse.json(
			{
				error: "Einladung konnte nicht erstellt werden.",
				code: error.code || null,
			},
			{ status: 500 },
		);
	}

	const inviteUrl = `${getAppBaseUrl(req)}/invite/${token}`;

	await auditLog({
		workspaceId: access.workspaceId,
		actorId: access.userId,
		action: "member.invited",
		targetLabel: `Rolle: ${role}`,
		metadata: { role },
	});

	return NextResponse.json(
		{
			inviteUrl,
			token,
			expiresAt,
		},
		{ status: 201 },
	);
}

export async function DELETE(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = revokeSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
	}

	const { invitationId, workspaceId } = parsed.data;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspace_invitations")
		.delete()
		.eq("id", invitationId)
		.eq("workspace_id", access.workspaceId)
		.is("accepted_at", null)
		.select("id")
		.maybeSingle<{ id: string }>();

	if (error) {
		return NextResponse.json(
			{
				error: "Einladung konnte nicht widerrufen werden.",
				code: error.code || null,
			},
			{ status: 500 },
		);
	}

	if (!data) {
		return NextResponse.json(
			{ error: "Einladung nicht gefunden." },
			{ status: 404 },
		);
	}

	await auditLog({
		workspaceId: access.workspaceId,
		actorId: access.userId,
		action: "invite.revoked",
		targetId: invitationId,
	});

	return NextResponse.json({ success: true }, { status: 200 });
}
