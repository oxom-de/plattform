"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { DocLiveblocksProvider } from "@/components/liveblocks/doc-provider";
import { DocEditor } from "@/components/liveblocks/doc-editor";
import { updateDocTitle } from "@/lib/docs/actions";
import type { WorkspaceDoc } from "@/lib/docs/actions";

export function WorkspaceDocEmbeddedEditorClient({
	doc,
	workspaceId,
	workspaceSlug,
}: {
	doc: WorkspaceDoc;
	workspaceId: string;
	workspaceSlug: string;
}) {
	const [title, setTitle] = useState(doc.title);
	const [, startTransition] = useTransition();
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function handleTitleChange(value: string) {
		setTitle(value);
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(() => {
			startTransition(async () => {
				await updateDocTitle(doc.id, value, `/${workspaceSlug}`);
			});
		}, 800);
	}

	return (
		<div className="flex flex-col">
			{/* Mobile header */}
			<div className="flex items-center gap-2 border-b border-border px-3 py-3">
				<Link
					href={`/${workspaceSlug}/docs/embedded`}
					className="shrink-0 text-muted-foreground"
					aria-label="Zurück"
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} size={20} />
				</Link>
				<input
					value={title}
					onChange={(e) => handleTitleChange(e.target.value)}
					className="w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground/40"
					placeholder="Dokumenttitel"
				/>
			</div>

			{/* Editor */}
			<DocLiveblocksProvider docId={doc.id} workspaceId={workspaceId}>
				<DocEditor docTitle={title} />
			</DocLiveblocksProvider>
		</div>
	);
}
