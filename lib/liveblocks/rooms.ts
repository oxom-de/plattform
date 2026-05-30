import "server-only";

export type LiveEntityType = "stream-note" | "drive-comment" | "script-editor";

export function buildLiveblocksRoomId(input: {
	workspaceId: string;
	entityType: LiveEntityType;
	entityId: string;
}): string {
	const workspaceId = input.workspaceId.trim();
	const entityType = input.entityType.trim();
	const entityId = input.entityId.trim();

	return `${workspaceId}:${entityType}:${entityId}`;
}
