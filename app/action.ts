"use server";

import { getDubClientForWorkspace, resolveDubApiKey } from "@/lib/dub";
import { buildQrQuery } from "@/lib/dub/qr-presets";
import type { LinkFilters, LinksResponse } from "@/lib/links";

const DUB_API_BASE_URL = "https://api.dub.co";

// ── SHORTEN ────────────────────────────────────────────────────────────────

export interface ShortenState {
	shortLink?: string;
	error?: string;
}

export async function shorten(
	_prevState: ShortenState,
	formData: FormData,
): Promise<ShortenState> {
	const url = formData.get("url");
	const key = formData.get("key");
	const workspaceId = formData.get("workspaceId");
	const domain = formData.get("domain");

	if (!url || typeof url !== "string") return { error: "Ungültige URL" };
	if (!key || typeof key !== "string") return { error: "Ungültiger Key" };
	if (!workspaceId || typeof workspaceId !== "string")
		return { error: "workspaceId fehlt" };

	try {
		const dub = await getDubClientForWorkspace(workspaceId);
		const { shortLink } = await dub.links.create({
			url,
			key,
			...(typeof domain === "string" && domain ? { domain } : {}),
		});
		return { shortLink };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: "Erstellung des Kurzlinks fehlgeschlagen.",
		};
	}
}

// ── UPDATE ─────────────────────────────────────────────────────────────────

export interface UpdateState {
	success?: boolean;
	shortLink?: string;
	error?: string;
}

export async function update(
	_prevState: UpdateState,
	formData: FormData,
): Promise<UpdateState> {
	const id = formData.get("id");
	const url = formData.get("url");
	const workspaceId = formData.get("workspaceId");

	if (!id || typeof id !== "string") return { error: "Ungültige Link ID" };
	if (!url || typeof url !== "string") return { error: "Ungültige URL" };
	if (!workspaceId || typeof workspaceId !== "string")
		return { error: "workspaceId fehlt" };

	try {
		const dub = await getDubClientForWorkspace(workspaceId);
		const { shortLink } = await dub.links.update(id, { url });
		return { success: true, shortLink };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: "Aktualisierung des Kurzlinks fehlgeschlagen.",
		};
	}
}

// ── SEARCH LINKS ───────────────────────────────────────────────────────────

export interface SearchLink {
	id: string;
	shortLink: string;
	url: string;
	title?: string;
	description?: string;
	archived?: boolean;
	clicks?: number;
	createdAt: string;
}

export interface SearchLinkState {
	links: SearchLink[];
	error?: string;
	success: boolean;
	searchParams: { slug: string; id: string };
}

export async function searchLinks(
	_prevState: SearchLinkState,
	formData: FormData,
): Promise<SearchLinkState> {
	const workspaceId = formData.get("workspaceId") as string;
	const slug = formData.get("slug") as string;
	const id = formData.get("id") as string;
	const domain = formData.get("domain") as string | null;

	if (!slug && !id) {
		return {
			..._prevState,
			error: "Bitte Slug oder ID angeben.",
			success: false,
			links: [],
		};
	}

	try {
		const apiKey = await resolveDubApiKey(workspaceId);
		let links: SearchLink[] = [];

		if (id) {
			const res = await fetch(`${DUB_API_BASE_URL}/links/info?linkId=${id}`, {
				headers: { Authorization: `Bearer ${apiKey}` },
			});
			if (res.ok) links = [await res.json()];
		} else if (slug) {
			const params = new URLSearchParams({ key: slug });
			if (domain) params.set("domain", domain);
			const res = await fetch(
				`${DUB_API_BASE_URL}/links/info?${params}`,
				{ headers: { Authorization: `Bearer ${apiKey}` } },
			);
			if (res.ok) links = [await res.json()];
		}

		return {
			links,
			success: true,
			error: undefined,
			searchParams: { slug, id },
		};
	} catch (e: any) {
		return {
			..._prevState,
			error: e.message ?? "Fehler bei der Suche.",
			success: false,
			links: [],
			searchParams: { slug, id },
		};
	}
}

