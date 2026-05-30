import { type NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizeHostname } from "@/lib/tenant/resolve-workspace";
import {
	addProjectDomain,
	deleteDomain,
	getProjectDomain,
	removeProjectDomain,
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

function normalizeDomainInput(value: unknown): string {
	if (typeof value !== "string") return "";
	return normalizeHostname(value);
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

function isInvalidDomainPurposeEnumError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const typed = error as { code?: string; message?: string };
	const message = (typed.message || "").toLowerCase();
	return typed.code === "22P02" && message.includes("domain_purpose");
}

function isLegacyDomainPurposeCheckConstraintError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const typed = error as { code?: string; message?: string; details?: string };
	if (typed.code !== "23514") return false;
	const message = (typed.message || "").toLowerCase();
	const details = (typed.details || "").toLowerCase();
	return (
		message.includes("domains_purpose_chk") ||
		details.includes("domains_purpose_chk")
	);
}

async function listCustomDomains(workspaceId: string) {
	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("domains")
		.select(
			"id, hostname, workspace_id, verified, primary, type, purpose, vercel_domain_id, verification_status, last_verification_at, created_at, updated_at",
		)
		.eq("workspace_id", workspaceId)
		.eq("type", "CUSTOM")
		.order("created_at", { ascending: true });

	if (error) {
		return {
			domains: [] as WorkspaceDomainRow[],
			error: error.message || "Domains konnten nicht geladen werden.",
		};
	}

	return { domains: (data || []) as WorkspaceDomainRow[], error: null };
}

