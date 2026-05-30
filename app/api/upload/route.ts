import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type NextRequest, NextResponse } from "next/server";
import {
	normalizeWorkspaceSlug,
	requireAuthenticatedUser,
	requireWorkspaceAccessBySlug,
	resolveWorkspaceIdentity,
} from "@/lib/authz/workspace-access";
import { getPublicUrl, getR2ForWorkspace, type PublicAssetKind } from "@/lib/r2";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import {
	consumeUploadAccessKey,
	verifyUploadAccessKey,
} from "@/lib/security/upload-links";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MIME_PREFIXES = [
	"image/",
	"video/",
	"audio/",
	"application/pdf",
	"application/zip",
	"application/x-zip-compressed",
	"application/vnd.openxmlformats-officedocument",
	"application/vnd.ms-",
	"application/msword",
	"text/plain",
	"text/csv",
	"application/json",
	"application/octet-stream",
];

const SIGNED_LINK_ALLOWED_VIDEO_MIME_TYPES = new Set([
	"video/mp4",
	"video/webm",
	"video/quicktime",
	"video/x-matroska",
	"video/x-msvideo",
	"video/x-m4v",
	"video/mpeg",
]);

function normalizeContentType(contentType: string): string {
	return contentType.toLowerCase().split(";")[0]!.trim();
}

