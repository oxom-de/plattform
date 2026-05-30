"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { DocLiveblocksProvider } from "@/components/liveblocks/doc-provider";
import { DocEditor } from "@/components/liveblocks/doc-editor";
import { updateDocTitle } from "@/lib/docs/actions";
import type { WorkspaceDoc } from "@/lib/docs/actions";

export function WorkspaceDocEditorClient({
	doc,
	workspaceId,
	basePath,
}: {
	doc: WorkspaceDoc;
	workspaceId: string;
	basePath: string;
}) {
	const [title, setTitle] = useState(doc.title);
	const [, startTransition] = useTransition();
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function handleTitleChange(value: string) {
		setTitle(value);
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(() => {
			startTransition(async () => {
				await updateDocTitle(doc.id, value, basePath);
			});
		}, 800);
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Back + title */}
			<div className="flex items-center gap-3">
				<Link
					href={`${basePath}/docs`}
					className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Zurück zu Docs"
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
				</Link>

				<input
					value={title}
					onChange={(e) => handleTitleChange(e.target.value)}
					className="w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
					placeholder="Dokumenttitel"
				/>
			</div>

			{/* Editor card — no padding, toolbar sits flush at the top */}
			<div className="overflow-hidden rounded-xl border border-border bg-card">
				<DocLiveblocksProvider docId={doc.id} workspaceId={workspaceId}>
					<DocEditor docTitle={title} />
				</DocLiveblocksProvider>
			</div>
		</div>
	);
}
