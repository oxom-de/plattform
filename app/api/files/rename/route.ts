import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import {
	extractWorkspaceSlugFromObjectKey,
	requireWorkspaceAccessBySlug,
} from "@/lib/authz/workspace-access";
import { getPublicUrl, getR2ForWorkspace } from "@/lib/r2";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const sanitizeFilename = (filename: string) =>
	filename
		.replace(/[/\\]/g, "_")
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.replace(/_+/g, "_")
		.slice(0, 180);

const buildObjectKey = (creatorSlug: string, filename: string) => {
	const safeCreator = creatorSlug
		.toLowerCase()
		.replace(/[^a-z0-9-_]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 64);
	const safeName = sanitizeFilename(filename);
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const uuid = crypto.randomUUID();
	return `${safeCreator || "unknown"}/${timestamp}-${uuid}-${safeName}`;
};

const encodeCopySourceKey = (key: string) =>
	key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const key = typeof body?.key === "string" ? body.key.trim() : "";
		const newFilenameRaw =
			typeof body?.newFilename === "string" ? body.newFilename.trim() : "";
		const newFilename = sanitizeFilename(newFilenameRaw);

		if (!key || !newFilename) {
			return NextResponse.json(
				{ error: "Missing key or newFilename" },
				{ status: 400 },
			);
		}

		const keyWorkspaceSlug = extractWorkspaceSlugFromObjectKey(key);
		const access = await requireWorkspaceAccessBySlug(keyWorkspaceSlug);
		if (access instanceof NextResponse) return access;

		const limit = await checkRateLimit({
			tier: "files",
			route: "/api/files/rename",
			userId: access.userId,
			workspaceId: access.workspaceId,
		});
		if (!limit.allowed) return rateLimitedResponse(limit);

		const r2 = await getR2ForWorkspace(access.workspaceId);
		const newKey = buildObjectKey(access.workspaceSlug, newFilename);
		const copySourceKey = encodeCopySourceKey(key);

		await r2.client.send(
			new CopyObjectCommand({
				Bucket: r2.bucketName,
				CopySource: `${r2.bucketName}/${copySourceKey}`,
				Key: newKey,
				MetadataDirective: "COPY",
			}),
		);

		await r2.client.send(
			new DeleteObjectCommand({
				Bucket: r2.bucketName,
				Key: key,
			}),
		);

		const publicUrl = getPublicUrl(r2.publicBaseUrl, newKey);

		return NextResponse.json({
			key: newKey,
			previousKey: key,
			filename: newFilename,
			publicUrl,
		});
	} catch (error: any) {
		console.error("❌ Files rename error:", error);
		return NextResponse.json(
			{ error: "Failed to rename file", details: error?.message },
			{ status: 500 },
		);
	}
}
