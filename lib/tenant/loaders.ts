import "server-only";

import type {
	BotCommand,
	Domain,
	Feature,
	Membership,
	Subscription,
	Workspace,
} from "@/lib/db/types";
import {
	createServerSupabaseAdminClient,
	createServerSupabaseClient,
} from "@/lib/supabase/server";

type DbError = {
	code?: string;
	message?: string;
	hint?: string;
	details?: string;
};

type PostgrestError = DbError;

type DomainRow = {
	id: string;
	hostname: string;
	workspace_id: string;
	verified: boolean;
	primary: boolean;
	type: string;
	purpose: string;
	vercel_domain_id: string | null;
	verification_status: string | null;
	last_verification_at: string | null;
	created_at: string;
	updated_at: string;
};

type WorkspaceRow = {
	id: string;
	slug: string;
	name: string;
	plan: "CORE" | "ELITE";
	root_domain: string | null;
	logo_url: string | null;
	brand_color: string | null;
	hide_oxom_branding: boolean | null;
	clerk_org_id: string | null;
};

type FeatureRow = {
	workspace_id: string;
	feature_key: string;
	enabled: boolean;
	config: Record<string, unknown> | null;
};

type BotCommandRow = {
	workspace_id: string;
	command: string;
	enabled: boolean;
	config: Record<string, unknown> | null;
};

type SubscriptionRow = {
	workspace_id: string;
	status: string | null;
	stripe_subscription_id: string | null;
	current_period_end: string | null;
	cancel_at_period_end: boolean | null;
	stripe_price_id: string | null;
};

type MembershipRow = {
	workspace_id: string;
	user_id: string;
	role: "ADMIN" | "MODERATOR" | "MEMBER";
};

const DOMAIN_PURPOSES = new Set([
	"PLATFORM_SUBDOMAIN",
	"CUSTOM_DASHBOARD",
	"ROOT_PREVIEW",
	"LINK_IN_BIO",
]);
const DOMAIN_TYPES = new Set(["CUSTOM", "SUBDOMAIN", "PATH"]);
const DOMAIN_SELECT =
	"id, hostname, workspace_id, verified, primary, type, purpose, vercel_domain_id, verification_status, last_verification_at, created_at, updated_at";
const DOMAIN_SELECT_LEGACY =
	"id, hostname, workspace_id, verified, primary, type, purpose, verification_status, last_verification_at, created_at, updated_at";

function isMissingRelationError(error: DbError | null): boolean {
	if (!error) return false;
	if (error.code === "42P01") return true;
	return Boolean(
		error.message?.toLowerCase().includes("relation") &&
			error.message?.toLowerCase().includes("does not exist"),
	);
}

function isMissingColumnError(error: DbError | null, column: string): boolean {
	if (!error) return false;
	if (error.code !== "42703") return false;
	const message = (error.message || "").toLowerCase();
	return message.includes(column.toLowerCase());
}

function isStackDepthError(error: DbError | null): boolean {
	return error?.code === "54001";
}

function formatDbError(
	context: string,
	error: DbError | null,
	extra = "",
): Error {
	if (!error) {
		return new Error(
			`${context}: Unknown database error.${extra ? ` ${extra}` : ""}`,
		);
	}

	const code = error.code || "unknown";
	const message = error.message || "unknown error";
	const hint = error.hint ? ` Hint: ${error.hint}.` : "";
	const details = error.details ? ` Details: ${error.details}.` : "";
	const missingSchemaSuffix =
		error.code === "42P01" || error.code === "42703"
			? " Check that the required table/column exists in Supabase."
			: "";

	return new Error(
		`${context}: ${message} (code ${code}).${hint}${details}${missingSchemaSuffix}${extra ? ` ${extra}` : ""}`,
	);
}

function failOrFallback<T>(
	context: string,
	error: DbError | null,
	fallback: T,
	extra = "",
): T {
	if (process.env.NODE_ENV !== "production") {
		throw formatDbError(context, error, extra);
	}
	return fallback;
}

