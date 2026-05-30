import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

type Workspace = {
	id: string;
	slug: string;
	name: string;
	plan: string;
};

const isPublicRoute = createRouteMatcher([
	"/sign-in(.*)",
	"/sign-up(.*)",
	"/unauthorized(.*)",
	"/_tenant-not-found(.*)",
	"/api(.*)",
]);

// ---------------------------------------------------------------------------
// Host helpers
// ---------------------------------------------------------------------------

const MAIN_APP_HOSTS = new Set(["app.oxom.de", "localhost", "127.0.0.1"]);

function normalizeHostname(host: string): string {
	const trimmed = host.trim().toLowerCase();
	if (!trimmed) return "";
	const withoutScheme = trimmed.replace(/^https?:\/\//, "");
	const [withoutPath] = withoutScheme.split("/");
	if (!withoutPath) return "";
	return withoutPath.replace(/:\d+$/, "").replace(/\.+$/, "");
}

function isMainAppHost(hostname: string): boolean {
	return MAIN_APP_HOSTS.has(hostname);
}

// ---------------------------------------------------------------------------
// In-memory cache (TTL 60s, per Edge instance)
// ---------------------------------------------------------------------------

const WORKSPACE_CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
	data: T;
	expires: number;
}

const slugCache = new Map<string, CacheEntry<Workspace | null>>();
const hostnameCache = new Map<string, CacheEntry<Workspace | null>>();

function getCached<T>(
	cache: Map<string, CacheEntry<T>>,
	key: string,
): T | undefined {
	const entry = cache.get(key);
	if (!entry) return undefined;
	if (Date.now() > entry.expires) {
		cache.delete(key);
		return undefined;
	}
	return entry.data;
}

function setCached<T>(
	cache: Map<string, CacheEntry<T>>,
	key: string,
	data: T,
): void {
	cache.set(key, { data, expires: Date.now() + WORKSPACE_CACHE_TTL_MS });
	if (cache.size > 500) {
		const now = Date.now();
		for (const [k, v] of cache) {
			if (now > v.expires) cache.delete(k);
		}
	}
}

// ---------------------------------------------------------------------------
// Supabase client (middleware/Edge safe)
// ---------------------------------------------------------------------------

