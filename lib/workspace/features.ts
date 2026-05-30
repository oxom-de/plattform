import "server-only";

import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

const FEATURE_TABLE_CANDIDATES = ["workspace_features", "features"] as const;
type FeatureTable = (typeof FEATURE_TABLE_CANDIDATES)[number];

type DbError = {
	code?: string | null;
	message?: string | null;
};

type FeatureRow = {
	workspace_id: string;
	feature_key: string;
	enabled: boolean;
};

export const LINK_IN_BIO_FEATURE_KEY = "link-in-bio";
export const MEDIA_FEATURE_KEY = "media";
export const AGENCY_FEATURE_KEY = "agency";

export type WorkspaceFeatureLookupResult = {
	enabled: boolean;
	table: FeatureTable | null;
	missingTable: boolean;
	error: DbError | null;
};

export type WorkspaceFeatureListResult = {
	map: Map<string, boolean>;
	table: FeatureTable | null;
	missingTable: boolean;
	error: DbError | null;
};

export type WorkspaceFeatureSetResult = {
	success: boolean;
	table: FeatureTable | null;
	missingTable: boolean;
	error: DbError | null;
};

function isMissingRelationError(error: DbError | null): boolean {
	if (!error) return false;
	const message = (error.message || "").toLowerCase();
	return (
		error.code === "42P01" ||
		error.code === "PGRST205" ||
		(message.includes("relation") && message.includes("does not exist")) ||
		message.includes("could not find the table")
	);
}

export async function getWorkspaceFeatureEnabled(
	workspaceId: string,
	featureKey: string,
): Promise<WorkspaceFeatureLookupResult> {
	const normalizedWorkspaceId = workspaceId.trim();
	const normalizedFeatureKey = featureKey.trim();

	if (!normalizedWorkspaceId || !normalizedFeatureKey) {
		return { enabled: false, table: null, missingTable: false, error: null };
	}

	const supabase = createServerSupabaseAdminClient();

	for (const table of FEATURE_TABLE_CANDIDATES) {
		const { data, error } = await supabase
			.from(table)
			.select("workspace_id, feature_key, enabled")
			.eq("workspace_id", normalizedWorkspaceId)
			.eq("feature_key", normalizedFeatureKey)
			.maybeSingle<FeatureRow>();

		if (!error) {
			return {
				enabled: data?.enabled === true,
				table,
				missingTable: false,
				error: null,
			};
		}

		if (isMissingRelationError(error)) {
			continue;
		}

		return {
			enabled: false,
			table,
			missingTable: false,
			error,
		};
	}

	return {
		enabled: false,
		table: null,
		missingTable: true,
		error: null,
	};
}

export async function listWorkspaceFeatureEnabledMap(
	workspaceIds: string[],
	featureKey: string,
): Promise<WorkspaceFeatureListResult> {
	const normalizedWorkspaceIds = Array.from(
		new Set(workspaceIds.map((id) => id.trim()).filter(Boolean)),
	);
	const normalizedFeatureKey = featureKey.trim();

	if (!normalizedFeatureKey || normalizedWorkspaceIds.length === 0) {
		return { map: new Map(), table: null, missingTable: false, error: null };
	}

	const supabase = createServerSupabaseAdminClient();

	for (const table of FEATURE_TABLE_CANDIDATES) {
		const { data, error } = await supabase
			.from(table)
			.select("workspace_id, feature_key, enabled")
			.eq("feature_key", normalizedFeatureKey)
			.in("workspace_id", normalizedWorkspaceIds);

		if (!error) {
			const map = new Map<string, boolean>();
			for (const row of (data || []) as FeatureRow[]) {
				map.set(row.workspace_id, row.enabled === true);
			}

			return {
				map,
				table,
				missingTable: false,
				error: null,
			};
		}

		if (isMissingRelationError(error)) {
			continue;
		}

		return {
			map: new Map(),
			table,
			missingTable: false,
			error,
		};
	}

	return {
		map: new Map(),
		table: null,
		missingTable: true,
		error: null,
	};
}

export async function setWorkspaceFeatureEnabled(
	workspaceId: string,
	featureKey: string,
	enabled: boolean,
): Promise<WorkspaceFeatureSetResult> {
	const normalizedWorkspaceId = workspaceId.trim();
	const normalizedFeatureKey = featureKey.trim();
	if (!normalizedWorkspaceId || !normalizedFeatureKey) {
		return {
			success: false,
			table: null,
			missingTable: false,
			error: { message: "Workspace ID and feature key are required." },
		};
	}

	const supabase = createServerSupabaseAdminClient();

	for (const table of FEATURE_TABLE_CANDIDATES) {
		const updateResult = await supabase
			.from(table)
			.update({ enabled })
			.eq("workspace_id", normalizedWorkspaceId)
			.eq("feature_key", normalizedFeatureKey)
			.select("workspace_id")
			.maybeSingle<{ workspace_id: string }>();

		if (updateResult.error) {
			if (isMissingRelationError(updateResult.error)) {
				continue;
			}

			return {
				success: false,
				table,
				missingTable: false,
				error: updateResult.error,
			};
		}

		if (updateResult.data) {
			return {
				success: true,
				table,
				missingTable: false,
				error: null,
			};
		}

		const insertResult = await supabase.from(table).insert({
			workspace_id: normalizedWorkspaceId,
			feature_key: normalizedFeatureKey,
			enabled,
		});

		if (!insertResult.error) {
			return {
				success: true,
				table,
				missingTable: false,
				error: null,
			};
		}

		if (isMissingRelationError(insertResult.error)) {
			continue;
		}

		// Handle race if row was inserted concurrently.
		if (insertResult.error.code === "23505") {
			const retryUpdate = await supabase
				.from(table)
				.update({ enabled })
				.eq("workspace_id", normalizedWorkspaceId)
				.eq("feature_key", normalizedFeatureKey);

			if (!retryUpdate.error) {
				return {
					success: true,
					table,
					missingTable: false,
					error: null,
				};
			}

			return {
				success: false,
				table,
				missingTable: false,
				error: retryUpdate.error,
			};
		}

		return {
			success: false,
			table,
			missingTable: false,
			error: insertResult.error,
		};
	}

	return {
		success: false,
		table: null,
		missingTable: true,
		error: null,
	};
}
