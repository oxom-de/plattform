export type WorkspacePlan = "CORE" | "ELITE";

export type WorkspaceInfo = {
	id: string;
	name: string;
	slug: string;
	plan: WorkspacePlan;
};
