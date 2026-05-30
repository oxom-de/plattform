import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { normalizeWorkspaceSlug } from "@/lib/tenant/tenant-utils";

const UPLOAD_LINK_VERSION = "v1";
const DEFAULT_EXPIRES_IN_SECONDS = 4 * 60 * 60; // 4 hours
const UPLOAD_LINK_STATE_PREFIX = "oxom:upload-link";
const UPLOAD_LINK_INDEX_PREFIX = "oxom:upload-link:index";
const UPLOAD_LINK_INDEX_MAX_RECORDS = 40;
const UPLOAD_LINK_INDEX_RETENTION_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type UploadLinkPayload = {
	v: typeof UPLOAD_LINK_VERSION;
	c: string;
	exp: number;
};

export type UploadLinkVerificationResult =
	| {
			ok: true;
			creatorSlug: string;
			expiresAt: number;
			keyFingerprint: string;
	  }
	| {
			ok: false;
			code:
				| "MISSING_SECRET"
				| "MALFORMED"
				| "INVALID_SIGNATURE"
				| "INVALID_PAYLOAD"
				| "EXPIRED"
				| "CREATOR_MISMATCH";
	  };

export type UploadLinkStateCode = "REVOKED" | "ALREADY_USED";

type UploadLinkStateCheckResult =
	| { ok: true }
	| { ok: false; code: UploadLinkStateCode };

type UploadLinkStoreState = "revoked" | "used";

export type UploadLinkOverviewStatus =
	| "active"
	| "used"
	| "revoked"
	| "expired";

type UploadLinkIssueRecord = {
	fingerprint: string;
	creatorSlug: string;
	createdAt: number;
	expiresAt: number;
};

export type UploadLinkIssueSummary = {
	fingerprint: string;
	keyLabel: string;
	creatorSlug: string;
	createdAt: number;
	expiresAt: number;
	status: UploadLinkOverviewStatus;
};

type UpstashConfig = {
	url: string;
	token: string;
};

type MemoryStateEntry = {
	state: UploadLinkStoreState;
	expiresAtMs: number;
};

const uploadLinkStateMemory = new Map<string, MemoryStateEntry>();
const uploadLinkIndexMemory = new Map<string, UploadLinkIssueRecord[]>();

function resolveUploadLinkSecret(): string | null {
	const secret =
		process.env.UPLOAD_LINK_SECRET?.trim() ||
		process.env.OXOM_UPLOAD_LINK_SECRET?.trim() ||
		"";
	return secret || null;
}

function signPayloadSegment(payloadSegment: string, secret: string): string {
	return createHmac("sha256", secret)
		.update(payloadSegment)
		.digest("base64url");
}

function encodePayload(payload: UploadLinkPayload): string {
	return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): UploadLinkPayload | null {
	try {
		const raw = Buffer.from(value, "base64url").toString("utf8");
		const parsed = JSON.parse(raw) as Partial<UploadLinkPayload>;
		if (!parsed || typeof parsed !== "object") return null;
		if (parsed.v !== UPLOAD_LINK_VERSION) return null;
		if (typeof parsed.c !== "string") return null;
		if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp))
			return null;
		const creatorSlug = normalizeWorkspaceSlug(parsed.c);
		if (!creatorSlug) return null;
		return {
			v: UPLOAD_LINK_VERSION,
			c: creatorSlug,
			exp: Math.floor(parsed.exp),
		};
	} catch {
		return null;
	}
}

function getUpstashConfig(): UpstashConfig | null {
	const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
	const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
	if (!url || !token) return null;
	return { url, token };
}

function toFingerprint(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function getStateStorageKey(fingerprint: string): string {
	return `${UPLOAD_LINK_STATE_PREFIX}:${fingerprint}`;
}

function getIndexStorageKey(creatorSlug: string): string {
	return `${UPLOAD_LINK_INDEX_PREFIX}:${creatorSlug}`;
}

function toKeyLabel(fingerprint: string): string {
	return fingerprint.slice(0, 12);
}

function parseUpstashResultValue(entry: unknown): unknown {
	if (entry && typeof entry === "object" && "result" in entry) {
		return (entry as { result?: unknown }).result;
	}
	return entry;
}

async function runUpstashPipeline(
	commands: unknown[][],
): Promise<unknown[] | null> {
	const config = getUpstashConfig();
	if (!config) return null;

	const response = await fetch(`${config.url}/pipeline`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(commands),
		cache: "no-store",
	}).catch(() => null);

	if (!response?.ok) return null;

	const payload = await response.json().catch(() => null);
	const results = Array.isArray(payload) ? payload : payload?.result;
	if (!Array.isArray(results)) return null;
	return results.map(parseUpstashResultValue);
}

