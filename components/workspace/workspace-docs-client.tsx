"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, PlusSignIcon } from "@hugeicons-pro/core-stroke-rounded";
import { File02Icon } from '@hugeicons-pro/core-twotone-rounded';
import { Button } from "@/components/ui/button";
import { createDoc, deleteDoc } from "@/lib/docs/actions";
import type { WorkspaceDoc } from "@/lib/docs/actions";

export function WorkspaceDocsClient({
	docs: initialDocs,
	workspaceId,
	basePath,
}: {
	docs: WorkspaceDoc[];
	workspaceId: string;
	basePath: string;
}) {
	const [docs, setDocs] = useState(initialDocs);
	const [isPending, startTransition] = useTransition();

	function handleCreate() {
		startTransition(async () => {
			const doc = await createDoc(workspaceId, basePath);
			setDocs((prev) => [doc, ...prev]);
		});
	}

	function handleDelete(docId: string) {
		startTransition(async () => {
			await deleteDoc(docId, basePath);
			setDocs((prev) => prev.filter((d) => d.id !== docId));
		});
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{docs.length === 0 ? "Noch keine Dokumente." : `${docs.length} Dokument${docs.length !== 1 ? "e" : ""}`}
				</p>
				<Button size="sm" className="gap-1.5" onClick={handleCreate} disabled={isPending}>
					<HugeiconsIcon icon={PlusSignIcon} size={13} className="shrink-0" />
					Neues Dokument
				</Button>
			</div>

			{docs.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
					<HugeiconsIcon icon={File02Icon} size={32} className="mb-4 text-muted-foreground/40" />
					<p className="text-sm font-medium">Kein Dokument vorhanden</p>
					<p className="mt-1 text-xs text-muted-foreground">Erstelle dein erstes Dokument mit dem Button oben.</p>
				</div>
			) : (
				<div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
					{docs.map((doc) => (
						<div key={doc.id} className="group flex items-center gap-4 bg-card px-4 py-3.5 transition-colors hover:bg-muted/40">
							<span className="text-lg leading-none">{doc.emoji ?? "📄"}</span>

							<Link
								href={`${basePath}/docs/${doc.id}`}
								className="min-w-0 flex-1"
							>
								<p className="truncate text-sm font-medium text-foreground group-hover:text-foreground/80">
									{doc.title}
								</p>
								<p className="mt-0.5 text-[11px] text-muted-foreground">
									Bearbeitet{" "}
									{formatDistanceToNow(new Date(doc.updated_at), {
										addSuffix: true,
										locale: de,
									})}
								</p>
							</Link>

							<Button
								variant="ghost"
								size="icon"
								className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
								onClick={() => handleDelete(doc.id)}
								disabled={isPending}
								aria-label="Dokument löschen"
							>
								<HugeiconsIcon icon={Delete01Icon} size={13} />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
