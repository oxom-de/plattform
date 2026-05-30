import { type NextRequest, NextResponse } from "next/server";
import {
	badRequestResponse,
	normalizeWorkspaceSlug,
	requireWorkspaceAccessBySlug,
} from "@/lib/authz/workspace-access";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import {
	addProjectDomain,
	getProjectDomain,
	listProjectDomains,
	removeProjectDomain,
	type VercelDomainVerificationRecord,
	type VercelProjectDomain,
	verifyProjectDomain,
} from "@/lib/vercel-domains";

const SYSTEM_DOMAIN_SUFFIXES = [
	".vercel.app",
	".oxom.at",
	".oxom.be",
	".oxom.it",
	".oxom.lu",
	".oxom.nl",
	"oxom.it",
];

function normalizeDomain(value: string | null): string {
	return (value || "").toLowerCase().trim();
}

function parseWorkspaceSlugFromRequest(
	req: NextRequest,
	payloadTeam?: unknown,
): string {
	if (typeof payloadTeam === "string" && payloadTeam.trim()) {
		return normalizeWorkspaceSlug(payloadTeam);
	}
	return normalizeWorkspaceSlug(req.nextUrl.searchParams.get("team"));
}

function isSystemDomain(hostname: string): boolean {
	if (hostname === "oxom.de" || hostname === "www.oxom.de") return true;
	return SYSTEM_DOMAIN_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

function isWorkspaceDomainVisible(
	domain: VercelProjectDomain,
	workspaceSlug: string,
) {
	const hostname = normalizeDomain(domain.name);
	if (!hostname) return false;
	if (isSystemDomain(hostname)) return false;

	const workspaceSubdomain = `${workspaceSlug}.oxom.de`;
	if (hostname === workspaceSubdomain) return true;
	if (hostname.endsWith(".oxom.de")) return false;

	// Show only domains that contain the workspace slug as the creator domain label:
	// - oxom.de
	// - www.oxom.de
	// - dashboard.oxom.de
	const escapedSlug = workspaceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const creatorDomainPattern = new RegExp(
		`(^|\\.)${escapedSlug}\\.[a-z0-9-]+$`,
	);
	return creatorDomainPattern.test(hostname);
}

function mapDnsInstructions(
	records: VercelDomainVerificationRecord[] | undefined,
) {
	const values = (records || [])
		.map((record) => {
			const type = typeof record.type === "string" ? record.type : null;
			const domain = typeof record.domain === "string" ? record.domain : null;
			const value = typeof record.value === "string" ? record.value : null;
			if (!type || !domain || !value) return null;

			return {
				type,
				domain,
				value,
			};
		})
		.filter((entry): entry is { type: string; domain: string; value: string } =>
			Boolean(entry),
		);

	return values;
}

export async function GET(req: NextRequest) {
	const workspaceSlug = parseWorkspaceSlugFromRequest(req);
	if (!workspaceSlug) return badRequestResponse("Missing team");

	const access = await requireWorkspaceAccessBySlug(workspaceSlug);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "read",
		route: "/api/domains",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	try {
		const domains = await listProjectDomains();
		const filtered = domains.filter((domain) =>
			isWorkspaceDomainVisible(domain, access.workspaceSlug),
		);

		return NextResponse.json({
			success: true,
			domains: filtered,
			workspace: {
				id: access.workspaceId,
				slug: access.workspaceSlug,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Domains konnten nicht geladen werden.",
			},
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	const payload = (await req.json().catch(() => ({}))) as {
		team?: string;
		domain?: string;
	};

	const workspaceSlug = parseWorkspaceSlugFromRequest(req, payload.team);
	const domain = normalizeDomain(payload.domain ?? null);

	if (!workspaceSlug) return badRequestResponse("Missing team");
	if (!domain) return badRequestResponse("Domain ist erforderlich.");

	const access = await requireWorkspaceAccessBySlug(workspaceSlug, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/domains:post",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	try {
		const added = await addProjectDomain(domain);
		const detail = await getProjectDomain(domain).catch(() => added);
		const dnsInstructions = mapDnsInstructions(detail.verification);

		return NextResponse.json({
			success: true,
			domain: detail,
			status: detail.verified ? "connected" : "pending_verification",
			dnsInstructions,
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

export async function PATCH(req: NextRequest) {
	const payload = (await req.json().catch(() => ({}))) as {
		team?: string;
		domain?: string;
	};

	const workspaceSlug = parseWorkspaceSlugFromRequest(req, payload.team);
	const domain = normalizeDomain(payload.domain ?? null);

	if (!workspaceSlug) return badRequestResponse("Missing team");
	if (!domain) return badRequestResponse("Domain ist erforderlich.");

	const access = await requireWorkspaceAccessBySlug(workspaceSlug, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/domains:patch",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	try {
		const verification = await verifyProjectDomain(domain);
		const detail = await getProjectDomain(domain).catch(() => null);

		return NextResponse.json({
			success: true,
			verification,
			status: detail?.verified ? "connected" : "pending_verification",
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

export async function DELETE(req: NextRequest) {
	const payload = (await req.json().catch(() => ({}))) as {
		team?: string;
		domain?: string;
	};

	const workspaceSlug = parseWorkspaceSlugFromRequest(req, payload.team);
	const domain = normalizeDomain(payload.domain ?? null);

	if (!workspaceSlug) return badRequestResponse("Missing team");
	if (!domain) return badRequestResponse("Domain ist erforderlich.");

	const access = await requireWorkspaceAccessBySlug(workspaceSlug, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/domains:delete",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	try {
		await removeProjectDomain(domain);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Domain konnte nicht entfernt werden.",
			},
			{ status: 500 },
		);
	}
}