function sweepExpiredMemoryStates(nowMs: number) {
	for (const [key, entry] of uploadLinkStateMemory.entries()) {
		if (entry.expiresAtMs <= nowMs) {
			uploadLinkStateMemory.delete(key);
		}
	}
}

function sweepExpiredMemoryIssues(nowMs: number) {
	const retentionMs = UPLOAD_LINK_INDEX_RETENTION_SECONDS * 1000;
	for (const [creatorSlug, records] of uploadLinkIndexMemory.entries()) {
		const filtered = records.filter(
			(record) => record.expiresAt + retentionMs > nowMs,
		);
		if (filtered.length === 0) {
			uploadLinkIndexMemory.delete(creatorSlug);
			continue;
		}
		if (filtered.length !== records.length) {
			uploadLinkIndexMemory.set(creatorSlug, filtered);
		}
	}
}

function getMemoryState(
	key: string,
	nowMs: number,
): UploadLinkStoreState | null {
	sweepExpiredMemoryStates(nowMs);
	const current = uploadLinkStateMemory.get(key);
	if (!current) return null;
	if (current.expiresAtMs <= nowMs) {
		uploadLinkStateMemory.delete(key);
		return null;
	}
	return current.state;
}

function setMemoryState(
	key: string,
	state: UploadLinkStoreState,
	expiresAtMs: number,
	options?: { onlyIfAbsent?: boolean },
): boolean {
	const nowMs = Date.now();
	const current = getMemoryState(key, nowMs);
	if (options?.onlyIfAbsent && current) {
		return false;
	}
	uploadLinkStateMemory.set(key, { state, expiresAtMs });
	return true;
}

function parseStoreState(value: unknown): UploadLinkStoreState | null {
	if (value === "revoked" || value === "used") return value;
	return null;
}

function stateToCode(state: UploadLinkStoreState): UploadLinkStateCode {
	return state === "revoked" ? "REVOKED" : "ALREADY_USED";
}

function statusFromState(input: {
	state: UploadLinkStoreState | null;
	expiresAtMs: number;
	nowMs: number;
}): UploadLinkOverviewStatus {
	if (input.state === "revoked") return "revoked";
	if (input.state === "used") return "used";
	if (input.expiresAtMs <= input.nowMs) return "expired";
	return "active";
}

function parseIssueRecord(value: unknown): UploadLinkIssueRecord | null {
	if (!value || typeof value !== "object") return null;

	const record = value as Partial<UploadLinkIssueRecord>;
	if (typeof record.fingerprint !== "string" || record.fingerprint.length < 12)
		return null;
	if (typeof record.creatorSlug !== "string") return null;
	if (
		typeof record.createdAt !== "number" ||
		!Number.isFinite(record.createdAt)
	)
		return null;
	if (
		typeof record.expiresAt !== "number" ||
		!Number.isFinite(record.expiresAt)
	)
		return null;

	const creatorSlug = normalizeWorkspaceSlug(record.creatorSlug);
	if (!creatorSlug) return null;

	return {
		fingerprint: record.fingerprint,
		creatorSlug,
		createdAt: Math.floor(record.createdAt),
		expiresAt: Math.floor(record.expiresAt),
	};
}

function dedupeIssueRecords(
	records: UploadLinkIssueRecord[],
): UploadLinkIssueRecord[] {
	const seen = new Set<string>();
	const deduped: UploadLinkIssueRecord[] = [];
	for (const record of records) {
		if (seen.has(record.fingerprint)) continue;
		seen.add(record.fingerprint);
		deduped.push(record);
	}
	return deduped;
}

function addMemoryIssueRecord(record: UploadLinkIssueRecord) {
	const nowMs = Date.now();
	sweepExpiredMemoryIssues(nowMs);

	const current = uploadLinkIndexMemory.get(record.creatorSlug) || [];
	const next = dedupeIssueRecords([record, ...current]).slice(
		0,
		UPLOAD_LINK_INDEX_MAX_RECORDS,
	);
	uploadLinkIndexMemory.set(record.creatorSlug, next);
}

async function checkUploadLinkState(input: {
	keyFingerprint: string;
	expiresAtMs: number;
}): Promise<UploadLinkStateCheckResult> {
	const storageKey = getStateStorageKey(input.keyFingerprint);
	const nowMs = Date.now();

	const pipeline = await runUpstashPipeline([["GET", storageKey]]);
	if (pipeline && pipeline.length > 0) {
		const state = parseStoreState(pipeline[0]);
		if (state) {
			return { ok: false, code: stateToCode(state) };
		}
		return { ok: true };
	}

	const memoryState = getMemoryState(storageKey, nowMs);
	if (memoryState) {
		return { ok: false, code: stateToCode(memoryState) };
	}
	return { ok: true };
}

