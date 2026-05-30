"use client";

import { LiveObject } from "@liveblocks/client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Delete01Icon,
	PlusSignIcon,
} from "@hugeicons-pro/core-twotone-rounded";
import { StreamNoteEditor } from "@/components/liveblocks/stream-note-editor";
import {
	OxomLiveblocksProvider,
} from "@/components/liveblocks/liveblocks-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMutation, useStorage } from "@/lib/liveblocks/client";

/** Inner component — must be inside RoomProvider (via OxomLiveblocksProvider) */
function NotesContent({ workspaceId }: { workspaceId: string }) {
	const noteIds = useStorage((root) => root.notes.map((n) => n.id));

	const addNote = useMutation(({ storage }) => {
		const notes = storage.get("notes");
		const id = `note-${Date.now()}`;
		notes.push(new LiveObject({ id, title: "Neue Notiz", content: "" }));
	}, []);

	const removeNote = useMutation(({ storage }, id: string) => {
		const notes = storage.get("notes");
		if (notes.length <= 1) return;
		const idx = notes.findIndex((n) => n.get("id") === id);
		if (idx !== -1) notes.delete(idx);
	}, []);

	const updateTitle = useMutation(
		({ storage }, id: string, title: string) => {
			const notes = storage.get("notes");
			const idx = notes.findIndex((n) => n.get("id") === id);
			if (idx !== -1) notes.get(idx)?.set("title", title.trim());
		},
		[],
	);

	return (
		<Card className="overflow-hidden rounded-lg border border-border bg-card/50 shadow-sm">
			<CardHeader className="border-b border-border/60 bg-muted/30 pb-3">
				<div className="flex items-center justify-between gap-4">
					<div>
						<CardTitle className="text-xl font-semibold tracking-tight">
							Notizen
						</CardTitle>
						<p className="mt-1 text-xs text-muted-foreground">
							Realtime im Workspace-Raum. Jede Notiz wird getrennt gespeichert.
						</p>
					</div>
					<Button type="button" variant="default" size="sm" onClick={addNote}>
						<HugeiconsIcon
							icon={PlusSignIcon}
							size={16}
							className="mr-2 h-4 w-4"
						/>
						Neue Notiz
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-6 pt-6">
				{noteIds.map((id) => (
					<NoteCard
						key={id}
						noteId={id}
						canDelete={noteIds.length > 1}
						onRemove={removeNote}
						onTitleChange={updateTitle}
					/>
				))}
			</CardContent>
		</Card>
	);
}

function NoteCard({
	noteId,
	canDelete,
	onRemove,
	onTitleChange,
}: {
	noteId: string;
	canDelete: boolean;
	onRemove: (id: string) => void;
	onTitleChange: (id: string, title: string) => void;
}) {
	const title = useStorage(
		(root) => root.notes.find((n) => n.id === noteId)?.title ?? "",
	);

	return (
		<div className="rounded-lg border border-border/70 bg-background/50 p-4 space-y-3">
			<div className="flex items-center gap-2">
				<Input
					value={title}
					onChange={(e) => onTitleChange(noteId, e.target.value)}
					className="h-9 flex-1 font-medium border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
					placeholder="Titel der Notiz"
					aria-label="Notiz-Titel"
				/>
				{canDelete && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
						onClick={() => onRemove(noteId)}
						aria-label="Notiz entfernen"
					>
						<HugeiconsIcon
							icon={Delete01Icon}
							size={16}
							className="h-4 w-4"
						/>
					</Button>
				)}
			</div>
			<StreamNoteEditor noteId={noteId} />
		</div>
	);
}

export function WorkspaceNotesClient({
	workspaceId,
	workspaceSlug: _workspaceSlug,
}: {
	workspaceId: string;
	workspaceSlug: string;
}) {
	// Room ID is deterministic: {workspaceId}:stream-note:stream-session
	const roomId = `${workspaceId}:stream-note:stream-session`;

	return (
		<OxomLiveblocksProvider roomId={roomId} workspaceId={workspaceId}>
			<NotesContent workspaceId={workspaceId} />
		</OxomLiveblocksProvider>
	);
}
