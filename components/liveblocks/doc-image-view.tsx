"use client";

import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon, ImageAdd02Icon } from "@hugeicons-pro/core-stroke-rounded";

export function DocImageView({ node }: ReactNodeViewProps) {
	const [collapsed, setCollapsed] = useState(false);
	const { src, alt } = node.attrs;

	const label =
		alt?.trim() ||
		(src
			? decodeURIComponent(src.split("/").pop()?.split("?")[0] ?? "Bild")
			: "Bild");

	return (
		<NodeViewWrapper>
			<div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
				<button
					type="button"
					onClick={() => setCollapsed((v) => !v)}
					className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
				>
					<HugeiconsIcon icon={ImageAdd02Icon} size={14} className="shrink-0 text-muted-foreground" />
					<span className="flex-1 truncate text-xs font-medium text-foreground/80">
						{label}
					</span>
					<HugeiconsIcon
						icon={collapsed ? ArrowDown01Icon : ArrowUp01Icon}
						size={13}
						className="shrink-0 text-muted-foreground"
					/>
				</button>

				{!collapsed && (
					<div className="border-t border-border p-3">
						<img
							src={src}
							alt={alt ?? ""}
							className="tiptap-image"
						/>
					</div>
				)}
			</div>
		</NodeViewWrapper>
	);
}
