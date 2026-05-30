import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import { getWorkspaceIntegrationSecret } from "@/lib/integrations/workspace-integrations";

export type PublicAssetKind = "file" | "clip";

export type R2Config = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
	publicBaseUrl: string;
	/** Optional custom endpoint — defaults to Cloudflare R2. Set for S3-compatible providers. */
	endpoint?: string;
};

// ── Operator defaults from env (fallback if workspace has no BYOK config) ──

function getOperatorConfig(): R2Config | null {
	const accountId = process.env.R2_ACCOUNT_ID?.trim();
	const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
	const bucketName = process.env.R2_BUCKET_NAME?.trim();
	const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim() ?? "";

	if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
		return null;
	}

	const jurisdiction = process.env.R2_JURISDICTION?.trim();
	const normalizedJurisdiction =
		jurisdiction && jurisdiction.length > 0
			? `.${jurisdiction.toLowerCase()}`
			: "";

	const endpoint =
		process.env.R2_ENDPOINT?.trim() ||
		`https://${accountId}${normalizedJurisdiction}.r2.cloudflarestorage.com`;

	return { accountId, accessKeyId, secretAccessKey, bucketName, publicBaseUrl, endpoint };
}

// ── Per-workspace BYOK config from workspace_integrations ──

async function getWorkspaceR2Config(workspaceId: string): Promise<R2Config | null> {
	try {
		const secret = await getWorkspaceIntegrationSecret(workspaceId, "r2");
		if (!secret) return null;
		const parsed = JSON.parse(secret) as Partial<R2Config>;
		if (
			!parsed.accountId ||
			!parsed.accessKeyId ||
			!parsed.secretAccessKey ||
			!parsed.bucketName
		) {
			return null;
		}
		return {
			accountId: parsed.accountId,
			accessKeyId: parsed.accessKeyId,
			secretAccessKey: parsed.secretAccessKey,
			bucketName: parsed.bucketName,
			publicBaseUrl: parsed.publicBaseUrl ?? "",
			endpoint:
				parsed.endpoint ||
				`https://${parsed.accountId}.r2.cloudflarestorage.com`,
		};
	} catch {
		return null;
	}
}

function buildS3Client(config: R2Config): S3Client {
	return new S3Client({
		region: "auto",
		endpoint: config.endpoint,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
		forcePathStyle: true,
		requestChecksumCalculation: "WHEN_REQUIRED",
		responseChecksumValidation: "WHEN_REQUIRED",
	});
}

// ── Public API ──

export type ResolvedR2 = {
	client: S3Client;
	bucketName: string;
	publicBaseUrl: string;
	presignedTtlSeconds: number;
	maxFileSizeBytes: number;
};

/**
 * Returns an S3Client and config for a workspace.
 * Uses workspace BYOK credentials if configured, falls back to operator env vars.
 * Throws if neither is available.
 */
export async function getR2ForWorkspace(workspaceId: string): Promise<ResolvedR2> {
	const config =
		(await getWorkspaceR2Config(workspaceId)) ?? getOperatorConfig();

	if (!config) {
		throw new Error(
			"No storage configured for this workspace. Add your credentials in Settings → Drive.",
		);
	}

	return {
		client: buildS3Client(config),
		bucketName: config.bucketName,
		publicBaseUrl: (config.publicBaseUrl ?? "").replace(/\/$/, ""),
		presignedTtlSeconds: Number(process.env.R2_PRESIGNED_TTL_SECONDS || "3600"),
		maxFileSizeBytes: Number(process.env.R2_MAX_FILE_SIZE_BYTES || "0"),
	};
}

export function getPublicUrl(publicBaseUrl: string, key: string): string | null {
	const base = publicBaseUrl.replace(/\/$/, "");
	return base ? `${base}/${key}` : null;
}
