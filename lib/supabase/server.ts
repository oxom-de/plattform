import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
	const url =
		process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
		process.env.SUPABASE_URL?.trim();

	if (!url) {
		throw new Error("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is not set.");
	}

	return url;
}

function getSupabaseAnonKey() {
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

	if (!anonKey) {
		throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
	}

	return anonKey;
}

function getSupabaseServiceRoleKey() {
	const serviceRoleKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
		process.env.SUPABASE_SERVICE_KEY?.trim();

	if (!serviceRoleKey) {
		throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
	}

	return serviceRoleKey;
}

async function getServerClerkBearerToken(): Promise<string | null> {
	try {
		const authState = await auth();
		if (!authState?.getToken) return null;

		const template =
			process.env.CLERK_SUPABASE_JWT_TEMPLATE?.trim() || "supabase";
		const supabaseTemplateToken = await authState.getToken({ template });
		if (supabaseTemplateToken) {
			return supabaseTemplateToken;
		}

		return (await authState.getToken()) || null;
	} catch {
		return null;
	}
}

function createServerSupabaseAnonClientWithOptionalToken(token: string | null) {
	const url = getSupabaseUrl();
	const anonKey = getSupabaseAnonKey();
	const headers: Record<string, string> = token
		? { Authorization: `Bearer ${token}` }
		: {};

	return createClient(url, anonKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
		global: {
			headers,
		},
	});
}

export async function createServerSupabaseClientWithClerk() {
	const token = await getServerClerkBearerToken();
	return createServerSupabaseAnonClientWithOptionalToken(token);
}

export function createServerSupabaseClient() {
	const url = getSupabaseUrl();
	const anonKey = getSupabaseAnonKey();

	return createClient(url, anonKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
		global: {
			fetch: async (input, init) => {
				const token = await getServerClerkBearerToken();
				const headers = new Headers(init?.headers || {});

				if (token) {
					headers.set("Authorization", `Bearer ${token}`);
				}

				return fetch(input, {
					...init,
					headers,
				});
			},
		},
	});
}

export function createServerSupabaseAdminClient() {
	const url = getSupabaseUrl();
	const serviceRoleKey = getSupabaseServiceRoleKey();

	return createClient(url, serviceRoleKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}

// ── easystretcher-prod DB ─────────────────────────────────────────────────────

export function createEasystretcherSupabaseAdminClient() {
	const url = process.env.EASYSTRETCHER_SUPABASE_URL?.trim();
	const key = process.env.EASYSTRETCHER_SUPABASE_SERVICE_ROLE_KEY?.trim();

	if (!url) throw new Error("EASYSTRETCHER_SUPABASE_URL is not set.");
	if (!key) throw new Error("EASYSTRETCHER_SUPABASE_SERVICE_ROLE_KEY is not set.");

	return createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}