function isAllowedContentType(contentType: string): boolean {
	const normalized = normalizeContentType(contentType);
	return ALLOWED_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isAllowedSignedLinkContentType(contentType: string): boolean {
	const normalized = normalizeContentType(contentType);
	if (normalized.startsWith("image/")) return true;
	if (normalized.startsWith("audio/")) return true;
	return SIGNED_LINK_ALLOWED_VIDEO_MIME_TYPES.has(normalized);
}

const FALLBACK_MAX_SIZE_BYTES = 50 * 1024 * 1024;

const sanitizeFilename = (filename: string) =>
	filename
		.replace(/[/\\]/g, "_")
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.replace(/_+/g, "_")
		.slice(0, 180);

const resolveFilename = (...values: unknown[]) => {
	for (const value of values) {
		if (typeof value !== "string") continue;
		const trimmed = value.trim();
		if (trimmed.length > 0) return trimmed;
	}
	return "";
};

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

function detectAssetKindFromContentType(contentType: string): PublicAssetKind {
	return contentType.toLowerCase().startsWith("video/") ? "clip" : "file";
}

function resolveAssetKind(raw: unknown, contentType: string): PublicAssetKind {
	if (raw === "clip" || raw === "file") return raw;
	return detectAssetKindFromContentType(contentType);
}

type UploadAccessContext = {
	userId: string;
	workspaceId: string;
	workspaceSlug: string;
	mode: "member" | "signed-link";
	signedAccessKey?: string;
	signedAccessKeyExpiresAt?: number;
};

function hashKeyForRateLimit(input: string): string {
	return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

async function resolveUploadAccessByCreator(input: {
	creatorSlug: string;
	uploadAccessKey?: string | null;
}): Promise<UploadAccessContext | NextResponse> {
	const creatorSlug = normalizeWorkspaceSlug(input.creatorSlug);
	if (!creatorSlug) {
		return NextResponse.json({ error: "Missing creator slug" }, { status: 400 });
	}

	const accessKey = (input.uploadAccessKey || "").trim();
	if (accessKey) {
		const verification = verifyUploadAccessKey({
			key: accessKey,
			expectedCreatorSlug: creatorSlug,
		});
		if (verification.ok === false) {
			return NextResponse.json(
				{ error: "Invalid or expired upload key", code: verification.code },
				{ status: 401 },
			);
		}

		const workspace = await resolveWorkspaceIdentity({
			workspaceSlug: verification.creatorSlug,
		});
		if (!workspace) {
			return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
		}

		return {
			userId: `upload-key:${hashKeyForRateLimit(accessKey)}`,
			workspaceId: workspace.id,
			workspaceSlug: workspace.slug,
			mode: "signed-link",
			signedAccessKey: accessKey,
			signedAccessKeyExpiresAt: verification.expiresAt,
		};
	}

	const access = await requireWorkspaceAccessBySlug(creatorSlug);
	if (access instanceof NextResponse) return access;
	return { ...access, mode: "member" };
}

async function consumeSignedAccessKeyIfNeeded(
	access: UploadAccessContext,
): Promise<NextResponse | null> {
	if (access.mode !== "signed-link") return null;
	if (!access.signedAccessKey || !access.signedAccessKeyExpiresAt) {
		return NextResponse.json(
			{ error: "Invalid signed upload key context", code: "MALFORMED" },
			{ status: 401 },
		);
	}

	const consumeResult = await consumeUploadAccessKey({
		key: access.signedAccessKey,
		expiresAt: access.signedAccessKeyExpiresAt,
	});

	if (consumeResult.ok === true) return null;
	return NextResponse.json(
		{ error: "Invalid or expired upload key", code: consumeResult.code },
		{ status: 401 },
	);
}

export async function GET() {
	const userId = await requireAuthenticatedUser();
	if (userId instanceof NextResponse) return userId;
	return Response.json({
		status: "ok",
		service: "plattform-upload",
		timestamp: new Date().toISOString(),
	});
}

export async function POST(req: NextRequest) {
	try {
		const mode = req.nextUrl.searchParams.get("mode");

		// ── Direct upload ──────────────────────────────────────────────────────
		if (mode === "direct") {
			const contentType =
				req.headers.get("content-type") || "application/octet-stream";
			const filename =
				resolveFilename(
					req.nextUrl.searchParams.get("desiredFilename"),
					req.nextUrl.searchParams.get("filename"),
				) || "upload.bin";
			const creatorSlug = normalizeWorkspaceSlug(
				req.nextUrl.searchParams.get("creatorSlug") || "",
			);
			const uploadAccessKey = req.nextUrl.searchParams.get("key");
			const requestedVisibility =
				req.nextUrl.searchParams.get("visibility") === "public"
					? "public"
					: "private";
			const assetKind = resolveAssetKind(
				req.nextUrl.searchParams.get("assetKind"),
				contentType,
			);

			const access = await resolveUploadAccessByCreator({
				creatorSlug,
				uploadAccessKey,
			});
			if (access instanceof NextResponse) return access;

			const r2 = await getR2ForWorkspace(access.workspaceId);
			const visibility =
				access.mode === "signed-link" ? "private" : requestedVisibility;

			const limit = await checkRateLimit({
				tier: "files",
				route: "/api/upload:direct",
				userId: access.userId,
				workspaceId: access.workspaceId,
			});
			if (!limit.allowed) return rateLimitedResponse(limit);

			if (!isAllowedContentType(contentType)) {
				return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
			}
			if (access.mode === "signed-link" && !isAllowedSignedLinkContentType(contentType)) {
				return NextResponse.json(
					{ error: "Signed upload links allow only images and common video formats" },
					{ status: 415 },
				);
			}

			if (!req.body) {
				return NextResponse.json({ error: "Missing file body" }, { status: 400 });
			}

			const contentLength = Number(req.headers.get("content-length") || "0");
			const size =
				Number.isFinite(contentLength) && contentLength > 0 ? contentLength : 0;

			const effectiveMaxSize =
				r2.maxFileSizeBytes > 0 ? r2.maxFileSizeBytes : FALLBACK_MAX_SIZE_BYTES;
			if (size > 0 && size > effectiveMaxSize) {
				return NextResponse.json({ error: "File too large" }, { status: 413 });
			}
			if (size === 0 && effectiveMaxSize > 0) {
				return NextResponse.json(
					{ error: "Content-Length header is required" },
					{ status: 411 },
				);
			}

			const consumeFailure = await consumeSignedAccessKeyIfNeeded(access);
			if (consumeFailure) return consumeFailure;

			const key = buildObjectKey(access.workspaceSlug, filename);
			const command = new PutObjectCommand({
				Bucket: r2.bucketName,
				Key: key,
				Body: Readable.fromWeb(req.body as any),
				ContentType: contentType,
				ContentLength: size,
			});
			await r2.client.send(command);
			const publicUrl = getPublicUrl(r2.publicBaseUrl, key);

			return NextResponse.json({
				key,
				filename,
				contentType,
				size,
				visibility,
				assetKind,
				publicUrl,
			});
		}

		// ── Presigned upload ───────────────────────────────────────────────────
		const origin = req.headers.get("origin");
		const body = await req.json();
		const filename = resolveFilename(body?.desiredFilename, body?.filename);
		const contentType =
			typeof body?.contentType === "string"
				? body.contentType
				: "application/octet-stream";
		const size = typeof body?.size === "number" ? body.size : 0;
		const creatorSlug = normalizeWorkspaceSlug(
			typeof body?.creatorSlug === "string" ? body.creatorSlug : "",
		);
		const uploadAccessKey = typeof body?.key === "string" ? body.key : "";
		const requestedVisibility =
			body?.visibility === "public" ? "public" : "private";
		const assetKind = resolveAssetKind(body?.assetKind, contentType);

		const access = await resolveUploadAccessByCreator({
			creatorSlug,
			uploadAccessKey,
		});
		if (access instanceof NextResponse) return access;

		const r2 = await getR2ForWorkspace(access.workspaceId);
		const visibility =
			access.mode === "signed-link" ? "private" : requestedVisibility;

		const limit = await checkRateLimit({
			tier: "files",
			route: "/api/upload:presign",
			userId: access.userId,
			workspaceId: access.workspaceId,
		});
		if (!limit.allowed) return rateLimitedResponse(limit);

		if (!isAllowedContentType(contentType)) {
			return NextResponse.json({ error: "File type not allowed" }, { status: 415 });
		}
		if (access.mode === "signed-link" && !isAllowedSignedLinkContentType(contentType)) {
			return NextResponse.json(
				{ error: "Signed upload links allow only images and common video formats" },
				{ status: 415 },
			);
		}

		if (!filename || !size) {
			return NextResponse.json({ error: "Missing filename or size" }, { status: 400 });
		}

		const effectiveMaxSizePresign =
			r2.maxFileSizeBytes > 0 ? r2.maxFileSizeBytes : FALLBACK_MAX_SIZE_BYTES;
		if (effectiveMaxSizePresign > 0 && size > effectiveMaxSizePresign) {
			return NextResponse.json({ error: "File too large" }, { status: 413 });
		}

		const consumeFailure = await consumeSignedAccessKeyIfNeeded(access);
		if (consumeFailure) return consumeFailure;

		const key = buildObjectKey(access.workspaceSlug, filename);
		const command = new PutObjectCommand({
			Bucket: r2.bucketName,
			Key: key,
			ContentType: contentType,
		});

		const uploadUrl = await getSignedUrl(r2.client, command, {
			expiresIn: r2.presignedTtlSeconds,
		});

		const publicUrl = getPublicUrl(r2.publicBaseUrl, key);

		return NextResponse.json({
			uploadUrl,
			key,
			filename,
			contentType,
			size,
			visibility,
			assetKind,
			publicUrl,
		});
	} catch (error: any) {
		console.error("❌ Upload error:", error);
		return NextResponse.json(
			{ error: "Upload failed", details: error?.message },
			{ status: 500 },
		);
	}
}
