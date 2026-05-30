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
import { type AssetType, getDisplayName } from "./utils";

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
	size = 28,
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

interface RecentAssetsSectionProps {
	assets: Asset[];
	assetTypes: Map<string, AssetType>;
	workspaceSlug: string;
	thumbnailUrls?: Map<string, string>;
	onPreview: (key: string) => void;
	onDownload: (key: string, displayName: string) => void;
	onRename: (key: string, displayName: string) => void;
	onCopyLink: (key: string) => void;
	loadingActionKey?: string | null;
	className?: string;
}

const RECENT_MAX = 4;

export function RecentAssetsSection({
	assets,
	assetTypes,
	workspaceSlug,
	thumbnailUrls,
	onPreview,
	onDownload,
	onRename,
	onCopyLink,
	loadingActionKey,
	className,
}: RecentAssetsSectionProps) {
	const recent = assets.slice(0, RECENT_MAX);
	if (recent.length === 0) return null;

	return (
		<section className={cn("space-y-3", className)}>
			<h3 className="text-sm font-medium text-muted-foreground">
				Kürzlich hochgeladen
			</h3>
			<div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
				{recent.map((asset) => {
					const displayName = getDisplayName(asset.key);
					const type = assetTypes.get(asset.key) ?? "other";
					const status: AssetStatus = asset.status ?? "uploaded";
					const thumbnailUrl = thumbnailUrls?.get(asset.key);
					const isActing =
						loadingActionKey != null && loadingActionKey.endsWith(asset.key);

					return (
						<div
							key={asset.key}
							className="group relative min-w-[200px] max-w-[280px] flex-1 shrink-0 cursor-default overflow-hidden rounded-2xl border border-border/40 bg-card transition-colors duration-200 hover:border-border/70"
							onDoubleClick={() => onPreview(asset.key)}
						>
							<div className="relative aspect-video w-full overflow-hidden bg-muted/30">
								{thumbnailUrl && type === "image" ? (
									<Image
										src={thumbnailUrl}
										alt={displayName}
										fill
										sizes="280px"
										className="object-cover transition-transform duration-200 group-hover:scale-105"
										loading="lazy"
									/>
								) : (
									<div
										className={cn(
											"flex h-full w-full items-center justify-center bg-gradient-to-br",
											ASSET_TYPE_GRADIENTS[type],
										)}
									>
										<AssetTypeIcon type={type} size={28} />
									</div>
								)}
								<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-12 pb-3 px-3">
									<p
										className="truncate text-sm font-medium text-white drop-shadow-sm"
										title={displayName}
									>
										{displayName}
									</p>
									<div className="mt-1 flex items-center justify-between">
										<span className="rounded bg-black/40 px-2 py-0.5 text-[10px] text-white/90">
											—
										</span>
										<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
											<Button
												type="button"
												variant="ghost"
												size="icon-xs"
												className="h-7 w-7 rounded-lg text-white hover:bg-white/20"
												onClick={() => onDownload(asset.key, displayName)}
												disabled={isActing}
											>
												<HugeiconsIcon icon={Download01Icon} size={14} />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon-xs"
												className="h-7 w-7 rounded-lg text-white hover:bg-white/20"
												onClick={() => onCopyLink(asset.key)}
											>
												<HugeiconsIcon icon={Link01Icon} size={14} />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon-xs"
												className="h-7 w-7 rounded-lg text-white hover:bg-white/20"
												onClick={() => onRename(asset.key, displayName)}
												disabled={isActing}
											>
												<HugeiconsIcon icon={PencilEdit01Icon} size={14} />
											</Button>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														className="h-7 w-7 rounded-lg text-white hover:bg-white/20"
													>
														<HugeiconsIcon icon={MoreVerticalIcon} size={14} />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													align="end"
													className="w-48 rounded-xl"
												>
													<DropdownMenuItem
														onClick={() => onPreview(asset.key)}
													>
														<HugeiconsIcon icon={ViewIcon} size={14} />
														Vorschau
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => onDownload(asset.key, displayName)}
													>
														<HugeiconsIcon icon={Download01Icon} size={14} />
														Herunterladen
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => onCopyLink(asset.key)}
													>
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
										</div>
									</div>
								</div>
								<div className="absolute right-2 top-2">
									<AssetStatusBadge status={status} />
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
