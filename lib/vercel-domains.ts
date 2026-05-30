const VERCEL_API_BASE_URL = "https://api.vercel.com";

export interface VercelDomainVerificationRecord {
	type?: string;
	domain?: string;
	value?: string;
	reason?: string;
}

export interface VercelProjectDomain {
	id?: string | null;
	name: string;
	verified?: boolean;
	gitBranch?: string | null;
	redirect?: string | null;
	createdAt?: number;
	verification?: VercelDomainVerificationRecord[];
}

interface VercelDomainsConfig {
	token: string;
	projectIdOrName: string;
	teamId?: string;
}

function getVercelDomainsConfig(): VercelDomainsConfig {
	const token =
		process.env.VERCEL_TOKEN?.trim() || process.env.VERCEL_API_TOKEN?.trim();
	const projectIdOrName =
		process.env.VERCEL_PROJECT_ID_OR_NAME?.trim() ||
		process.env.VERCEL_PROJECT_ID?.trim() ||
		process.env.VERCEL_PROJECT_NAME?.trim();
	const teamId = process.env.VERCEL_TEAM_ID?.trim();

	if (!token) {
		throw new Error("VERCEL_TOKEN must be set.");
	}

	if (!projectIdOrName) {
		throw new Error(
			"VERCEL_PROJECT_ID_OR_NAME (or VERCEL_PROJECT_ID / VERCEL_PROJECT_NAME) must be set.",
		);
	}

	return {
		token,
		projectIdOrName,
		teamId: teamId || undefined,
	};
}

function normalizeDomain(domain: string): string {
	return domain.toLowerCase().trim();
}

function parseJsonSafely(raw: string): unknown {
	try {
		return raw ? JSON.parse(raw) : null;
	} catch {
		return raw;
	}
}

function getProjectPathWithQuery(pathSuffix: string): string {
	const { projectIdOrName, teamId } = getVercelDomainsConfig();
	const query = new URLSearchParams();
	if (teamId) query.set("teamId", teamId);

	const base = `/v9/projects/${encodeURIComponent(projectIdOrName)}${pathSuffix}`;
	return query.toString() ? `${base}?${query.toString()}` : base;
}

function getDomainPathWithQuery(pathSuffix: string): string {
	const { teamId } = getVercelDomainsConfig();
	const query = new URLSearchParams();
	if (teamId) query.set("teamId", teamId);

	const base = `/v10/domains${pathSuffix}`;
	return query.toString() ? `${base}?${query.toString()}` : base;
}

async function vercelRequest(
	path: string,
	init?: RequestInit,
): Promise<unknown> {
	const { token } = getVercelDomainsConfig();
	const response = await fetch(`${VERCEL_API_BASE_URL}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			...(init?.headers || {}),
		},
	});

	const raw = await response.text();
	const data = parseJsonSafely(raw);

	if (!response.ok) {
		const typed =
			data && typeof data === "object"
				? (data as Record<string, unknown>)
				: null;
		const nestedError = typed?.error;
		const nestedErrorMessage =
			nestedError && typeof nestedError === "object" && "message" in nestedError
				? (nestedError as Record<string, unknown>).message
				: null;

		const message =
			(typeof nestedError === "string" && nestedError) ||
			(typeof nestedErrorMessage === "string" && nestedErrorMessage) ||
			(typed && typeof typed.message === "string" && typed.message) ||
			(typeof data === "string" ? data : null) ||
			`Vercel API error (${response.status})`;

		throw new Error(message);
	}

	return data;
}

function toVercelProjectDomain(raw: unknown): VercelProjectDomain | null {
	if (!raw || typeof raw !== "object") return null;
	const item = raw as Record<string, unknown>;
	const name = typeof item.name === "string" ? normalizeDomain(item.name) : "";
	if (!name) return null;

	const verificationRaw = Array.isArray(item.verification)
		? item.verification
		: [];
	const verification = verificationRaw
		.map((row) => {
			if (!row || typeof row !== "object") return null;
			const v = row as Record<string, unknown>;
			return {
				type: typeof v.type === "string" ? v.type : undefined,
				domain: typeof v.domain === "string" ? v.domain : undefined,
				value: typeof v.value === "string" ? v.value : undefined,
				reason: typeof v.reason === "string" ? v.reason : undefined,
			} satisfies VercelDomainVerificationRecord;
		})
		.filter((row) => row !== null) as VercelDomainVerificationRecord[];

	return {
		id: typeof item.id === "string" ? item.id : null,
		name,
		verified: typeof item.verified === "boolean" ? item.verified : undefined,
		gitBranch: typeof item.gitBranch === "string" ? item.gitBranch : null,
		redirect: typeof item.redirect === "string" ? item.redirect : null,
		createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
		verification,
	};
}

export async function listProjectDomains(): Promise<VercelProjectDomain[]> {
	const data = await vercelRequest(getProjectPathWithQuery("/domains"), {
		method: "GET",
	});
	const typed =
		data && typeof data === "object" ? (data as Record<string, unknown>) : null;
	const domainsRaw = typed && Array.isArray(typed.domains) ? typed.domains : [];

	return domainsRaw
		.map((entry) => toVercelProjectDomain(entry))
		.filter((row) => row !== null) as VercelProjectDomain[];
}

export async function addProjectDomain(
	domain: string,
): Promise<VercelProjectDomain> {
	const normalizedDomain = normalizeDomain(domain);
	if (!normalizedDomain) throw new Error("Domain is required.");

	const data = await vercelRequest(getProjectPathWithQuery("/domains"), {
		method: "POST",
		body: JSON.stringify({ name: normalizedDomain }),
	});

	return toVercelProjectDomain(data) || { name: normalizedDomain };
}

export async function getProjectDomain(
	domain: string,
): Promise<VercelProjectDomain> {
	const normalizedDomain = normalizeDomain(domain);
	if (!normalizedDomain) throw new Error("Domain is required.");

	const data = await vercelRequest(
		getProjectPathWithQuery(`/domains/${encodeURIComponent(normalizedDomain)}`),
		{
			method: "GET",
		},
	);

	return toVercelProjectDomain(data) || { name: normalizedDomain };
}

export async function verifyProjectDomain(domain: string): Promise<unknown> {
	const normalizedDomain = normalizeDomain(domain);
	if (!normalizedDomain) throw new Error("Domain is required.");

	return await vercelRequest(
		getProjectPathWithQuery(
			`/domains/${encodeURIComponent(normalizedDomain)}/verify`,
		),
		{
			method: "POST",
		},
	);
}

export async function removeProjectDomain(domain: string): Promise<void> {
	const normalizedDomain = normalizeDomain(domain);
	if (!normalizedDomain) throw new Error("Domain is required.");

	await vercelRequest(
		getProjectPathWithQuery(`/domains/${encodeURIComponent(normalizedDomain)}`),
		{
			method: "DELETE",
		},
	);
}

export async function deleteDomain(domain: string): Promise<void> {
	const normalizedDomain = normalizeDomain(domain);
	if (!normalizedDomain) throw new Error("Domain is required.");

	await vercelRequest(
		getDomainPathWithQuery(`/${encodeURIComponent(normalizedDomain)}`),
		{
			method: "DELETE",
		},
	);
}

// Vercel guide naming aliases
export const projectsAddProjectDomain = addProjectDomain;
export const projectsGetProjectDomain = getProjectDomain;
export const projectsVerifyProjectDomain = verifyProjectDomain;
export const projectsRemoveProjectDomain = removeProjectDomain;
export const domainsDeleteDomain = deleteDomain;
