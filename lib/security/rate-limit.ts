import "server-only";

import { NextResponse } from "next/server";

export type RateLimitTier = "ai" | "links" | "read" | "files";

type RateLimitPreset = {
	userLimit: number;
	workspaceLimit: number;
	windowMs: number;
};

type RateLimitBucket = {
	count: number;
	resetAt: number;
};

const PRESETS: Record<RateLimitTier, RateLimitPreset> = {
	ai: { userLimit: 30, workspaceLimit: 180, windowMs: 60_000 },
	links: { userLimit: 90, workspaceLimit: 540, windowMs: 60_000 },
	files: { userLimit: 60, workspaceLimit: 360, windowMs: 60_000 },
	read: { userLimit: 180, workspaceLimit: 1_080, windowMs: 60_000 },
};

const buckets = new Map<string, RateLimitBucket>();
let lastSweepAt = Date.now();

function sweepExpiredBuckets(now: number) {
	if (now - lastSweepAt < 30_000) return;
	lastSweepAt = now;

	for (const [key, bucket] of buckets.entries()) {
		if (bucket.resetAt <= now) {
			buckets.delete(key);
		}
	}
}

export type RateLimitInput = {
	tier: RateLimitTier;
	route: string;
	userId: string;
	workspaceId: string;
};

export type RateLimitResult = {
	allowed: boolean;
	limit: number;
	remaining: number;
	resetAt: number;
	backend: "memory" | "upstash";
	scopeResults: Array<{
		scope: "user" | "workspace";
		limit: number;
		remaining: number;
		resetAt: number;
		current: number;
	}>;
};

type RateLimitScopeInput = {
	tier: RateLimitTier;
	route: string;
	limit: number;
	scope: "user" | "workspace";
	scopeId: string;
	windowMs: number;
};

type ScopeEvaluation = {
	scope: "user" | "workspace";
	limit: number;
	remaining: number;
	resetAt: number;
	current: number;
};

type UpstashConfig = {
	url: string;
	token: string;
};

let hasWarnedAboutMemoryFallbackInProduction = false;

function getUpstashConfig(): UpstashConfig | null {
	const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
	const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
	if (!url || !token) return null;
	return { url, token };
}

function parseBooleanFlag(value: string | undefined): boolean {
	if (!value) return false;
	const normalized = value.trim().toLowerCase();
	return (
		normalized === "1" ||
		normalized === "true" ||
		normalized === "yes" ||
		normalized === "on"
	);
}

function isProductionEnvironment(): boolean {
	const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
	if (vercelEnv === "production") return true;
	return process.env.NODE_ENV === "production";
}

function allowMemoryFallbackInProduction(): boolean {
	return parseBooleanFlag(process.env.OXOM_ALLOW_MEMORY_RATE_LIMIT_IN_PROD);
}

function sanitizeKeyPart(input: string) {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9:_-]/g, "_");
}

function buildRateLimitKey(input: RateLimitScopeInput): string {
	const route = sanitizeKeyPart(input.route);
	const scopeId = sanitizeKeyPart(input.scopeId);
	return `oxom:rl:${input.tier}:${route}:${input.scope}:${scopeId}`;
}

function evaluateMemoryBucket(input: RateLimitScopeInput): ScopeEvaluation {
	const now = Date.now();
	sweepExpiredBuckets(now);

	const key = buildRateLimitKey(input);
	const existing = buckets.get(key);

	if (!existing || existing.resetAt <= now) {
		const next: RateLimitBucket = {
			count: 1,
			resetAt: now + input.windowMs,
		};
		buckets.set(key, next);

		return {
			scope: input.scope,
			limit: input.limit,
			remaining: Math.max(input.limit - next.count, 0),
			resetAt: next.resetAt,
			current: next.count,
		};
	}

	existing.count += 1;

	return {
		scope: input.scope,
		limit: input.limit,
		remaining: Math.max(input.limit - existing.count, 0),
		resetAt: existing.resetAt,
		current: existing.count,
	};
}

function parseUpstashNumericResult(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	if (value && typeof value === "object" && "result" in value) {
		return parseUpstashNumericResult((value as { result?: unknown }).result);
	}
	return null;
}

