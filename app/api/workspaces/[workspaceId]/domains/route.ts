import { type NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeHostname } from "@/lib/tenant/resolve-workspace";
import {
	addProjectDomain,
	domainsDeleteDomain,
	getProjectDomain,
	projectsRemoveProjectDomain,
	verifyProjectDomain,
} from "@/lib/vercel-domains";

type DomainType = "CUSTOM" | "SUBDOMAIN" | "PATH";
type DomainPurpose =
	| "PLATFORM_SUBDOMAIN"
	| "CUSTOM_DASHBOARD"
	| "ROOT_PREVIEW"
	| "LINK_IN_BIO";

type WorkspaceDomainRow = {
	id: string;
	hostname: string;
	workspace_id: string;
	verified: boolean;
	primary: boolean;
	type: DomainType;
	purpose: DomainPurpose;
	vercel_domain_id: string | null;
	verification_status: string | null;
	last_verification_at: string | null;
	created_at: string;
	updated_at: string;
};

interface RouteContext {
	params: Promise<{ workspaceId: string }>;
}

function mapDnsInstructions(verification: unknown) {
	if (!Array.isArray(verification))
		return [] as Array<{ type: string; domain: string; value: string }>;

	return verification
		.map((entry) => {
			if (!entry || typeof entry !== "object") return null;
			const record = entry as Record<string, unknown>;
			const type = typeof record.type === "string" ? record.type : null;
			const domain = typeof record.domain === "string" ? record.domain : null;
			const value = typeof record.value === "string" ? record.value : null;
			if (!type || !domain || !value) return null;

			return { type, domain, value };
		})
		.filter((entry): entry is { type: string; domain: string; value: string } =>
			Boolean(entry),
		);
}

function normalizeDomainInput(value: unknown): string {
	if (typeof value !== "string") return "";
	return normalizeHostname(value);
}

async function findCustomDashboardDomain(
	workspaceId: string,
	hostname?: string,
) {
	const supabase = createServerSupabaseClient();
	let query = supabase
		.from("domains")
		.select(
			"id, hostname, workspace_id, verified, primary, type, purpose, vercel_domain_id, verification_status, last_verification_at, created_at, updated_at",
		)
		.eq("workspace_id", workspaceId)
		.eq("purpose", "CUSTOM_DASHBOARD");

	if (hostname) {
		query = query.eq("hostname", normalizeHostname(hostname));
	}

	const { data, error } = await query
		.order("primary", { ascending: false })
		.order("created_at", { ascending: true })
		.limit(1)
		.maybeSingle<WorkspaceDomainRow>();

	if (error) {
		return { domain: null, error: error.message };
	}

	return { domain: data || null, error: null };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "read",
		route: "/api/workspaces/[workspaceId]/domains:get",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const supabase = createServerSupabaseClient();
	const { data: domains, error } = await supabase
		.from("domains")
		.select(
			"id, hostname, workspace_id, verified, primary, type, purpose, vercel_domain_id, verification_status, last_verification_at, created_at, updated_at",
		)
		.eq("workspace_id", access.workspaceId)
		.in("purpose", [
			"PLATFORM_SUBDOMAIN",
			"CUSTOM_DASHBOARD",
			"ROOT_PREVIEW",
			"LINK_IN_BIO",
		])
		.order("primary", { ascending: false })
		.order("created_at", { ascending: true });

	if (error) {
		return NextResponse.json(
			{ error: error.message || "Failed to load domains" },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		domains: (domains || []) as WorkspaceDomainRow[],
	});
}