function mapWorkspace(row: WorkspaceRow): Workspace {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		plan: row.plan,
		root_domain: row.root_domain,
		logo_url: row.logo_url,
		brand_color: row.brand_color,
		hide_oxom_branding: row.hide_oxom_branding,
		clerk_org_id: row.clerk_org_id,
	};
}

function mapDomain(row: DomainRow): Domain {
	const purpose = DOMAIN_PURPOSES.has(row.purpose)
		? row.purpose
		: "CUSTOM_DASHBOARD";
	const type = DOMAIN_TYPES.has(row.type) ? row.type : "CUSTOM";

	return {
		id: row.id,
		hostname: row.hostname,
		workspace_id: row.workspace_id,
		verified: row.verified,
		primary: row.primary,
		type: type as Domain["type"],
		purpose: purpose as Domain["purpose"],
		vercel_domain_id: row.vercel_domain_id,
		verification_status: row.verification_status,
		last_verification_at: row.last_verification_at,
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

export async function listDomainsForWorkspace(
	workspaceId: string,
): Promise<Domain[]> {
	const runDomainQuery = (
		client:
			| ReturnType<typeof createServerSupabaseClient>
			| ReturnType<typeof createServerSupabaseAdminClient>,
		selectClause: string,
	) =>
		client
			.from("domains")
			.select(selectClause)
			.eq("workspace_id", workspaceId)
			.order("primary", { ascending: false })
			.order("created_at", { ascending: true });

	const supabase = createServerSupabaseClient();
	let { data, error } = await runDomainQuery(supabase, DOMAIN_SELECT);

	if (isStackDepthError(error as PostgrestError | null)) {
		// Fallback for broken recursive RLS policy setups on some projects.
		// Workspace access is already enforced by surrounding workspace layout/routes.
		const adminClient = createServerSupabaseAdminClient();
		const adminResult = await runDomainQuery(adminClient, DOMAIN_SELECT);
		data = adminResult.data;
		error = adminResult.error;
	}

	if (
		isMissingColumnError(error as PostgrestError | null, "vercel_domain_id")
	) {
		// Backward compatibility for older schemas that do not yet have vercel_domain_id.
		const { data: legacyData, error: legacyError } = await runDomainQuery(
			supabase,
			DOMAIN_SELECT_LEGACY,
		);

		if (isStackDepthError(legacyError as PostgrestError | null)) {
			const adminClient = createServerSupabaseAdminClient();
			const adminLegacy = await runDomainQuery(
				adminClient,
				DOMAIN_SELECT_LEGACY,
			);
			if (adminLegacy.error) {
				return failOrFallback("listDomainsForWorkspace", adminLegacy.error, []);
			}

			const adminLegacyRows = (adminLegacy.data || []) as unknown as Array<
				Omit<DomainRow, "vercel_domain_id">
			>;
			return adminLegacyRows.map((row) =>
				mapDomain({
					...row,
					vercel_domain_id: null,
				}),
			);
		}

		if (legacyError) {
			return failOrFallback("listDomainsForWorkspace", legacyError, []);
		}

		const legacyRows = (legacyData || []) as unknown as Array<
			Omit<DomainRow, "vercel_domain_id">
		>;
		return legacyRows.map((row) =>
			mapDomain({
				...row,
				vercel_domain_id: null,
			}),
		);
	}

	if (error) {
		return failOrFallback("listDomainsForWorkspace", error, []);
	}

	const domainRows = (data || []) as unknown as DomainRow[];
	return domainRows.map(mapDomain);
}

export async function getWorkspaceBranding(
	workspaceId: string,
): Promise<Workspace | null> {
	const supabase = createServerSupabaseClient();
	const { data, error } = await supabase
		.from("workspaces")
		.select(
			"id, slug, name, plan, root_domain, logo_url, brand_color, hide_oxom_branding",
		)
		.eq("id", workspaceId)
		.maybeSingle<WorkspaceRow>();

	if (error) {
		return failOrFallback("getWorkspaceBranding", error, null);
	}

	return data ? mapWorkspace(data) : null;
}

export async function getFeaturesForWorkspace(
	workspaceId: string,
): Promise<Feature[]> {
	const supabase = createServerSupabaseClient();
	const candidateTables = ["workspace_features", "features"];
	let lastError: DbError | null = null;

	for (const tableName of candidateTables) {
		const { data, error } = await supabase
			.from(tableName)
			.select("workspace_id, feature_key, enabled, config")
			.eq("workspace_id", workspaceId)
			.order("feature_key", { ascending: true });

		if (!error) {
			return ((data || []) as FeatureRow[]).map((row) => ({
				workspace_id: row.workspace_id,
				feature_key: row.feature_key,
				enabled: row.enabled,
				config: row.config,
			}));
		}

		lastError = error;
		if (!isMissingRelationError(error)) {
			return failOrFallback("getFeaturesForWorkspace", error, []);
		}
	}

	return failOrFallback(
		"getFeaturesForWorkspace",
		lastError,
		[],
		`None of the expected tables exist: ${candidateTables.join(", ")}.`,
	);
}

export async function listBotCommandsForWorkspace(
	workspaceId: string,
): Promise<BotCommand[]> {
	const supabase = createServerSupabaseClient();
	const candidateTables = [
		"workspace_bot_commands",
		"bot_commands",
		"workspace_commands",
	];
	let lastError: DbError | null = null;

	for (const tableName of candidateTables) {
		const { data, error } = await supabase
			.from(tableName)
			.select("workspace_id, command, enabled, config")
			.eq("workspace_id", workspaceId)
			.order("command", { ascending: true });

		if (!error) {
			return ((data || []) as BotCommandRow[]).map((row) => ({
				workspace_id: row.workspace_id,
				command: row.command,
				enabled: row.enabled,
				config: row.config,
			}));
		}

		lastError = error;
		if (!isMissingRelationError(error)) {
			return failOrFallback("listBotCommandsForWorkspace", error, []);
		}
	}

	return failOrFallback(
		"listBotCommandsForWorkspace",
		lastError,
		[],
		`None of the expected tables exist: ${candidateTables.join(", ")}.`,
	);
}

export async function getWorkspaceSubscription(
	workspaceId: string,
): Promise<Subscription | null> {
	const supabase = createServerSupabaseClient();
	const candidateTables = [
		"workspace_subscriptions",
		"billing_subscriptions",
		"subscriptions",
	];
	let lastError: DbError | null = null;

	for (const tableName of candidateTables) {
		const { data, error } = await supabase
			.from(tableName)
			.select(
				"workspace_id, status, stripe_subscription_id, current_period_end, cancel_at_period_end, stripe_price_id",
			)
			.eq("workspace_id", workspaceId)
			.maybeSingle<SubscriptionRow>();

		if (!error) {
			if (!data) {
				return null;
			}

			return {
				workspace_id: data.workspace_id,
				status: data.status,
				stripe_subscription_id: data.stripe_subscription_id,
				current_period_end: data.current_period_end,
				cancel_at_period_end: data.cancel_at_period_end,
				stripe_price_id: data.stripe_price_id,
			};
		}

		lastError = error;
		if (!isMissingRelationError(error)) {
			return failOrFallback("getWorkspaceSubscription", error, null);
		}
	}

	return failOrFallback(
		"getWorkspaceSubscription",
		lastError,
		null,
		`None of the expected tables exist: ${candidateTables.join(", ")}.`,
	);
}

// TODO(clerk-jwt): call this with Clerk userId from server auth once JWT mapping is fully wired.
export async function getMembershipForUser(
	workspaceId: string,
	userId: string | null | undefined,
): Promise<Membership | null> {
	if (!userId) {
		return null;
	}

	const supabase = createServerSupabaseClient();
	const { data, error } = await supabase
		.from("workspace_memberships")
		.select("workspace_id, user_id, role")
		.eq("workspace_id", workspaceId)
		.eq("user_id", userId)
		.maybeSingle<MembershipRow>();

	if (error) {
		return failOrFallback("getMembershipForUser", error, null);
	}

	if (!data) {
		return null;
	}

	return {
		workspace_id: data.workspace_id,
		user_id: data.user_id,
		role: data.role,
	};
}
