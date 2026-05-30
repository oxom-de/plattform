"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ASSET_STATUS_LABELS, type AssetStatus } from "./types";

const statusConfig: Record<AssetStatus, { dot: string; label: string }> = {
	final: { dot: "bg-foreground", label: ASSET_STATUS_LABELS.final },
	in_review: { dot: "bg-muted-foreground", label: ASSET_STATUS_LABELS.in_review },
	uploaded: { dot: "bg-muted-foreground/40", label: ASSET_STATUS_LABELS.uploaded },
	changes_requested: {
		dot: "bg-destructive",
		label: ASSET_STATUS_LABELS.changes_requested,
	},
};

interface AssetStatusBadgeProps {
	status: AssetStatus;
	showLabel?: boolean;
	className?: string;
}

export function AssetStatusBadge({
	status,
	showLabel = false,
	className,
}: AssetStatusBadgeProps) {
	const config = statusConfig[status] ?? statusConfig.uploaded;
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className={cn("inline-flex items-center gap-1.5", className)}>
						<span
							className={cn("size-2 shrink-0 rounded-full", config.dot)}
							aria-hidden
						/>
						{showLabel ? (
							<span className="text-xs text-muted-foreground">
								{config.label}
							</span>
						) : null}
					</span>
				</TooltipTrigger>
				<TooltipContent side="top" sideOffset={6}>
					{config.label}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
