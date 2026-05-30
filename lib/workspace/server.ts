import "server-only";

import type { Workspace, WorkspaceParams } from "./types";

function normalizeWorkspaceSlug(value: string | undefined): string {
	return (value || "workspace")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9-_]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

export function getWorkspaceFromParams(params: WorkspaceParams): Workspace {
	const slug = normalizeWorkspaceSlug(params.workspace);
	return { slug, name: slug.toUpperCase() };
}

export function getWorkspacesFromRawTeams(rawTeams: unknown): Workspace[] {
	const teams = Array.isArray(rawTeams)
		? rawTeams
		: typeof rawTeams === "string"
			? [rawTeams]
			: [];

	const uniqueSlugs = [
		...new Set(
			teams.map((team) => normalizeWorkspaceSlug(team)).filter(Boolean),
		),
	];

	if (uniqueSlugs.length === 0) return [];

	return uniqueSlugs.map((workspace) => getWorkspaceFromParams({ workspace }));
}
