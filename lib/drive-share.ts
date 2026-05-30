import { createHmac } from "node:crypto";

const DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const DRIVE_HOST =
	process.env.R2_PUBLIC_BASE_URL_FILES?.trim().replace(/\/$/, "") ||
	"https://drive.oxom.co";

function getSecret(): string {
	const secret = process.env.CDN_SHARE_SECRET?.trim();
	if (!secret) throw new Error("CDN_SHARE_SECRET is not set");
	return secret;
}

/**
 * Creates a signed share token for a given R2 object key.
 * Format: "{exp_unix_seconds}.{base64url_hmac_sha256}"
 * Signed payload: "{key}:{exp_unix_seconds}"
 */
export function createShareToken(
	key: string,
	expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
): string {
	const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
	const payload = `${key}:${exp}`;
	const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
	return `${exp}.${sig}`;
}

/**
 * Returns a fully-qualified public share URL for a Drive file.
 */
export function createShareUrl(
	key: string,
	expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
): string {
	const token = createShareToken(key, expiresInSeconds);
	return `${DRIVE_HOST}/${key}?token=${token}`;
}

/**
 * Expiry presets for common use cases.
 */
export const SHARE_EXPIRY = {
	oneHour: 60 * 60,
	oneDay: 24 * 60 * 60,
	sevenDays: 7 * 24 * 60 * 60,
	thirtyDays: 30 * 24 * 60 * 60,
} as const;