async function evaluateUpstashBucket(
	config: UpstashConfig,
	input: RateLimitScopeInput,
): Promise<ScopeEvaluation | null> {
	const key = buildRateLimitKey(input);
	const windowSeconds = Math.max(Math.ceil(input.windowMs / 1_000), 1);
	const now = Date.now();

	const response = await fetch(`${config.url}/pipeline`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify([
			["INCR", key],
			["PTTL", key],
			["EXPIRE", key, String(windowSeconds), "NX"],
			["PTTL", key],
		]),
		cache: "no-store",
	}).catch(() => null);

	if (!response?.ok) return null;

	const payload = await response.json().catch(() => null);
	const results = Array.isArray(payload) ? payload : payload?.result;
	if (!Array.isArray(results)) return null;

	const count = parseUpstashNumericResult(results[0]);
	const ttlBefore = parseUpstashNumericResult(results[1]);
	const ttlAfter = parseUpstashNumericResult(results[3]);

	if (count === null) return null;

	const ttl =
		ttlAfter && ttlAfter > 0
			? ttlAfter
			: ttlBefore && ttlBefore > 0
				? ttlBefore
				: input.windowMs;
	return {
		scope: input.scope,
		limit: input.limit,
		remaining: Math.max(input.limit - count, 0),
		resetAt: now + ttl,
		current: count,
	};
}

function buildResult(
	scopes: ScopeEvaluation[],
	backend: "memory" | "upstash",
): RateLimitResult {
	const denied = scopes.filter((scope) => scope.current > scope.limit);
	const candidateScopes = denied.length > 0 ? denied : scopes;
	const resetAt = Math.max(...candidateScopes.map((scope) => scope.resetAt));

	return {
		allowed: denied.length === 0,
		limit: Math.min(...scopes.map((scope) => scope.limit)),
		remaining: Math.min(...scopes.map((scope) => scope.remaining)),
		resetAt,
		backend,
		scopeResults: scopes,
	};
}

function buildFailClosedResult(tier: RateLimitTier): RateLimitResult {
	const preset = PRESETS[tier];
	const resetAt = Date.now() + preset.windowMs;

	return {
		allowed: false,
		limit: Math.min(preset.userLimit, preset.workspaceLimit),
		remaining: 0,
		resetAt,
		backend: "memory",
		scopeResults: [
			{
				scope: "user",
				limit: preset.userLimit,
				remaining: 0,
				resetAt,
				current: preset.userLimit + 1,
			},
			{
				scope: "workspace",
				limit: preset.workspaceLimit,
				remaining: 0,
				resetAt,
				current: preset.workspaceLimit + 1,
			},
		],
	};
}

function buildScopeInputs(
	input: RateLimitInput,
): [RateLimitScopeInput, RateLimitScopeInput] {
	const preset = PRESETS[input.tier];
	return [
		{
			tier: input.tier,
			route: input.route,
			limit: preset.userLimit,
			scope: "user",
			scopeId: input.userId,
			windowMs: preset.windowMs,
		},
		{
			tier: input.tier,
			route: input.route,
			limit: preset.workspaceLimit,
			scope: "workspace",
			scopeId: input.workspaceId,
			windowMs: preset.windowMs,
		},
	];
}

export async function checkRateLimit(
	input: RateLimitInput,
): Promise<RateLimitResult> {
	const scopes = buildScopeInputs(input);
	const upstash = getUpstashConfig();

	if (upstash) {
		const [userScope, workspaceScope] = await Promise.all(
			scopes.map((scopeInput) => evaluateUpstashBucket(upstash, scopeInput)),
		);

		if (userScope && workspaceScope) {
			return buildResult([userScope, workspaceScope], "upstash");
		}
	}

	if (isProductionEnvironment() && !allowMemoryFallbackInProduction()) {
		if (!hasWarnedAboutMemoryFallbackInProduction) {
			hasWarnedAboutMemoryFallbackInProduction = true;
			console.error(
				"[rate-limit] Missing Upstash backend in production. Failing closed. " +
					"Set OXOM_ALLOW_MEMORY_RATE_LIMIT_IN_PROD=true to allow fallback.",
			);
		}
		return buildFailClosedResult(input.tier);
	}

	return buildResult(
		scopes.map((scopeInput) => evaluateMemoryBucket(scopeInput)),
		"memory",
	);
}

export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
	const retryAfterSeconds = Math.max(
		Math.ceil((result.resetAt - Date.now()) / 1_000),
		1,
	);

	return {
		"X-RateLimit-Limit": String(result.limit),
		"X-RateLimit-Remaining": String(result.remaining),
		"X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
		"X-RateLimit-Backend": result.backend,
		"Retry-After": String(retryAfterSeconds),
	};
}

export function rateLimitedResponse(result: RateLimitResult) {
	return NextResponse.json(
		{ error: "Rate limit exceeded. Please retry shortly." },
		{
			status: 429,
			headers: createRateLimitHeaders(result),
		},
	);
}
