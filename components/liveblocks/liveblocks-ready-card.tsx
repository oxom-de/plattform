"use client";

import { OxomLiveblocksProvider } from "@/components/liveblocks/liveblocks-provider";
import { StreamNoteEditor } from "@/components/liveblocks/stream-note-editor";

export function LiveblocksReadyCard({
	workspaceId,
}: {
	workspaceId: string;
	workspaceSlug: string;
}) {
	const roomId = `${workspaceId}:stream-note:stream-session`;

	return (
		<section className="space-y-3 rounded-md border border-border/70 bg-card/50 p-4">
			<header className="space-y-1">
				<h3 className="text-base font-semibold">
					Liveblocks Stream Note (MVP)
				</h3>
				<p className="text-sm text-muted-foreground">
					Realtime transport is room-scoped by workspace. Synced via Liveblocks CRDT.
				</p>
			</header>
			<p className="text-xs text-muted-foreground">Room: {roomId}</p>
			<OxomLiveblocksProvider roomId={roomId} workspaceId={workspaceId}>
				<StreamNoteEditor noteId="note-1" />
			</OxomLiveblocksProvider>
		</section>
	);
}
