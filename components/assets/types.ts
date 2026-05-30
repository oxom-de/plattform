export type AssetStatus =
	| "final"
	| "in_review"
	| "uploaded"
	| "changes_requested";

export interface Asset {
	key: string;
	size: number;
	lastModified: string | null;
	status?: AssetStatus;
}

export type ViewMode = "grid" | "list";

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
	final: "Final",
	in_review: "In Review",
	uploaded: "Uploaded",
	changes_requested: "Changes Requested",
};