function findLinkInBioDomain(
	rows: WorkspaceDomainRow[],
	desiredHostname?: string,
) {
	const normalizedDesiredHostname = desiredHostname
		? normalizeHostname(desiredHostname)
		: "";
	const linkInBioDomains = rows.filter((row) => row.purpose === "LINK_IN_BIO");
	if (!normalizedDesiredHostname) {
		return linkInBioDomains[0] || null;
	}

	return (
		linkInBioDomains.find(
			(row) => row.hostname === normalizedDesiredHostname,
		) || null
	);
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "read",
		route: "/api/workspaces/[workspaceId]/link-in-bio/domains:get",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const listed = await listCustomDomains(access.workspaceId);
	if (listed.error) {
		return NextResponse.json({ error: listed.error }, { status: 500 });
	}

	const domain = findLinkInBioDomain(listed.domains);
	return NextResponse.json({ domain });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/link-in-bio/domains:post",
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
		let added: Awaited<ReturnType<typeof addProjectDomain>> | null = null;
		try {
			added = await addProjectDomain(desiredDomain);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Domain konnte nicht in Vercel angelegt werden.";
			if (!message.toLowerCase().includes("already")) {
				throw error;
			}
		}

		const detail = await getProjectDomain(desiredDomain).catch(() => added);

		const listed = await listCustomDomains(access.workspaceId);
		if (listed.error) {
			return NextResponse.json({ error: listed.error }, { status: 500 });
		}

		const current = findLinkInBioDomain(listed.domains);
		const supabase = createServerSupabaseAdminClient();
		const now = new Date().toISOString();

		if (current && current.hostname !== desiredDomain) {
			try {
				await removeProjectDomain(current.hostname);
			} catch {
				// best-effort cleanup
			}
			try {
				await deleteDomain(current.hostname);
			} catch {
				// best-effort cleanup
			}
			await supabase
				.from("domains")
				.delete()
				.eq("id", current.id)
				.eq("workspace_id", access.workspaceId);
		}

		let inserted: WorkspaceDomainRow | null = null;
		let insertError: { code?: string; message?: string } | null = null;

		if (current && current.hostname === desiredDomain) {
			const updateResult = await supabase
				.from("domains")
				.update({
					verified: Boolean(detail?.verified),
					verification_status: detail?.verified ? "verified" : "pending",
					last_verification_at: now,
				})
				.eq("id", current.id)
				.eq("workspace_id", access.workspaceId)
				.select(
					"id, hostname, workspace_id, verified, primary, type, purpose, vercel_domain_id, verification_status, last_verification_at, created_at, updated_at",
				)
				.maybeSingle<WorkspaceDomainRow>();

			inserted = updateResult.data || null;
			insertError = updateResult.error;
		} else {
			const insertResult = await supabase
				.from("domains")
				.insert({
					hostname: desiredDomain,
					workspace_id: access.workspaceId,
					verified: Boolean(detail?.verified),
					primary: false,
					type: "CUSTOM",
					purpose: "LINK_IN_BIO",
					verification_status: detail?.verified ? "verified" : "pending",
					last_verification_at: now,
				})
				.select(
					"id, hostname, workspace_id, verified, primary, type, purpose, vercel_domain_id, verification_status, last_verification_at, created_at, updated_at",
				)
				.maybeSingle<WorkspaceDomainRow>();

			inserted = insertResult.data || null;
			insertError = insertResult.error;
		}

		if (insertError) {
			if (isInvalidDomainPurposeEnumError(insertError)) {
				return NextResponse.json(
					{
						error:
							"DB enum domain_purpose kennt LINK_IN_BIO noch nicht. Bitte docs/sql/link-in-bio.sql ausführen.",
						code: (insertError as { code?: string }).code || null,
					},
					{ status: 501 },
				);
			}

			if (isLegacyDomainPurposeCheckConstraintError(insertError)) {
				return NextResponse.json(
					{
						error:
							"domains_purpose_chk blockiert LINK_IN_BIO. Bitte docs/sql/link-in-bio.sql ausführen (Legacy-Constraint-Update).",
						code: (insertError as { code?: string }).code || null,
					},
					{ status: 501 },
				);
			}

			if (insertError.code === "23505") {
				return NextResponse.json(
					{
						error:
							"Diese Domain ist bereits einem anderen Zweck oder Workspace zugeordnet. Bitte zuerst dort entfernen.",
						code: insertError.code,
					},
					{ status: 409 },
				);
			}

			return NextResponse.json(
				{
					error:
						insertError.message || "Domain konnte nicht gespeichert werden.",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			domain: inserted,
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
		route: "/api/workspaces/[workspaceId]/link-in-bio/domains:patch",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = (await req.json().catch(() => ({}))) as { hostname?: string };
	const desiredHostname = normalizeDomainInput(payload.hostname);

	const listed = await listCustomDomains(access.workspaceId);
	if (listed.error) {
		return NextResponse.json({ error: listed.error }, { status: 500 });
	}

	const domain = findLinkInBioDomain(
		listed.domains,
		desiredHostname || undefined,
	);
	if (!domain) {
		return NextResponse.json(
			{ error: "Link in Bio Domain nicht gefunden." },
			{ status: 404 },
		);
	}

	try {
		await verifyProjectDomain(domain.hostname);
		const detail = await getProjectDomain(domain.hostname).catch(() => null);
		const verified = Boolean(detail?.verified);

		const supabase = createServerSupabaseAdminClient();
		const { data: updated, error: updateError } = await supabase
			.from("domains")
			.update({
				verified,
				verification_status: verified ? "verified" : "pending",
				last_verification_at: new Date().toISOString(),
			})
			.eq("id", domain.id)
			.eq("workspace_id", access.workspaceId)
			.select(
				"id, hostname, workspace_id, verified, primary, type, purpose, vercel_domain_id, verification_status, last_verification_at, created_at, updated_at",
			)
			.maybeSingle<WorkspaceDomainRow>();

		if (updateError) {
			return NextResponse.json(
				{
					error:
						updateError.message ||
						"Verifizierung konnte nicht gespeichert werden.",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			verified,
			domain: updated || domain,
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
		route: "/api/workspaces/[workspaceId]/link-in-bio/domains:delete",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = (await req.json().catch(() => ({}))) as { hostname?: string };
	const desiredHostname = normalizeDomainInput(payload.hostname);

	const listed = await listCustomDomains(access.workspaceId);
	if (listed.error) {
		return NextResponse.json({ error: listed.error }, { status: 500 });
	}

	const domain = findLinkInBioDomain(
		listed.domains,
		desiredHostname || undefined,
	);
	if (!domain) {
		return NextResponse.json(
			{ error: "Link in Bio Domain nicht gefunden." },
			{ status: 404 },
		);
	}

	const externalErrors: string[] = [];
	try {
		await removeProjectDomain(domain.hostname);
	} catch (error) {
		externalErrors.push(
			error instanceof Error
				? error.message
				: "Domain konnte in Vercel Project nicht entfernt werden.",
		);
	}

	try {
		await deleteDomain(domain.hostname);
	} catch {
		// best-effort cleanup for account-level Vercel domain object
	}

	const supabase = createServerSupabaseAdminClient();
	const { error: deleteError } = await supabase
		.from("domains")
		.delete()
		.eq("id", domain.id)
		.eq("workspace_id", access.workspaceId);

	if (deleteError) {
		return NextResponse.json(
			{ error: deleteError.message || "Domain konnte nicht gelöscht werden." },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		success: true,
		removedHostname: domain.hostname,
		externalErrors,
	});
}
