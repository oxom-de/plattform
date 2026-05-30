import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccessBySlug } from "@/lib/authz/workspace-access";
import {
	buildLiveblocksRoomId,
	type LiveEntityType,
} from "@/lib/liveblocks/rooms";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

const liveblocksAuthSchema = z.object({
	workspace: z.string().min(1),
	entityType: z.enum(["stream-note", "drive-comment", "script-editor"]),
	entityId: z.string().min(1).max(120),
});

function getLiveblocksSecretKey() {
	const raw =
		process.env.LIVEBLOCKS_SECRET_KEY?.trim() ||
		process.env.LIVEBLOCKS_SECRET?.trim() ||
		"";
	return raw.replace(/^['"]|['"]$/g, "");
}

function toLiveblocksErrorMessage(details: unknown): string | null {
	if (!details || typeof details !== "object") return null;
	const typed = details as {
		message?: unknown;
		error?: unknown;
		details?: unknown;
	};

	if (typeof typed.message === "string" && typed.message.trim())
		return typed.message;
	if (typeof typed.error === "string" && typed.error.trim()) return typed.error;
	if (typeof typed.details === "string" && typed.details.trim())
		return typed.details;
	return null;
}

type RoomAccessContext = {
	userId: string;
	workspaceId: string;
	workspaceSlug: string;
};

async function callLiveblocksAuthorizeUser(
	secretKey: string,
	roomId: string,
	context: RoomAccessContext,
) {
	const endpoint = "https://api.liveblocks.io/v2/authorize-user";
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${secretKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			userId: context.userId,
			userInfo: {
				workspaceId: context.workspaceId,
				workspaceSlug: context.workspaceSlug,
			},
			permissions: {
				[roomId]: ["room:write"],
			},
		}),
		cache: "no-store",
	});

	const data = await response.json().catch(() => null);
	return { endpoint, response, data };
}

async function callLiveblocksLegacyAuthorize(
	secretKey: string,
	roomId: string,
	context: RoomAccessContext,
) {
	const endpoint = `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(roomId)}/authorize`;
	const response = await fetch(endpoint, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${secretKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			userId: context.userId,
			userInfo: {
				workspaceId: context.workspaceId,
				workspaceSlug: context.workspaceSlug,
			},
		}),
		cache: "no-store",
	});

	const data = await response.json().catch(() => null);
	return { endpoint, response, data };
}

export async function POST(req: NextRequest) {
	const payload = await req.json().catch(() => ({}));
	const parsed = liveblocksAuthSchema.safeParse(payload);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid payload", details: parsed.error.issues },
			{ status: 400 },
		);
	}

	const access = await requireWorkspaceAccessBySlug(parsed.data.workspace);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "read",
		route: "/api/liveblocks-auth",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const entityType = parsed.data.entityType as LiveEntityType;
	const roomId = buildLiveblocksRoomId({
		workspaceId: access.workspaceId,
		entityType,
		entityId: parsed.data.entityId,
	});

	const secretKey = getLiveblocksSecretKey();
	if (!secretKey) {
		return NextResponse.json(
			{ error: "LIVEBLOCKS_SECRET_KEY is not configured" },
			{ status: 503 },
		);
	}

	const context: RoomAccessContext = {
		userId: access.userId,
		workspaceId: access.workspaceId,
		workspaceSlug: access.workspaceSlug,
	};

	const modern = await callLiveblocksAuthorizeUser(secretKey, roomId, context);
	if (!modern.response.ok && modern.response.status === 404) {
		const legacy = await callLiveblocksLegacyAuthorize(
			secretKey,
			roomId,
			context,
		);
		if (!legacy.response.ok) {
			const apiMessage = toLiveblocksErrorMessage(legacy.data);
			return NextResponse.json(
				{
					error: apiMessage || "Failed to authorize Liveblocks room",
					details: legacy.data,
					liveblocksStatus: legacy.response.status,
					endpoint: legacy.endpoint,
				},
				{ status: legacy.response.status || 502 },
			);
		}

		return NextResponse.json({
			roomId,
			auth: legacy.data,
			workspaceId: access.workspaceId,
		});
	}

	if (!modern.response.ok) {
		const apiMessage = toLiveblocksErrorMessage(modern.data);
		return NextResponse.json(
			{
				error: apiMessage || "Failed to authorize Liveblocks room",
				details: modern.data,
				liveblocksStatus: modern.response.status,
				endpoint: modern.endpoint,
			},
			{ status: modern.response.status || 502 },
		);
	}

	return NextResponse.json({
		roomId,
		auth: modern.data,
		workspaceId: access.workspaceId,
	});
}
