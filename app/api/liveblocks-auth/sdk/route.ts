import { type NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

/**
 * Liveblocks SDK auth endpoint.
 * The SDK POSTs { room: string } and expects { token: string } back.
 * Room format: {workspaceId}:{entityType}:{entityId}
 */

function getLiveblocksSecretKey(): string {
	const raw =
		process.env.LIVEBLOCKS_SECRET_KEY?.trim() ||
		process.env.LIVEBLOCKS_SECRET?.trim() ||
		"";
	return raw.replace(/^['"]|['"]$/g, "");
}

function parseWorkspaceIdFromRoom(room: string): string | null {
	const parts = room.split(":");
	return parts.length >= 3 ? (parts[0] ?? null) : null;
}

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({})) as { room?: string };
	const room = typeof body.room === "string" ? body.room.trim() : "";

	if (!room) {
		return NextResponse.json({ error: "Missing room" }, { status: 400 });
	}

	const workspaceId = parseWorkspaceIdFromRoom(room);
	if (!workspaceId) {
		return NextResponse.json({ error: "Invalid room format" }, { status: 400 });
	}

	const access = await requireWorkspaceAccessById(workspaceId);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "read",
		route: "/api/liveblocks-auth/sdk",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const secretKey = getLiveblocksSecretKey();
	if (!secretKey) {
		return NextResponse.json(
			{ error: "LIVEBLOCKS_SECRET_KEY is not configured" },
			{ status: 503 },
		);
	}

	const response = await fetch("https://api.liveblocks.io/v2/authorize-user", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${secretKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			userId: access.userId,
			userInfo: {
				workspaceId: access.workspaceId,
				workspaceSlug: access.workspaceSlug,
			},
			permissions: {
				[room]: ["room:write"],
			},
		}),
		cache: "no-store",
	});

	if (!response.ok) {
		const data = await response.json().catch(() => null) as { message?: string } | null;
		return NextResponse.json(
			{ error: data?.message || "Liveblocks authorization failed" },
			{ status: response.status || 502 },
		);
	}

	const data = await response.json() as { token: string };
	return NextResponse.json({ token: data.token });
}
