import "server-only";

// Link in Bio ist in apps/plattform immer aktiv.
export async function isLinkInBioEnabledForWorkspace(
	_workspaceId: string,
): Promise<boolean> {
	return true;
}

// Media ist nicht Teil der OSS-Plattform.
export async function isMediaEnabledForWorkspace(
	_workspaceId: string,
): Promise<boolean> {
	return false;
}
