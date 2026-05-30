import { type NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeHostname } from "@/lib/tenant/resolve-workspace";
import {
	projectsAddProjectDomain,
	projectsGetProjectDomain,
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

function normalizeRootDomainInput(value: string): string {
	const normalized = normalizeHostname(value);
	return normalized.replace(/^dashboard\./, "");
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

async function getRootPreviewDomain(
	supabase: ReturnType<typeof createServerSupabaseClient>,
	workspaceId: string,
) {
	const { data } = await supabase
		.from("domains")
		.select("hostname")
		.eq("workspace_id", workspaceId)
		.eq("purpose", "ROOT_PREVIEW")
		.order("primary", { ascending: false })
		.order("created_at", { ascending: true })
		.limit(1)
		.maybeSingle<{ hostname: string }>();

	return data?.hostname || null;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/domains/dashboard",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const supabase = createServerSupabaseClient();

	const payload = (await req.json().catch(() => ({}))) as {
		rootDomain?: string;
	};

	const rootDomainFromPayload = payload.rootDomain
		? normalizeRootDomainInput(payload.rootDomain)
		: "";
	const rootDomainFromDb = await getRootPreviewDomain(
		supabase,
		access.workspaceId,
	);
	const rootDomain =
		rootDomainFromPayload ||
		(rootDomainFromDb ? normalizeRootDomainInput(rootDomainFromDb) : "");

	if (!rootDomain) {
		return NextResponse.json(
			{ error: "rootDomain is required" },
			{ status: 400 },
		);
	}

	const hostname = normalizeHostname(`dashboard.${rootDomain}`);

	const { data: upsertedDomain, error: upsertError } = await supabase
		.from("domains")
		.upsert(
			{
				hostname,
				workspace_id: access.workspaceId,
				verified: false,
				primary: true,
				type: "CUSTOM",
				purpose: "CUSTOM_DASHBOARD",
				verification_status: "pending",
				last_verification_at: new Date().toISOString(),
			},
			{ onConflict: "hostname" },
		)
		.select(
			"id, hostname, workspace_id, verified, primary, type, purpose, verification_status, vercel_domain_id",
		)
		.single<WorkspaceDomainRow>();

	if (upsertError) {
		return NextResponse.json(
			{ error: upsertError.message || "Failed to upsert domain row" },
			{ status: 500 },
		);
	}

	try {
		await projectsAddProjectDomain(hostname);
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Failed to add domain to Vercel project";
		// Domain might already be attached. We still continue with a read to return instructions.
		if (!message.toLowerCase().includes("already")) {
			return NextResponse.json({ error: message }, { status: 502 });
		}
	}

	let vercelDomain: VercelProjectDomain | null = null;
	try {
		vercelDomain = await projectsGetProjectDomain(hostname);
	} catch {
		vercelDomain = null;
	}

	const { data: updatedDomain } = await supabase
		.from("domains")
		.update({
			verified: vercelDomain?.verified === true,
			verification_status: toVerificationStatus(vercelDomain),
			last_verification_at: new Date().toISOString(),
			vercel_domain_id: vercelDomain?.id || upsertedDomain.vercel_domain_id,
		})
		.eq("id", upsertedDomain.id)
		.select(
			"id, hostname, workspace_id, verified, primary, type, purpose, verification_status, vercel_domain_id",
		)
		.single<WorkspaceDomainRow>();

	return NextResponse.json({
		success: true,
		domain: updatedDomain || upsertedDomain,
		vercel: vercelDomain,
		dnsInstructions: toDnsInstructions(vercelDomain?.verification),
	});
}
