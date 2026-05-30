"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	FolderOpenIcon,
	RefreshIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
	type Asset,
	AssetCard,
	AssetListRow,
	AssetsHeader,
	detectAssetType,
	formatBytes,
	formatDateGroup,
	getDisplayName,
	getPreviewPath,
	RecentAssetsSection,
	type ViewMode,
} from "@/components/assets";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

type CreatorFile = {
	key: string;
	size: number;
	lastModified: string | null;
};

interface CreatorFilesListProps {
	creatorSlug: string;
	refreshToken?: number;
	uploadSlot?: React.ReactNode | null;
	className?: string;
}

type SortField = "name" | "size" | "lastModified";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 24;
const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(t);
	}, [value, delayMs]);
	return debounced;
}

function fileToAsset(f: CreatorFile): Asset {
	return {
		key: f.key,
		size: f.size,
		lastModified: f.lastModified,
		status: "uploaded",
	};
}

export default function CreatorFilesList({
	creatorSlug,
	refreshToken = 0,
	uploadSlot = null,
	className = "",
}: CreatorFilesListProps) {
	const router = useRouter();
	const [files, setFiles] = useState<CreatorFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [initialLoad, setInitialLoad] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [loadingActionKey, setLoadingActionKey] = useState<string | null>(null);
	const [searchInput, setSearchInput] = useState("");
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState<SortField>("lastModified");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");
	const [renameTarget, setRenameTarget] = useState<{
		key: string;
		currentName: string;
	} | null>(null);
	const [renameFilename, setRenameFilename] = useState("");

	const debouncedQuery = useDebouncedValue(
		searchInput.trim().toLowerCase(),
		DEBOUNCE_MS,
	);

	const normalizedSlug = useMemo(
		() =>
			creatorSlug
				.toLowerCase()
				.trim()
				.replace(/[^a-z0-9-_]/g, "-")
				.replace(/-+/g, "-")
				.replace(/^-|-$/g, ""),
		[creatorSlug],
	);

	const loadFiles = useCallback(async () => {
		if (!normalizedSlug) {
			setFiles([]);
			setError("Ungültiger Creator-Slug");
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const params = new URLSearchParams({
				creatorSlug: normalizedSlug,
				limit: "100",
			});
			const response = await fetch(`/api/files?${params.toString()}`, {
				method: "GET",
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(
					data?.details ||
						data?.error ||
						"Dateiliste konnte nicht geladen werden",
				);
			}
			const data = await response.json();
			setFiles(Array.isArray(data?.files) ? data.files : []);
		} catch (loadError: unknown) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Dateiliste konnte nicht geladen werden",
			);
		} finally {
			setLoading(false);
			setInitialLoad(false);
		}
	}, [normalizedSlug]);

	const getFileUrl = useCallback(
		async (key: string, mode: "view" | "download") => {
			const response = await fetch("/api/download", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key, mode }),
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(
					data?.details ||
						data?.error ||
						"Datei-Link konnte nicht erstellt werden",
				);
			}
			const data = await response.json();
			if (!data?.downloadUrl) throw new Error("Datei-Link fehlt");
			return data.downloadUrl as string;
		},
		[],
	);

	const handlePreview = useCallback(
		(key: string) => {
			router.push(getPreviewPath(normalizedSlug, key));
		},
		[router, normalizedSlug],
	);

	const handleDownload = useCallback(
		async (key: string, displayName: string) => {
			try {
				setError(null);
				setLoadingActionKey(`download:${key}`);
				const url = await getFileUrl(key, "download");
				const link = document.createElement("a");
				link.href = url;
				link.download = displayName;
				link.rel = "noopener noreferrer";
				link.style.display = "none";
				document.body.appendChild(link);
				link.click();
				link.remove();
			} catch (actionError: unknown) {
				setError(
					actionError instanceof Error
						? actionError.message
						: "Download fehlgeschlagen",
				);
			} finally {
				setLoadingActionKey(null);
			}
		},
		[getFileUrl],
	);

	const handleCopyLink = useCallback(
		async (key: string) => {
			try {
				setError(null);
				const url = await getFileUrl(key, "view");
				const fullUrl =
					typeof window !== "undefined"
						? `${window.location.origin}${getPreviewPath(normalizedSlug, key)}`
						: url;
				await navigator.clipboard.writeText(fullUrl);
			} catch (actionError: unknown) {
				setError(
					actionError instanceof Error
						? actionError.message
						: "Link konnte nicht kopiert werden",
				);
			}
		},
		[getFileUrl, normalizedSlug],
	);

	const openRenameDialog = useCallback((key: string, currentName: string) => {
		setRenameTarget({ key, currentName });
		setRenameFilename(currentName);
	}, []);

	const closeRenameDialog = useCallback(() => {
		setRenameTarget(null);
		setRenameFilename("");
	}, []);

	const handleRename = useCallback(async () => {
		if (!renameTarget) return;
		const nextName = renameFilename.trim();
		if (!nextName) {
			setError("Bitte einen Dateinamen eingeben");
			return;
		}
		try {
			setError(null);
			setLoadingActionKey(`rename:${renameTarget.key}`);
			const response = await fetch("/api/files/rename", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: renameTarget.key, newFilename: nextName }),
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(
					data?.details || data?.error || "Umbenennen fehlgeschlagen",
				);
			}
			closeRenameDialog();
			await loadFiles();
		} catch (renameError: unknown) {
			setError(
				renameError instanceof Error
					? renameError.message
					: "Umbenennen fehlgeschlagen",
			);
		} finally {
			setLoadingActionKey(null);
		}
	}, [renameTarget, renameFilename, closeRenameDialog, loadFiles]);

	useEffect(() => {
		loadFiles();
	}, [loadFiles, refreshToken]);

	const filteredFiles = useMemo(() => {
		if (!debouncedQuery) return files;
		return files.filter((f) => {
			const name = getDisplayName(f.key).toLowerCase();
			return (
				name.includes(debouncedQuery) ||
				f.key.toLowerCase().includes(debouncedQuery)
			);
		});
	}, [files, debouncedQuery]);

	const sortedFiles = useMemo(() => {
		const sorted = [...filteredFiles];
		sorted.sort((a, b) => {
			let cmp = 0;
			if (sortField === "name") {
				cmp = getDisplayName(a.key).localeCompare(getDisplayName(b.key), "de");
			} else if (sortField === "size") {
				cmp = a.size - b.size;
			} else {
				const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
				const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
				cmp = aTime - bTime;
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
		return sorted;
	}, [filteredFiles, sortField, sortDir]);

	const assets = useMemo(() => sortedFiles.map(fileToAsset), [sortedFiles]);
	const assetTypes = useMemo(() => {
		const map = new Map<string, ReturnType<typeof detectAssetType>>();
		sortedFiles.forEach((f) =>
			map.set(f.key, detectAssetType(getDisplayName(f.key))),
		);
		return map;
	}, [sortedFiles]);

	const recentAssets = useMemo(() => assets.slice(0, 4), [assets]);
	const totalPages = Math.max(
		1,
		Math.ceil(sortedFiles.length / ITEMS_PER_PAGE),
	);
	const paginatedAssets = useMemo(() => {
		const start = (page - 1) * ITEMS_PER_PAGE;
		return assets.slice(start, start + ITEMS_PER_PAGE);
	}, [assets, page]);

	const groupedForList = useMemo(() => {
		const groups = new Map<string, Asset[]>();
		paginatedAssets.forEach((asset) => {
			const group = formatDateGroup(asset.lastModified);
			if (!groups.has(group)) groups.set(group, []);
			groups.get(group)!.push(asset);
		});
		const order = ["Heute", "Gestern", "Diese Woche"];
		return Array.from(groups.entries()).sort(([a], [b]) => {
			const ai = order.indexOf(a);
			const bi = order.indexOf(b);
			if (ai !== -1 && bi !== -1) return ai - bi;
			if (ai !== -1) return -1;
			if (bi !== -1) return 1;
			return a.localeCompare(b);
		});
	}, [paginatedAssets]);

	useEffect(() => {
		setPage(1);
	}, [debouncedQuery, refreshToken, normalizedSlug, sortField, sortDir]);

	useEffect(() => {
		if (page > totalPages) setPage(totalPages);
	}, [page, totalPages]);

	const totalSizeLabel = useMemo(
		() => formatBytes(filteredFiles.reduce((sum, f) => sum + f.size, 0)),
		[filteredFiles],
	);

	return (
		<TooltipProvider>
			<div className={className}>
				<AssetsHeader
					title="Assets"
					searchValue={searchInput}
					onSearchChange={setSearchInput}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					uploadSlot={
						<>
							{uploadSlot}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										onClick={loadFiles}
										disabled={loading}
										className="rounded-lg"
									>
										<HugeiconsIcon
											icon={RefreshIcon}
											size={14}
											className={loading ? "animate-spin" : ""}
										/>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Aktualisieren</TooltipContent>
							</Tooltip>
						</>
					}
				/>

				{error ? (
					<div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
						{error}
					</div>
				) : null}

				{initialLoad && loading ? (
					<div className="space-y-6">
						<div className="h-24 rounded-2xl bg-muted/30" />
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="aspect-video rounded-2xl" />
							))}
						</div>
					</div>
				) : (
					<>
						<RecentAssetsSection
							assets={recentAssets}
							assetTypes={assetTypes}
							workspaceSlug={normalizedSlug}
							onPreview={handlePreview}
							onDownload={handleDownload}
							onRename={openRenameDialog}
							onCopyLink={handleCopyLink}
							loadingActionKey={loadingActionKey}
						/>

						{sortedFiles.length === 0 ? (
							<div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-muted/20 py-20 text-center">
								<div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50">
									<HugeiconsIcon
										icon={FolderOpenIcon}
										size={28}
										className="text-muted-foreground"
									/>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground">
										{debouncedQuery ? "Keine Treffer" : "Keine Dateien"}
									</p>
									<p className="mt-1 text-xs text-muted-foreground/80">
										{debouncedQuery
											? `Kein Ergebnis für "${searchInput.trim()}"`
											: "Dateien hochladen, um loszulegen."}
									</p>
								</div>
							</div>
						) : viewMode === "list" ? (
							<div className="space-y-6">
								<div className="overflow-x-auto rounded-2xl border border-border/40 bg-card">
									<table className="w-full min-w-[640px] border-collapse text-sm">
										<thead>
											<tr className="border-b border-border/60 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
												<th className="px-4 py-2 text-left font-medium">
													Name
												</th>
												<th className="w-[90px] px-4 py-2 text-right font-medium">
													Größe
												</th>
												<th className="w-[110px] px-4 py-2 text-left font-medium">
													Geändert
												</th>
												<th className="w-[90px] px-4 py-2 text-left font-medium">
													Status
												</th>
												<th className="w-[80px] px-4 py-2 text-right font-medium">
													Aktion
												</th>
											</tr>
										</thead>
										<tbody>
											{groupedForList.map(([groupLabel, groupAssets]) => (
												<Fragment key={groupLabel}>
													<tr key={groupLabel}>
														<td
															colSpan={5}
															className="px-4 pt-4 pb-1 text-xs font-medium text-muted-foreground"
														>
															{groupLabel}
														</td>
													</tr>
													{groupAssets.map((asset) => (
														<AssetListRow
															key={asset.key}
															asset={asset}
															assetType={assetTypes.get(asset.key) ?? "other"}
															onPreview={handlePreview}
															onDownload={handleDownload}
															onRename={openRenameDialog}
															onCopyLink={handleCopyLink}
															isActionLoading={
																loadingActionKey != null &&
																loadingActionKey.endsWith(asset.key)
															}
														/>
													))}
												</Fragment>
											))}
										</tbody>
									</table>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
								{paginatedAssets.map((asset) => (
									<AssetCard
										key={asset.key}
										asset={asset}
										assetType={assetTypes.get(asset.key) ?? "other"}
										workspaceSlug={normalizedSlug}
										onPreview={handlePreview}
										onDownload={handleDownload}
										onRename={openRenameDialog}
										onCopyLink={handleCopyLink}
										isActionLoading={
											loadingActionKey != null &&
											loadingActionKey.endsWith(asset.key)
										}
									/>
								))}
							</div>
						)}

						{sortedFiles.length > 0 ? (
							<>
								<section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/40 bg-border md:grid-cols-4">
									<div className="flex flex-col items-center gap-1 bg-card py-6 text-center">
										<p className="text-2xl font-semibold tracking-tight text-foreground">
											{sortedFiles.length}
										</p>
										<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
											Dateien
										</p>
									</div>
									<div className="flex flex-col items-center gap-1 bg-card py-6 text-center">
										<p className="text-2xl font-semibold tracking-tight text-foreground">
											{totalSizeLabel}
										</p>
										<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
											Belegt
										</p>
									</div>
									<div className="flex flex-col items-center gap-1 bg-card py-6 text-center">
										<p className="text-2xl font-semibold tracking-tight text-foreground">
											—
										</p>
										<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
											Team-Mitglieder
										</p>
									</div>
									<div className="flex flex-col items-center gap-1 bg-card py-6 text-center">
										<p className="text-2xl font-semibold tracking-tight text-foreground">
											{(() => {
												const used = filteredFiles.reduce(
													(s, f) => s + f.size,
													0,
												);
												const totalBytes = 1024 * 1024 * 1024 * 1024;
												const available = Math.max(0, totalBytes - used);
												return formatBytes(available);
											})()}
										</p>
										<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
											Verfügbar
										</p>
									</div>
								</section>
								<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 pt-4">
									<p className="text-xs text-muted-foreground">
										{sortedFiles.length} Datei
										{sortedFiles.length !== 1 ? "en" : ""} · {totalSizeLabel}
										{totalPages > 1 ? ` · Seite ${page}/${totalPages}` : ""}
									</p>
									{totalPages > 1 ? (
										<div className="flex items-center gap-2">
											<Button
												type="button"
												variant="ghost"
												size="xs"
												onClick={() => setPage((p) => Math.max(1, p - 1))}
												disabled={page <= 1}
												className="rounded-lg"
											>
												Zurück
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="xs"
												onClick={() =>
													setPage((p) => Math.min(totalPages, p + 1))
												}
												disabled={page >= totalPages}
												className="rounded-lg"
											>
												Weiter
											</Button>
										</div>
									) : null}
								</div>
							</>
						) : null}
					</>
				)}

				<Dialog
					open={Boolean(renameTarget)}
					onOpenChange={(open) => !open && closeRenameDialog()}
				>
					<DialogContent className="rounded-2xl sm:max-w-sm">
						<DialogHeader>
							<DialogTitle>Umbenennen</DialogTitle>
						</DialogHeader>
						<Input
							value={renameFilename}
							onChange={(e) => setRenameFilename(e.target.value)}
							placeholder="Neuer Dateiname"
							className="rounded-lg"
							autoFocus
							onKeyDown={(e) => e.key === "Enter" && handleRename()}
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								onClick={closeRenameDialog}
								className="rounded-lg"
							>
								Abbrechen
							</Button>
							<Button
								type="button"
								onClick={handleRename}
								className="rounded-lg"
							>
								OK
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</TooltipProvider>
	);
}