export async function POST(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/domains:post",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = (await req.json().catch(() => ({}))) as {
		hostname?: string;
		domain?: string;
	};
	const desiredDomain = normalizeDomainInput(
		payload.hostname || payload.domain,
	);

	if (!desiredDomain) {
		return NextResponse.json(
			{ error: "Domain ist erforderlich." },
			{ status: 400 },
		);
	}

	try {
		const added = await addProjectDomain(desiredDomain);
		const detail = await getProjectDomain(desiredDomain).catch(() => added);

		const supabase = createServerSupabaseClient();
		const now = new Date().toISOString();

		// Keep one custom dashboard domain row per workspace.
		await supabase
			.from("domains")
			.delete()
			.eq("workspace_id", access.workspaceId)
			.eq("purpose", "CUSTOM_DASHBOARD");

		const { data: inserted, error: insertError } = await supabase
			.from("domains")
			.insert({
				workspace_id: access.workspaceId,
				hostname: desiredDomain,
				verified: Boolean(detail.verified),
				primary: true,
				type: "CUSTOM",
				purpose: "CUSTOM_DASHBOARD",
				verification_status: detail.verified ? "verified" : "pending",
				last_verification_at: now,
			})
			.select(
				"id, hostname, workspace_id, verified, primary, type, purpose, vercel_domain_id, verification_status, last_verification_at, created_at, updated_at",
			)
			.maybeSingle<WorkspaceDomainRow>();

		if (insertError) {
			return NextResponse.json(
				{ error: insertError.message || "Failed to persist domain" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			domain: inserted,
			status: detail.verified ? "connected" : "pending_verification",
			dnsInstructions: mapDnsInstructions(detail.verification),
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Domain konnte nicht hinzugefügt werden.",
			},
			{ status: 500 },
		);
	}
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/domains:patch",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = (await req.json().catch(() => ({}))) as { hostname?: string };
	const desiredHostname = normalizeDomainInput(payload.hostname);

	const { domain: customDomain, error: customDomainError } =
		await findCustomDashboardDomain(
			access.workspaceId,
			desiredHostname || undefined,
		);

	if (customDomainError) {
		return NextResponse.json({ error: customDomainError }, { status: 500 });
	}

	if (!customDomain) {
		return NextResponse.json(
			{ error: "Custom dashboard domain not found" },
			{ status: 404 },
		);
	}

	try {
		const verification = await verifyProjectDomain(customDomain.hostname);
		const detail = await getProjectDomain(customDomain.hostname).catch(
			() => null,
		);
		const verified = Boolean(detail?.verified);

		const supabase = createServerSupabaseClient();
		const { error: updateError } = await supabase
			.from("domains")
			.update({
				verified,
				verification_status: verified ? "verified" : "pending",
				last_verification_at: new Date().toISOString(),
			})
			.eq("id", customDomain.id)
			.eq("workspace_id", access.workspaceId);

		if (updateError) {
			return NextResponse.json(
				{ error: updateError.message || "Failed to persist verification" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			verified,
			verification,
			dnsInstructions: mapDnsInstructions(detail?.verification),
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Domain-Verifizierung fehlgeschlagen.",
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/domains:delete",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = (await req.json().catch(() => ({}))) as { hostname?: string };
	const desiredHostname = normalizeDomainInput(payload.hostname);

	const { domain: customDomain, error: customDomainError } =
		await findCustomDashboardDomain(
			access.workspaceId,
			desiredHostname || undefined,
		);

	if (customDomainError) {
		return NextResponse.json({ error: customDomainError }, { status: 500 });
	}

	if (!customDomain) {
		return NextResponse.json(
			{ error: "Custom dashboard domain not found" },
			{ status: 404 },
		);
	}

	const externalErrors: string[] = [];

	try {
		await projectsRemoveProjectDomain(customDomain.hostname);
	} catch (error) {
		externalErrors.push(
			error instanceof Error
				? error.message
				: "Failed to remove domain from project",
		);
	}

	try {
		await domainsDeleteDomain(customDomain.hostname);
	} catch {
		// Best-effort cleanup for account-level domain object.
	}

	const supabase = createServerSupabaseClient();
	const { error: deleteError } = await supabase
		.from("domains")
		.delete()
		.eq("id", customDomain.id)
		.eq("workspace_id", access.workspaceId);

	if (deleteError) {
		return NextResponse.json(
			{ error: deleteError.message || "Failed to delete domain row" },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		success: true,
		removedHostname: customDomain.hostname,
		externalErrors,
	});
}
