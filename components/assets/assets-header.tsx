"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { Input } from "@/components/ui/input";
import { AssetsViewToggle } from "./assets-view-toggle";
import type { ViewMode } from "./types";

interface AssetsHeaderProps {
	title?: string;
	searchValue: string;
	onSearchChange: (value: string) => void;
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	uploadSlot?: React.ReactNode | null;
	className?: string;
}

export function AssetsHeader({
	title = "Assets",
	searchValue,
	onSearchChange,
	viewMode,
	onViewModeChange,
	uploadSlot = null,
	className,
}: AssetsHeaderProps) {
	return (
		<header
			className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}
		>
			<h2 className="text-lg font-semibold tracking-tight text-foreground">
				{title}
			</h2>
			<div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
				<div className="relative flex-1 sm:max-w-xs">
					<HugeiconsIcon
						icon={Search01Icon}
						size={14}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						value={searchValue}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Suchen"
						className="h-9 rounded-lg border-border/60 bg-muted/30 pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-2"
					/>
				</div>
				<div className="flex items-center gap-2">
					<AssetsViewToggle value={viewMode} onChange={onViewModeChange} />
					{uploadSlot != null ? uploadSlot : null}
				</div>
			</div>
		</header>
	);
}
