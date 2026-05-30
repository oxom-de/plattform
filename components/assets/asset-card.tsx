"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	Download01Icon,
	File01Icon,
	File02Icon,
	FileZipIcon,
	Image01Icon,
	Link01Icon,
	MoreVerticalIcon,
	MusicNote01Icon,
	PencilEdit01Icon,
	Video01Icon,
	ViewIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AssetStatusBadge } from "./asset-status-badge";
import type { Asset, AssetStatus } from "./types";
import {
	type AssetType,
	formatBytes,
	formatDate,
	getDisplayName,
	getPreviewPath,
} from "./utils";

function AssetTypeIcon({
	type,
	size = 24,
}: {
	type: AssetType;
	size?: number;
}) {
	const iconMap = {
		image: Image01Icon,
		video: Video01Icon,
		audio: MusicNote01Icon,
		document: File01Icon,
		archive: FileZipIcon,
		other: File02Icon,
	};
	return (
		<HugeiconsIcon
			icon={iconMap[type] ?? File02Icon}
			size={size}
			className="text-muted-foreground"
		/>
	);
}

interface AssetCardProps {
	asset: Asset;
	assetType: AssetType;
	workspaceSlug: string;
	thumbnailUrl?: string | null;
	onPreview: (key: string) => void;
	onDownload: (key: string, displayName: string) => void;
	onRename: (key: string, displayName: string) => void;
	onCopyLink: (key: string) => void;
	isActionLoading?: boolean;
	className?: string;
}

export function AssetCard({
	asset,
	assetType,
	workspaceSlug,
	thumbnailUrl,
	onPreview,
	onDownload,
	onRename,
	onCopyLink,
	isActionLoading = false,
	className,
}: AssetCardProps) {
	const displayName = getDisplayName(asset.key);
	const status: AssetStatus = asset.status ?? "uploaded";

	return (
		<div
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card transition-colors duration-200 hover:border-border/70",
				className,
			)}
			onDoubleClick={() => onPreview(asset.key)}
		>
			<div className="relative aspect-video w-full overflow-hidden bg-muted/30">
				{thumbnailUrl && assetType === "image" ? (
					<Image
						src={thumbnailUrl}
						alt={displayName}
						fill
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
						className="object-cover"
						loading="lazy"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center bg-muted/40">
						<AssetTypeIcon type={assetType} size={32} />
					</div>
				)}
				<div className="absolute right-2 top-2">
					<AssetStatusBadge status={status} />
				</div>
			</div>
			<div className="flex flex-1 flex-col gap-1 p-3">
				<p
					className="truncate text-sm font-semibold text-foreground"
					title={displayName}
				>
					{displayName}
				</p>
				<div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
					<span>—</span>
					<span>{formatBytes(asset.size)}</span>
					<span>{formatDate(asset.lastModified)}</span>
				</div>
				<div className="mt-1 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
					{!isActionLoading && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									className="h-7 w-7 rounded-full"
								>
									<HugeiconsIcon icon={MoreVerticalIcon} size={14} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuItem onClick={() => onPreview(asset.key)}>
									<HugeiconsIcon icon={ViewIcon} size={14} />
									Vorschau
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => onDownload(asset.key, displayName)}
								>
									<HugeiconsIcon icon={Download01Icon} size={14} />
									Herunterladen
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => onCopyLink(asset.key)}>
									<HugeiconsIcon icon={Link01Icon} size={14} />
									Link kopieren
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => onRename(asset.key, displayName)}
								>
									<HugeiconsIcon icon={PencilEdit01Icon} size={14} />
									Umbenennen
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>
		</div>
	);
}
