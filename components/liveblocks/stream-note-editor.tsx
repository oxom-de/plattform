"use client";

import { useCallback } from "react";
import { useMutation, useStorage } from "@/lib/liveblocks/client";
import { useDebouncedCallback } from "./use-debounced-callback";
import { useOxomLiveblocksRoom } from "./liveblocks-provider";

export function StreamNoteEditor({
	noteId,
}: {
	noteId: string;
}) {
	const { roomId, workspaceId } = useOxomLiveblocksRoom();
	const note = useStorage((root) =>
		root.notes.find((n) => n.id === noteId) ?? null,
	);

	const updateContent = useMutation(({ storage }, content: string) => {
		const notes = storage.get("notes");
		const idx = notes.findIndex((n) => n.get("id") === noteId);
		if (idx !== -1) {
			notes.get(idx)?.set("content", content);
		}
	}, [noteId]);

	const persistContent = useCallback(
		async (content: string) => {
			await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/live-notes`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					roomId,
					noteId,
					content,
				}),
			}).catch(() => {
				// Realtime editing should not be interrupted by snapshot persistence.
			});
		},
		[noteId, roomId, workspaceId],
	);

	const debouncedPersistContent = useDebouncedCallback(persistContent, 800);

	if (note === null) return null;

	return (
		<textarea
			className="min-h-[160px] w-full rounded-md border border-border/70 bg-background p-3 text-sm"
			value={note.content}
			onChange={(e) => {
				const value = e.target.value;
				updateContent(value);
				debouncedPersistContent(value);
			}}
			placeholder="Write stream notes..."
		/>
	);
}
