"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	Download01Icon,
	File01Icon,
	File02Icon,
	FileZipIcon,
	Image01Icon,
	Loading03Icon,
	MusicNote01Icon,
	Video01Icon,
	ViewIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssetStatusBadge } from "./asset-status-badge";
import type { Asset, AssetStatus } from "./types";
import {
	type AssetType,
	formatBytes,
	formatDate,
	getDisplayName,
} from "./utils";

const ASSET_TYPE_GRADIENTS: Record<AssetType, string> = {
	image: "from-sky-400/12 to-muted/40",
	video: "from-violet-400/12 to-muted/40",
	audio: "from-emerald-400/12 to-muted/40",
	document: "from-blue-400/12 to-muted/40",
	archive: "from-amber-400/12 to-muted/40",
	other: "from-muted/60 to-muted/30",
};

function AssetTypeIcon({
	type,
	size = 18,
}: {
	type: AssetType;
	size?: number;
}) {
	if (type === "image")
		return (
			<HugeiconsIcon icon={Image01Icon} size={size} className="text-sky-400" />
		);
	if (type === "video")
		return (
			<HugeiconsIcon
				icon={Video01Icon}
				size={size}
				className="text-violet-400"
			/>
		);
	if (type === "audio")
		return (
			<HugeiconsIcon
				icon={MusicNote01Icon}
				size={size}
				className="text-emerald-400"
			/>
		);
	if (type === "document")
		return (
			<HugeiconsIcon icon={File01Icon} size={size} className="text-blue-400" />
		);
	if (type === "archive")
		return (
			<HugeiconsIcon
				icon={FileZipIcon}
				size={size}
				className="text-orange-400"
			/>
		);
	return (
		<HugeiconsIcon
			icon={File02Icon}
			size={size}
			className="text-muted-foreground"
		/>
	);
}

interface AssetListRowProps {
	asset: Asset;
	assetType: AssetType;
	thumbnailUrl?: string | null;
	onPreview: (key: string) => void;
	onDownload: (key: string, displayName: string) => void;
	onRename: (key: string, displayName: string) => void;
	onCopyLink: (key: string) => void;
	isActionLoading?: boolean;
	className?: string;
}

export function AssetListRow({
	asset,
	assetType,
	thumbnailUrl,
	onPreview,
	onDownload,
	onRename,
	onCopyLink,
	isActionLoading = false,
	className,
}: AssetListRowProps) {
	const displayName = getDisplayName(asset.key);
	const status: AssetStatus = asset.status ?? "uploaded";

	return (
		<tr
			className={cn("group transition-colors hover:bg-muted/50", className)}
			onDoubleClick={() => onPreview(asset.key)}
		>
			<td className="px-4 py-2">
				<div className="flex min-w-0 items-center gap-3">
					<div className="relative h-10 w-[71px] shrink-0 overflow-hidden rounded-lg bg-muted/40">
						{thumbnailUrl && assetType === "image" ? (
							<Image
								src={thumbnailUrl}
								alt={displayName}
								fill
								sizes="71px"
								className="object-cover"
								loading="lazy"
							/>
						) : (
							<div
								className={cn(
									"flex h-full w-full items-center justify-center bg-gradient-to-br",
									ASSET_TYPE_GRADIENTS[assetType],
								)}
							>
								<AssetTypeIcon type={assetType} size={16} />
							</div>
						)}
					</div>
					<span
						className="truncate text-sm font-medium text-foreground"
						title={displayName}
					>
						{displayName}
					</span>
				</div>
			</td>
			<td className="px-4 py-2 text-right text-xs text-muted-foreground">
				{formatBytes(asset.size)}
			</td>
			<td className="px-4 py-2 text-xs text-muted-foreground">
				{formatDate(asset.lastModified)}
			</td>
			<td className="px-4 py-2">
				<AssetStatusBadge status={status} showLabel />
			</td>
			<td className="relative px-4 py-2 text-right">
				<div className="flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
					<Button
						type="button"
						variant="outline"
						size="xs"
						className="rounded-md"
						onClick={() => onPreview(asset.key)}
					>
						<HugeiconsIcon icon={ViewIcon} size={14} className="mr-1" />
						Vorschau
					</Button>
					<Button
						variant="outline"
						size="xs"
						className="rounded-md"
						onClick={() => onDownload(asset.key, displayName)}
						disabled={isActionLoading}
					>
						{isActionLoading ? (
							<HugeiconsIcon
								icon={Loading03Icon}
								size={14}
								className="mr-1 animate-spin"
							/>
						) : (
							<HugeiconsIcon icon={Download01Icon} size={14} className="mr-1" />
						)}
						Download
					</Button>
				</div>
			</td>
		</tr>
	);
}
