"use client";

import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon, Pdf01Icon } from "@hugeicons-pro/core-stroke-rounded";

export function DocPdfView({ node }: ReactNodeViewProps) {
	const [collapsed, setCollapsed] = useState(false);
	const { src } = node.attrs;

	const filename = src
		? decodeURIComponent(src.split("/").pop()?.split("?")[0] ?? "Dokument.pdf")
		: "Dokument.pdf";

	return (
		<NodeViewWrapper>
			<div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
				{/* Header */}
				<button
					type="button"
					onClick={() => setCollapsed((v) => !v)}
					className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
				>
					<HugeiconsIcon icon={Pdf01Icon} size={14} className="shrink-0 text-muted-foreground" />
					<span className="flex-1 truncate text-xs font-medium text-foreground/80">
						{filename}
					</span>
					<HugeiconsIcon
						icon={collapsed ? ArrowDown01Icon : ArrowUp01Icon}
						size={13}
						className="shrink-0 text-muted-foreground"
					/>
				</button>

				{/* Iframe */}
				{!collapsed && (
					<div className="border-t border-border">
						<iframe
							src={src}
							className="block w-full border-none"
							style={{ height: 600 }}
							title={filename}
						/>
					</div>
				)}
			</div>
		</NodeViewWrapper>
	);
}
