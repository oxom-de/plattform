"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons-pro/core-stroke-rounded";
import { File02Icon } from "@hugeicons-pro/core-twotone-rounded";
import { createDoc } from "@/lib/docs/actions";
import type { WorkspaceDoc } from "@/lib/docs/actions";

export function WorkspaceDocsEmbeddedClient({
	docs: initialDocs,
	workspaceId,
	workspaceSlug,
}: {
	docs: WorkspaceDoc[];
	workspaceId: string;
	workspaceSlug: string;
}) {
	const [docs, setDocs] = useState(initialDocs);
	const [isPending, startTransition] = useTransition();

	function handleCreate() {
		startTransition(async () => {
			const doc = await createDoc(workspaceId, `/${workspaceSlug}`);
			setDocs((prev) => [doc, ...prev]);
		});
	}

	return (
		<div className="flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-3.5">
				<h1 className="text-base font-semibold">Docs</h1>
				<button
					type="button"
					onClick={handleCreate}
					disabled={isPending}
					className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50"
				>
					<HugeiconsIcon icon={PlusSignIcon} size={12} />
					Neu
				</button>
			</div>

			{/* List */}
			{docs.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<HugeiconsIcon icon={File02Icon} size={36} className="mb-4 text-muted-foreground/30" />
					<p className="text-sm font-medium">Noch keine Dokumente</p>
					<p className="mt-1 text-xs text-muted-foreground">Tippe auf „Neu" um loszulegen.</p>
				</div>
			) : (
				<div className="divide-y divide-border/60">
					{docs.map((doc) => (
						<Link
							key={doc.id}
							href={`/${workspaceSlug}/docs/${doc.id}/embedded`}
							className="flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-muted/60"
						>
							<span className="text-xl leading-none">{doc.emoji ?? "📄"}</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{doc.title || "Ohne Titel"}</p>
								<p className="mt-0.5 text-[11px] text-muted-foreground">
									{formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true, locale: de })}
								</p>
							</div>
							<svg className="size-3.5 shrink-0 text-muted-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
