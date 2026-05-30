import { createClient } from "@supabase/supabase-js";

function getSupabaseBrowserConfig() {
	const url =
		process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
		process.env.SUPABASE_URL?.trim();
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

	if (!url) {
		throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
	}

	if (!anonKey) {
		throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
	}

	return {
		url,
		anonKey,
	};
}

export function createBrowserSupabaseClient() {
	const { url, anonKey } = getSupabaseBrowserConfig();

	return createClient(url, anonKey);
}

export type TokenGetter = () => Promise<string | null> | string | null;

export function getAuthedSupabaseBrowserClient(token: string | null) {
	const { url, anonKey } = getSupabaseBrowserConfig();
	const headers: Record<string, string> = token
		? { Authorization: `Bearer ${token}` }
		: {};

	return createClient(url, anonKey, {
		global: {
			headers,
		},
	});
}

// Clerk bridge for browser RLS queries.
export function createBrowserSupabaseClientWithClerk(getToken: TokenGetter) {
	const { url, anonKey } = getSupabaseBrowserConfig();

	return createClient(url, anonKey, {
		global: {
			fetch: async (input, init) => {
				const token = await getToken();
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

// Backward-compatible alias.
export const createBrowserSupabaseWithAuth =
	createBrowserSupabaseClientWithClerk;
