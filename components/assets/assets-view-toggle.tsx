"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { GridViewIcon, Menu01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ViewMode } from "./types";

interface AssetsViewToggleProps {
	value: ViewMode;
	onChange: (mode: ViewMode) => void;
	className?: string;
}

export function AssetsViewToggle({
	value,
	onChange,
	className,
}: AssetsViewToggleProps) {
	return (
		<TooltipProvider>
			<div
				className={cn(
					"flex items-center rounded-lg bg-muted/50 p-0.5",
					className,
				)}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className={cn(
								"rounded-md",
								value === "list"
									? "bg-background text-foreground shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
							onClick={() => onChange("list")}
						>
							<HugeiconsIcon icon={Menu01Icon} size={14} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Listenansicht</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className={cn(
								"rounded-md",
								value === "grid"
									? "bg-background text-foreground shadow-xs"
									: "text-muted-foreground hover:text-foreground",
							)}
							onClick={() => onChange("grid")}
						>
							<HugeiconsIcon icon={GridViewIcon} size={14} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Rasteransicht</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}
