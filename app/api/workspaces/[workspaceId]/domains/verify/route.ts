import { type NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeHostname } from "@/lib/tenant/resolve-workspace";
import {
	projectsGetProjectDomain,
	projectsVerifyProjectDomain,
	type VercelDomainVerificationRecord,
	type VercelProjectDomain,
} from "@/lib/vercel-domains";

interface RouteContext {
	params: Promise<{ workspaceId: string }>;
}

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
	type: "CUSTOM" | "SUBDOMAIN" | "PATH";
	purpose: DomainPurpose;
	verification_status: string | null;
	vercel_domain_id: string | null;
};

function toVerificationStatus(domain: VercelProjectDomain | null): string {
	if (domain?.verified === true) return "verified";
	return "pending";
}

function toDnsInstructions(
	verification: VercelDomainVerificationRecord[] | undefined,
) {
	if (!verification || verification.length === 0) return [];

	return verification.map((record) => ({
		type: record.type || "TXT",
		domain: record.domain || "@",
		value: record.value || "",
		reason: record.reason || null,
	}));
}

async function getCustomDashboardDomain(
	supabase: ReturnType<typeof createServerSupabaseClient>,
	workspaceId: string,
	hostname?: string,
) {
	const query = supabase
		.from("domains")
		.select(
			"id, hostname, workspace_id, verified, primary, type, purpose, verification_status, vercel_domain_id",
		)
		.eq("workspace_id", workspaceId)
		.eq("purpose", "CUSTOM_DASHBOARD");

	if (hostname) {
		query.eq("hostname", normalizeHostname(hostname));
	}

	const { data, error } = await query
		.order("primary", { ascending: false })
		.order("created_at", { ascending: true })
		.limit(1)
		.maybeSingle<WorkspaceDomainRow>();

	if (error) {
		return { domain: null, error: error.message };
	}

	return { domain: data, error: null };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/domains/verify",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const supabase = createServerSupabaseClient();

	const payload = (await req.json().catch(() => ({}))) as { hostname?: string };
	const requestedHostname = payload.hostname
		? normalizeHostname(payload.hostname)
		: undefined;

	const { domain, error } = await getCustomDashboardDomain(
		supabase,
		access.workspaceId,
		requestedHostname,
	);
	if (error) {
		return NextResponse.json({ error }, { status: 500 });
	}

	if (!domain) {
		return NextResponse.json(
			{ error: "Custom dashboard domain not found" },
			{ status: 404 },
		);
	}

	try {
		await projectsVerifyProjectDomain(domain.hostname);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Verification call failed";
		// We still do a follow-up GET because Vercel can return races while verification propagates.
		if (!message.toLowerCase().includes("pending")) {
			// keep going, but include warning in response
		}
	}

	let vercelDomain: VercelProjectDomain | null = null;
	try {
		vercelDomain = await projectsGetProjectDomain(domain.hostname);
	} catch {
		vercelDomain = null;
	}

	const verified = vercelDomain?.verified === true;
	const { data: updatedDomain, error: updateError } = await supabase
		.from("domains")
		.update({
			verified,
			verification_status: verified
				? "verified"
				: toVerificationStatus(vercelDomain),
			last_verification_at: new Date().toISOString(),
			vercel_domain_id: vercelDomain?.id || domain.vercel_domain_id,
		})
		.eq("id", domain.id)
		.eq("workspace_id", access.workspaceId)
		.select(
			"id, hostname, workspace_id, verified, primary, type, purpose, verification_status, vercel_domain_id",
		)
		.single<WorkspaceDomainRow>();

	if (updateError) {
		return NextResponse.json(
			{ error: updateError.message || "Failed to persist verification state" },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		success: true,
		verified,
		domain: updatedDomain,
		vercel: vercelDomain,
		dnsInstructions: toDnsInstructions(vercelDomain?.verification),
	});
}
