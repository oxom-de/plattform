import { type NextRequest, NextResponse } from "next/server";
import {
	normalizeWorkspaceSlug,
	requireWorkspaceAccessBySlug,
} from "@/lib/authz/workspace-access";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import {
	revokeUploadAccessKey,
	verifyUploadAccessKey,
} from "@/lib/security/upload-links";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const creatorSlug = normalizeWorkspaceSlug(
		typeof body?.creatorSlug === "string" ? body.creatorSlug : "",
	);
	const rawKey = typeof body?.key === "string" ? body.key.trim() : "";

	if (!creatorSlug || !rawKey) {
		return NextResponse.json(
			{ error: "Missing creatorSlug or key" },
			{ status: 400 },
		);
	}

	const access = await requireWorkspaceAccessBySlug(creatorSlug, "MODERATOR");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/upload/link/revoke",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const verification = verifyUploadAccessKey({
		key: rawKey,
		expectedCreatorSlug: access.workspaceSlug,
	});

	if (verification.ok === false) {
		return NextResponse.json(
			{
				error: "Invalid upload key",
				code: verification.code,
			},
			{ status: 400 },
		);
	}

	await revokeUploadAccessKey({
		key: rawKey,
		expiresAt: verification.expiresAt,
	});

	return NextResponse.json(
		{
			success: true,
			creatorSlug: access.workspaceSlug,
			expiresAt: new Date(verification.expiresAt).toISOString(),
		},
		{
			headers: {
				"Cache-Control": "no-store",
			},
		},
	);
}