function createProxySupabaseClient() {
	const url =
		process.env.SUPABASE_URL?.trim() ||
		process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
	const key =
		process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
		process.env.SUPABASE_SERVICE_KEY?.trim();
	if (!url || !key) return null;
	return createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

// ---------------------------------------------------------------------------
// Workspace resolution
// ---------------------------------------------------------------------------

async function resolveWorkspaceBySlug(
	slug: string,
): Promise<Workspace | null> {
	const normalized = slug.trim().toLowerCase();
	if (!normalized) return null;

	const cached = getCached(slugCache, normalized);
	if (cached !== undefined) return cached;

	const supabase = createProxySupabaseClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("workspaces")
		.select("id, slug, name, plan")
		.eq("slug", normalized)
		.maybeSingle<Workspace>();

	const result = error || !data ? null : data;
	setCached(slugCache, normalized, result);
	return result;
}

async function resolveWorkspaceByHostname(
	hostname: string,
): Promise<Workspace | null> {
	const normalized = normalizeHostname(hostname);
	if (!normalized) return null;

	// Custom domain: look up in domains table
	const cached = getCached(hostnameCache, normalized);
	if (cached !== undefined) return cached;

	const supabase = createProxySupabaseClient();
	if (!supabase) return null;

	const { data, error } = await supabase
		.from("domains")
		.select("workspace:workspaces(id, slug, name, plan)")
		.eq("hostname", normalized)
		.eq("purpose", "CUSTOM_DASHBOARD")
		.eq("verified", true)
		.maybeSingle<{ workspace: Workspace | null }>();

	const result = error || !data?.workspace ? null : data.workspace;
	setCached(hostnameCache, normalized, result);
	return result;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function withTenantHeaders(
	req: NextRequest,
	requestHeaders: Headers,
	workspace: Workspace | null,
	hostname: string,
	rewritePath?: string,
) {
	const resolvedPathname = rewritePath || req.nextUrl.pathname;

	requestHeaders.set("x-oxom-hostname", hostname);
	requestHeaders.set("x-oxom-pathname", resolvedPathname);
	if (workspace) {
		requestHeaders.set("x-oxom-workspace", workspace.slug);
	} else {
		requestHeaders.delete("x-oxom-workspace");
	}

	const response = rewritePath
		? NextResponse.rewrite(new URL(rewritePath, req.url), {
				request: { headers: requestHeaders },
			})
		: NextResponse.next({ request: { headers: requestHeaders } });

	response.headers.set("x-oxom-hostname", hostname);
	response.headers.set("x-oxom-pathname", resolvedPathname);
	if (workspace) response.headers.set("x-oxom-workspace", workspace.slug);
	return response;
}

function pathStartsWithWorkspace(
	pathname: string,
	workspaceSlug: string,
): boolean {
	return (
		pathname === `/${workspaceSlug}` ||
		pathname.startsWith(`/${workspaceSlug}/`)
	);
}

// Paths that must never be rewritten to a workspace prefix,
// even when accessed via a subdomain or custom domain.
const GLOBAL_PATHS = [
	"/sign-in",
	"/sign-up",
	"/sign-out",
	"/switcher",
	"/unauthorized",
	"/_tenant-not-found",
	"/onboarding",
	"/invite",
];

function isGlobalPath(pathname: string): boolean {
	return GLOBAL_PATHS.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export default clerkMiddleware(async (auth, req: NextRequest) => {
	const pathname = req.nextUrl.pathname;

	// Hard allow for external Meta webhook delivery (no Clerk session available).
	const isWhatsAppWebhookRoute = pathname.startsWith("/api/whatsapp");

	if (!isPublicRoute(req) && !isWhatsAppWebhookRoute) {
		await auth.protect();
	}

	const requestHeaders = new Headers(req.headers);
	const rawHost =
		req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
	const hostname = normalizeHostname(rawHost);

	if (!hostname) return NextResponse.next();

	// API routes: set tenant headers only, no rewrite
	if (pathname.startsWith("/api")) {
		let workspace: Workspace | null = null;
		if (isMainAppHost(hostname)) {
			const firstSegment = pathname.split("/").filter(Boolean)[0];
			if (firstSegment) workspace = await resolveWorkspaceBySlug(firstSegment);
		} else {
			workspace = await resolveWorkspaceByHostname(hostname);
		}
		return withTenantHeaders(req, requestHeaders, workspace, hostname);
	}

	// Main app host (app.oxom.de, localhost) — path-based routing
	if (isMainAppHost(hostname)) {
		const firstSegment = pathname.split("/").filter(Boolean)[0];
		if (firstSegment) {
			const workspace = await resolveWorkspaceBySlug(firstSegment);
			if (workspace) {
				return withTenantHeaders(req, requestHeaders, workspace, hostname);
			}
		}
		return withTenantHeaders(req, requestHeaders, null, hostname);
	}

	// Subdomain or custom domain routing
	const workspace = await resolveWorkspaceByHostname(hostname);
	if (!workspace) {
		return withTenantHeaders(
			req,
			requestHeaders,
			null,
			hostname,
			"/_tenant-not-found",
		);
	}

	// Global paths (/account, /organization, …) — never rewrite
	if (isGlobalPath(pathname)) {
		return withTenantHeaders(req, requestHeaders, null, hostname);
	}

	// Already prefixed (e.g. after a rewrite loop) — pass through
	if (pathStartsWithWorkspace(pathname, workspace.slug)) {
		return withTenantHeaders(req, requestHeaders, workspace, hostname);
	}

	// Rewrite: /some-path → /workspace-slug/some-path
	const rewritePath =
		pathname === "/" ? `/${workspace.slug}` : `/${workspace.slug}${pathname}`;
	return withTenantHeaders(req, requestHeaders, workspace, hostname, rewritePath);
});

export const config = {
	matcher: [
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		"/(api|trpc)(.*)",
	],
};
