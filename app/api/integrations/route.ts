import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
	listWorkspaceIntegrations,
	upsertWorkspaceIntegration,
	disableWorkspaceIntegration,
	updateWorkspaceIntegrationMetadata,
} from "@/lib/integrations/workspace-integrations";
import {
	requireWorkspaceAccessById,
} from "@/lib/authz/workspace-access";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
	const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? "";
	const access = await requireWorkspaceAccessById(workspaceId, "MEMBER");
	if (access instanceof NextResponse) return access;

	const integrations = await listWorkspaceIntegrations(access.workspaceId);
	return NextResponse.json({ integrations });
}

const upsertSchema = z.object({
	workspaceId: z.string().uuid(),
	provider: z.string().min(1).max(64).toLowerCase(),
	secret: z.string().min(1).max(2048).trim(),
});

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = upsertSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	const access = await requireWorkspaceAccessById(parsed.data.workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	try {
		const integration = await upsertWorkspaceIntegration({
			workspaceId: access.workspaceId,
			provider: parsed.data.provider,
			secret: parsed.data.secret,
			actorId: access.userId,
		});
		return NextResponse.json({ integration });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

const patchSchema = z.object({
	workspaceId: z.string().uuid(),
	provider: z.string().min(1).max(64).toLowerCase(),
	metadata: z.record(z.string(), z.unknown()),
});

export async function PATCH(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = patchSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	const access = await requireWorkspaceAccessById(parsed.data.workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	try {
		await updateWorkspaceIntegrationMetadata(
			access.workspaceId,
			parsed.data.provider,
			parsed.data.metadata,
			access.userId,
		);
		return NextResponse.json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

const deleteSchema = z.object({
	workspaceId: z.string().uuid(),
	provider: z.string().min(1).max(64).toLowerCase(),
});

export async function DELETE(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = deleteSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	const access = await requireWorkspaceAccessById(parsed.data.workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	try {
		await disableWorkspaceIntegration(
			access.workspaceId,
			parsed.data.provider,
			access.userId,
		);
		return NextResponse.json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
