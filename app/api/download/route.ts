import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type NextRequest, NextResponse } from "next/server";
import {
	extractWorkspaceSlugFromObjectKey,
	requireWorkspaceAccessBySlug,
} from "@/lib/authz/workspace-access";
import { getR2ForWorkspace } from "@/lib/r2";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const key = typeof body?.key === "string" ? body.key : "";
		const asAttachment = body?.mode === "download";

		if (!key) {
			return NextResponse.json({ error: "Missing key" }, { status: 400 });
		}

		const keyWorkspaceSlug = extractWorkspaceSlugFromObjectKey(key);
		const access = await requireWorkspaceAccessBySlug(keyWorkspaceSlug);
		if (access instanceof NextResponse) return access;

		const limit = await checkRateLimit({
			tier: "files",
			route: "/api/download",
			userId: access.userId,
			workspaceId: access.workspaceId,
		});
		if (!limit.allowed) return rateLimitedResponse(limit);

		const r2 = await getR2ForWorkspace(access.workspaceId);
		const filenameFromKey = key.split("/").pop() || "download.bin";
		const command = new GetObjectCommand({
			Bucket: r2.bucketName,
			Key: key,
			...(asAttachment
				? {
						ResponseContentDisposition: `attachment; filename="${filenameFromKey}"`,
					}
				: {}),
		});

		const downloadUrl = await getSignedUrl(r2.client, command, {
			expiresIn: r2.presignedTtlSeconds,
		});

		return NextResponse.json({ downloadUrl, key });
	} catch (error: any) {
		console.error("❌ Download error:", error);
		return NextResponse.json(
			{ error: "Download failed", details: error?.message },
			{ status: 500 },
		);
	}
}
