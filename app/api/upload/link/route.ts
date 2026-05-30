import { type NextRequest, NextResponse } from "next/server";
import {
	normalizeWorkspaceSlug,
	requireWorkspaceAccessBySlug,
} from "@/lib/authz/workspace-access";
import {
	createUploadAccessKey,
	listUploadAccessKeyIssues,
	registerUploadAccessKeyIssue,
} from "@/lib/security/upload-links";

export const runtime = "nodejs";

const LINK_TTL_SECONDS = 4 * 60 * 60; // 4 hours

export async function GET(req: NextRequest) {
	const creatorSlug = normalizeWorkspaceSlug(
		req.nextUrl.searchParams.get("creatorSlug") || "",
	);
	const limit = Number(req.nextUrl.searchParams.get("limit") || "12");

	if (!creatorSlug) {
		return NextResponse.json({ error: "Missing creatorSlug" }, { status: 400 });
	}

	const access = await requireWorkspaceAccessBySlug(creatorSlug);
	if (access instanceof NextResponse) return access;

	try {
		const links = await listUploadAccessKeyIssues({
			creatorSlug: access.workspaceSlug,
			limit,
		});
		return NextResponse.json(
			{
				creatorSlug: access.workspaceSlug,
				links,
			},
			{
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		return NextResponse.json(
			{
				error: "Failed to list upload links",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const creatorSlug = normalizeWorkspaceSlug(
		typeof body?.creatorSlug === "string" ? body.creatorSlug : "",
	);

	if (!creatorSlug) {
		return NextResponse.json({ error: "Missing creatorSlug" }, { status: 400 });
	}

	const access = await requireWorkspaceAccessBySlug(creatorSlug);
	if (access instanceof NextResponse) return access;

	let key = "";
	try {
		key = createUploadAccessKey({
			creatorSlug: access.workspaceSlug,
			expiresInSeconds: LINK_TTL_SECONDS,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Failed to create upload link",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}

	const uploadUrl = new URL("/upload", req.nextUrl.origin);
	uploadUrl.searchParams.set("creator", access.workspaceSlug);
	uploadUrl.searchParams.set("key", key);

	const expiresAtMs = Date.now() + LINK_TTL_SECONDS * 1_000;
	const expiresAt = new Date(expiresAtMs).toISOString();
	try {
		await registerUploadAccessKeyIssue({
			creatorSlug: access.workspaceSlug,
			key,
			expiresAt: expiresAtMs,
		});
	} catch {
		// Non-blocking: key remains valid even when history write fails.
	}

	return NextResponse.json(
		{
			creatorSlug: access.workspaceSlug,
			key,
			url: uploadUrl.toString(),
			expiresInSeconds: LINK_TTL_SECONDS,
			expiresAt,
		},
		{
			headers: {
				"Cache-Control": "no-store",
			},
		},
	);
}
