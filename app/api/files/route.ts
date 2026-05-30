import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import {
	normalizeWorkspaceSlug,
	requireWorkspaceAccessBySlug,
} from "@/lib/authz/workspace-access";
import { getR2ForWorkspace } from "@/lib/r2";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
	try {
		const rawCreatorSlug = req.nextUrl.searchParams.get("creatorSlug") || "";
		const creatorSlug = normalizeWorkspaceSlug(rawCreatorSlug);
		const limitParam = Number(req.nextUrl.searchParams.get("limit") || "25");
		const limit = Number.isFinite(limitParam)
			? Math.min(Math.max(limitParam, 1), 100)
			: 25;

		if (!creatorSlug) {
			return NextResponse.json(
				{ error: "Missing creatorSlug" },
				{ status: 400 },
			);
		}

		const access = await requireWorkspaceAccessBySlug(creatorSlug);
		if (access instanceof NextResponse) return access;

		const routeLimit = await checkRateLimit({
			tier: "read",
			route: "/api/files",
			userId: access.userId,
			workspaceId: access.workspaceId,
		});
		if (!routeLimit.allowed) return rateLimitedResponse(routeLimit);

		const r2 = await getR2ForWorkspace(access.workspaceId);
		const prefix = `${access.workspaceSlug}/`;
		const command = new ListObjectsV2Command({
			Bucket: r2.bucketName,
			Prefix: prefix,
			MaxKeys: limit,
		});

		const response = await r2.client.send(command);
		const files = (response.Contents || [])
			.filter((item) => {
				if (!item.Key) return false;
				if (item.Key.endsWith("/")) return false;
				return true;
			})
			.sort((a, b) => {
				const aTime = a.LastModified ? new Date(a.LastModified).getTime() : 0;
				const bTime = b.LastModified ? new Date(b.LastModified).getTime() : 0;
				return bTime - aTime;
			})
			.map((item) => ({
				key: item.Key as string,
				size: item.Size ?? 0,
				lastModified: item.LastModified
					? new Date(item.LastModified).toISOString()
					: null,
			}));

		return NextResponse.json({
			creatorSlug: access.workspaceSlug,
			prefix,
			files,
			truncated: Boolean(response.IsTruncated),
		});
	} catch (error: any) {
		console.error("❌ Files list error:", error);
		return NextResponse.json(
			{ error: "Failed to list files", details: error?.message },
			{ status: 500 },
		);
	}
}