// ── GET ALL LINKS ──────────────────────────────────────────────────────────

export async function getAllLinks(workspaceId: string, filters: LinkFilters = {}) {
	try {
		const apiKey = await resolveDubApiKey(workspaceId);

		const queryParams = new URLSearchParams({
			page: (filters.page || 1).toString(),
			pageSize: (filters.pageSize || 50).toString(),
			sort: filters.sort || "createdAt",
		});

		if (filters.domain) queryParams.set("domain", filters.domain);
		if (filters.tagId) queryParams.append("tagId", filters.tagId);
		if (filters.search) queryParams.append("search", filters.search);
		if (filters.userId) queryParams.append("userId", filters.userId);
		if (filters.showArchived !== undefined)
			queryParams.append("showArchived", filters.showArchived.toString());
		if (filters.withTags !== undefined)
			queryParams.append("withTags", filters.withTags.toString());

		const response = await fetch(`${DUB_API_BASE_URL}/links?${queryParams}`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok)
			throw new Error(`API Error: ${response.status} ${response.statusText}`);

		const data: LinksResponse = await response.json();
		return {
			success: true,
			links: data.data,
			pagination: data.pagination,
			error: undefined,
		};
	} catch (error) {
		return {
			success: false,
			links: [],
			pagination: null,
			error:
				error instanceof Error ? error.message : "Fehler beim Laden der Links",
		};
	}
}

export async function fetchLinksAction(_prevState: unknown, formData: FormData) {
	const search = (formData.get("search") as string) || "";
	const page = Number.parseInt((formData.get("page") as string) || "1");
	const pageSize = Number.parseInt((formData.get("pageSize") as string) || "50");
	const sort =
		(formData.get("sort") as "createdAt" | "clicks" | "lastClicked") ||
		"createdAt";
	const showArchived = formData.get("showArchived") === "true";
	const workspaceId = formData.get("workspaceId") as string;

	if (!workspaceId) {
		return {
			success: false,
			links: [],
			pagination: null,
			error: "workspaceId fehlt",
		};
	}

	return getAllLinks(workspaceId, {
		search: search || undefined,
		page,
		pageSize,
		sort,
		showArchived,
	});
}

// ── QR CODE ────────────────────────────────────────────────────────────────

export interface RetrieveQrCodeState {
	success?: boolean;
	dataUrl?: string;
	contentType?: string;
	byteLength?: number;
	error?: string;
}

export async function retrieveQrCodeAction(
	_prevState: RetrieveQrCodeState | undefined,
	formData: FormData,
): Promise<RetrieveQrCodeState> {
	try {
		const workspaceId = formData.get("workspaceId");
		const url = formData.get("url");

		if (!workspaceId || typeof workspaceId !== "string")
			return { error: "workspaceId fehlt" };
		if (!url || typeof url !== "string") return { error: "URL fehlt" };

		const apiKey = await resolveDubApiKey(workspaceId);
		const query = buildQrQuery({
			url,
			logo: formData.get("logo") as string | undefined,
			size: formData.get("size") as string | undefined,
			level: formData.get("level") as string | undefined,
			fgColor: formData.get("fgColor") as string | undefined,
			bgColor: formData.get("bgColor") as string | undefined,
			hideLogo: formData.get("hideLogo") as string | undefined,
			margin: formData.get("margin") as string | undefined,
			includeMargin: formData.get("includeMargin") as string | undefined,
		});

		const response = await fetch(`${DUB_API_BASE_URL}/qr?${query}`, {
			headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/png" },
		});

		if (!response.ok) {
			const errText = await response.text().catch(() => "");
			return {
				error: `Dub QR API Fehler (${response.status}): ${errText}`,
			};
		}

		const arrayBuffer = await response.arrayBuffer();
		const contentType = response.headers.get("content-type") || "image/png";
		return {
			success: true,
			dataUrl: `data:${contentType};base64,${Buffer.from(arrayBuffer).toString("base64")}`,
			contentType,
			byteLength: arrayBuffer.byteLength,
		};
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: "QR-Code konnte nicht erzeugt werden",
		};
	}
}