async function consumeUploadLinkState(input: {
	keyFingerprint: string;
	expiresAtMs: number;
}): Promise<UploadLinkStateCheckResult> {
	const storageKey = getStateStorageKey(input.keyFingerprint);
	const nowMs = Date.now();
	const ttlSeconds = Math.max(1, Math.ceil((input.expiresAtMs - nowMs) / 1000));

	const pipeline = await runUpstashPipeline([
		["GET", storageKey],
		["SET", storageKey, "used", "NX", "EX", String(ttlSeconds)],
	]);

	if (pipeline && pipeline.length >= 2) {
		const existing = parseStoreState(pipeline[0]);
		if (existing) {
			return { ok: false, code: stateToCode(existing) };
		}

		const setResult = pipeline[1];
		if (setResult === "OK") {
			return { ok: true };
		}
		return { ok: false, code: "ALREADY_USED" };
	}

	const existingMemory = getMemoryState(storageKey, nowMs);
	if (existingMemory) {
		return { ok: false, code: stateToCode(existingMemory) };
	}

	const setOk = setMemoryState(storageKey, "used", input.expiresAtMs, {
		onlyIfAbsent: true,
	});
	if (!setOk) {
		return { ok: false, code: "ALREADY_USED" };
	}

	return { ok: true };
}

async function revokeUploadLinkState(input: {
	keyFingerprint: string;
	expiresAtMs: number;
}): Promise<void> {
	const storageKey = getStateStorageKey(input.keyFingerprint);
	const nowMs = Date.now();
	const ttlSeconds = Math.max(1, Math.ceil((input.expiresAtMs - nowMs) / 1000));

	const pipeline = await runUpstashPipeline([
		["SET", storageKey, "revoked", "EX", String(ttlSeconds)],
	]);

	if (pipeline && pipeline.length > 0) {
		return;
	}

	setMemoryState(storageKey, "revoked", input.expiresAtMs);
}

export function createUploadAccessKey(input: {
	creatorSlug: string;
	expiresInSeconds?: number;
	nowMs?: number;
}): string {
	const secret = resolveUploadLinkSecret();
	if (!secret) {
		throw new Error("Missing UPLOAD_LINK_SECRET");
	}

	const creatorSlug = normalizeWorkspaceSlug(input.creatorSlug);
	if (!creatorSlug) {
		throw new Error("Invalid creatorSlug");
	}

	const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
	const expiresInSeconds = Math.max(
		1,
		Math.floor(input.expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS),
	);
	const payload: UploadLinkPayload = {
		v: UPLOAD_LINK_VERSION,
		c: creatorSlug,
		exp: nowSeconds + expiresInSeconds,
	};

	const payloadSegment = encodePayload(payload);
	const signatureSegment = signPayloadSegment(payloadSegment, secret);
	return `${payloadSegment}.${signatureSegment}`;
}

export function verifyUploadAccessKey(input: {
	key: string;
	expectedCreatorSlug?: string | null;
	nowMs?: number;
}): UploadLinkVerificationResult {
	const secret = resolveUploadLinkSecret();
	if (!secret) {
		return { ok: false, code: "MISSING_SECRET" };
	}

	const rawKey = input.key.trim();
	if (!rawKey) {
		return { ok: false, code: "MALFORMED" };
	}

	const dotIndex = rawKey.indexOf(".");
	if (dotIndex <= 0 || dotIndex >= rawKey.length - 1) {
		return { ok: false, code: "MALFORMED" };
	}

	const payloadSegment = rawKey.slice(0, dotIndex);
	const signatureSegment = rawKey.slice(dotIndex + 1);
	const expectedSignature = signPayloadSegment(payloadSegment, secret);
	const providedBuffer = Buffer.from(signatureSegment);
	const expectedBuffer = Buffer.from(expectedSignature);
	if (
		providedBuffer.length !== expectedBuffer.length ||
		!timingSafeEqual(providedBuffer, expectedBuffer)
	) {
		return { ok: false, code: "INVALID_SIGNATURE" };
	}

	const payload = decodePayload(payloadSegment);
	if (!payload) {
		return { ok: false, code: "INVALID_PAYLOAD" };
	}

	const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
	if (payload.exp <= nowSeconds) {
		return { ok: false, code: "EXPIRED" };
	}

	const expectedCreatorSlug = normalizeWorkspaceSlug(input.expectedCreatorSlug);
	if (expectedCreatorSlug && expectedCreatorSlug !== payload.c) {
		return { ok: false, code: "CREATOR_MISMATCH" };
	}

	const keyFingerprint = toFingerprint(rawKey);

	return {
		ok: true,
		creatorSlug: payload.c,
		expiresAt: payload.exp * 1000,
		keyFingerprint,
	};
}

