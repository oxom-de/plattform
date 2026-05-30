import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import {
	disableWorkspaceIntegration,
	upsertWorkspaceIntegration,
} from "@/lib/integrations/workspace-integrations";

export const runtime = "nodejs";

const saveSchema = z.object({
	workspaceId: z.string().uuid(),
	accountId: z.string().min(1, "Account ID fehlt"),
	accessKeyId: z.string().min(1, "Access Key ID fehlt"),
	secretAccessKey: z.string().min(1, "Secret Access Key fehlt"),
	bucketName: z.string().min(1, "Bucket Name fehlt"),
	publicBaseUrl: z.string().url("Ungültige URL").or(z.literal("")).optional(),
	endpoint: z.string().url("Ungültige URL").or(z.literal("")).optional(),
});

const deleteSchema = z.object({
	workspaceId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = saveSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.errors[0]?.message ?? "Ungültige Eingabe" },
			{ status: 400 },
		);
	}

	const {
		workspaceId,
		accountId,
		accessKeyId,
		secretAccessKey,
		bucketName,
		publicBaseUrl,
		endpoint,
	} = parsed.data;

	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const secret = JSON.stringify({
		accountId,
		accessKeyId,
		secretAccessKey,
		bucketName,
		publicBaseUrl: publicBaseUrl || "",
		endpoint: endpoint || "",
	});

	await upsertWorkspaceIntegration({
		workspaceId: access.workspaceId,
		provider: "r2",
		secret,
		secretHint: `${accountId.slice(0, 6)}…${bucketName}`,
		authType: "api_key",
		metadata: { bucketName, publicBaseUrl: publicBaseUrl || "", endpoint: endpoint || "" },
		actorId: access.userId,
	});

	return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = deleteSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
	}

	const access = await requireWorkspaceAccessById(parsed.data.workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	await disableWorkspaceIntegration(access.workspaceId, "r2", access.userId);
	return NextResponse.json({ ok: true });
}
