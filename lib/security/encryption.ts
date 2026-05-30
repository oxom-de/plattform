import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCODING = "base64" as const;

function getEncryptionKey(): Buffer {
	const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY;
	if (!raw) {
		throw new Error("INTEGRATIONS_ENCRYPTION_KEY is not set");
	}
	const key = Buffer.from(raw, "base64");
	if (key.length !== 32) {
		throw new Error(
			"INTEGRATIONS_ENCRYPTION_KEY must be exactly 32 bytes (base64-encoded)",
		);
	}
	return key;
}

export function encrypt(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv, {
		authTagLength: AUTH_TAG_LENGTH,
	});

	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	const packed = Buffer.concat([iv, authTag, encrypted]);
	return packed.toString(ENCODING);
}

export function decrypt(encoded: string): string {
	const key = getEncryptionKey();
	const packed = Buffer.from(encoded, ENCODING);

	if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
		throw new Error("Invalid encrypted payload: too short");
	}

	const iv = packed.subarray(0, IV_LENGTH);
	const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITHM, key, iv, {
		authTagLength: AUTH_TAG_LENGTH,
	});
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([
		decipher.update(ciphertext),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}

export function deriveSecretHint(secret: string, visibleChars = 3): string {
	if (secret.length <= visibleChars * 2) return "***";
	const prefix = secret.slice(0, visibleChars);
	const suffix = secret.slice(-visibleChars);
	return `${prefix}...${suffix}`;
}