export async function checkUploadAccessKeyState(input: {
	key: string;
	expiresAt: number;
}): Promise<UploadLinkStateCheckResult> {
	const keyFingerprint = toFingerprint(input.key.trim());
	return checkUploadLinkState({
		keyFingerprint,
		expiresAtMs: input.expiresAt,
	});
}

export async function consumeUploadAccessKey(input: {
	key: string;
	expiresAt: number;
}): Promise<UploadLinkStateCheckResult> {
	const keyFingerprint = toFingerprint(input.key.trim());
	return consumeUploadLinkState({
		keyFingerprint,
		expiresAtMs: input.expiresAt,
	});
}

export async function revokeUploadAccessKey(input: {
	key: string;
	expiresAt: number;
}): Promise<void> {
	const keyFingerprint = toFingerprint(input.key.trim());
	await revokeUploadLinkState({
		keyFingerprint,
		expiresAtMs: input.expiresAt,
	});
}

export async function registerUploadAccessKeyIssue(input: {
	creatorSlug: string;
	key: string;
	expiresAt: number;
	createdAt?: number;
}): Promise<void> {
	const creatorSlug = normalizeWorkspaceSlug(input.creatorSlug);
	if (!creatorSlug) {
		throw new Error("Invalid creatorSlug");
	}

	const key = input.key.trim();
	if (!key) {
		throw new Error("Invalid key");
	}

	const createdAt = Math.floor(input.createdAt ?? Date.now());
	const expiresAt = Math.floor(input.expiresAt);
	if (
		!Number.isFinite(createdAt) ||
		!Number.isFinite(expiresAt) ||
		expiresAt <= createdAt
	) {
		throw new Error("Invalid timestamps");
	}
	const fingerprint = toFingerprint(key);

	const record: UploadLinkIssueRecord = {
		fingerprint,
		creatorSlug,
		createdAt,
		expiresAt,
	};

	const indexKey = getIndexStorageKey(creatorSlug);
	const recordPayload = JSON.stringify(record);

	const pipeline = await runUpstashPipeline([
		["LPUSH", indexKey, recordPayload],
		["LTRIM", indexKey, "0", String(UPLOAD_LINK_INDEX_MAX_RECORDS - 1)],
		["EXPIRE", indexKey, String(UPLOAD_LINK_INDEX_RETENTION_SECONDS)],
	]);

	if (pipeline && pipeline.length >= 2) {
		return;
	}

	addMemoryIssueRecord(record);
}

export async function listUploadAccessKeyIssues(input: {
	creatorSlug: string;
	limit?: number;
	nowMs?: number;
}): Promise<UploadLinkIssueSummary[]> {
	const creatorSlug = normalizeWorkspaceSlug(input.creatorSlug);
	if (!creatorSlug) {
		throw new Error("Invalid creatorSlug");
	}

	const rawLimit =
		typeof input.limit === "number" && Number.isFinite(input.limit)
			? input.limit
			: 12;
	const limit = Math.max(1, Math.min(50, Math.floor(rawLimit)));
	const nowMs = Math.floor(input.nowMs ?? Date.now());
	const indexKey = getIndexStorageKey(creatorSlug);

	let records: UploadLinkIssueRecord[] = [];

	const pipeline = await runUpstashPipeline([
		["LRANGE", indexKey, "0", String(limit - 1)],
	]);
	if (pipeline && Array.isArray(pipeline[0])) {
		const items = pipeline[0];
		records = items
			.map((item) => {
				if (typeof item !== "string") return null;
				try {
					const parsed = JSON.parse(item) as unknown;
					return parseIssueRecord(parsed);
				} catch {
					return null;
				}
			})
			.filter((entry): entry is UploadLinkIssueRecord => Boolean(entry))
			.slice(0, limit);
	} else {
		sweepExpiredMemoryIssues(nowMs);
		records = (uploadLinkIndexMemory.get(creatorSlug) || []).slice(0, limit);
	}

	const deduped = dedupeIssueRecords(records).slice(0, limit);
	if (deduped.length === 0) {
		return [];
	}

	const stateStorageKeys = deduped.map((record) =>
		getStateStorageKey(record.fingerprint),
	);
	const statePipeline = await runUpstashPipeline(
		stateStorageKeys.map((storageKey) => ["GET", storageKey]),
	);

	return deduped.map((record, index) => {
		const upstashState = statePipeline
			? parseStoreState(statePipeline[index])
			: null;
		const memoryState = upstashState
			? null
			: getMemoryState(getStateStorageKey(record.fingerprint), nowMs);

		const status = statusFromState({
			state: upstashState || memoryState,
			expiresAtMs: record.expiresAt,
			nowMs,
		});

		return {
			fingerprint: record.fingerprint,
			keyLabel: toKeyLabel(record.fingerprint),
			creatorSlug: record.creatorSlug,
			createdAt: record.createdAt,
			expiresAt: record.expiresAt,
			status,
		};
	});
}
