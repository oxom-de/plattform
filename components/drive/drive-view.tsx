"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowRight01Icon,
	Download01Icon,
	File01Icon,
	File02Icon,
	FileZipIcon,
	FolderOpenIcon,
	Image01Icon,
	Loading03Icon,
	MusicNote01Icon,
	Search01Icon,
	Video01Icon,
	ViewIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import {
	CloudUploadIcon,
	DriveIcon,
	GroupLayersIcon,
	ShieldCheck,
	UserGroupIcon,
	ZapIcon,
} from "@hugeicons-pro/core-twotone-rounded";
import Link from "next/link";
import * as React from "react";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import {
	type AssetType,
	detectAssetType,
	formatBytes as formatBytesUtil,
	getDisplayName,
} from "@/components/assets/utils";
import FileUpload from "@/components/file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";

interface R2File {
	key: string;
	size: number;
	lastModified: string | null;
}

type UploadLinkHistoryEntry = {
	fingerprint: string;
	keyLabel: string;
	creatorSlug: string;
	createdAt: number;
	expiresAt: number;
	status: "active" | "used" | "revoked" | "expired";
};

const WORKSPACE_STORAGE_LIMIT_BYTES = 1_000_000_000_000; // 1 TB per Workspace

const DRIVE_CAPS = [
	{ icon: GroupLayersIcon, label: "Assets & Versioning" },
	{ icon: UserGroupIcon, label: "Team-Zugriff" },
	{ icon: ShieldCheck, label: "Verschlüsselt" },
	{ icon: ZapIcon, label: "Schneller Upload" },
] as const;

function formatStorageBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1000 && unitIndex < units.length - 1) {
		size /= 1000;
		unitIndex += 1;
	}
	return `${size.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function getFileIcon(type: AssetType | "folder") {
	if (type === "folder") return FolderOpenIcon;
	switch (type) {
		case "image":
			return Image01Icon;
		case "video":
			return Video01Icon;
		case "audio":
			return MusicNote01Icon;
		case "document":
			return File01Icon;
		case "archive":
			return FileZipIcon;
		default:
			return File02Icon;
	}
}

function formatModified(iso: string | null): string {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 1) return "Gerade eben";
	if (diffMin < 60) return `Vor ${diffMin} Min.`;
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `Vor ${diffHours} Std.`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `Vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
	return date.toLocaleDateString("de-DE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatDateTime(value: number): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getUploadLinkStatusLabel(status: UploadLinkHistoryEntry["status"]) {
	switch (status) {
		case "active":
			return "Aktiv";
		case "used":
			return "Verwendet";
		case "revoked":
			return "Widerrufen";
		default:
			return "Abgelaufen";
	}
}

function getUploadLinkStatusClassName(
	status: UploadLinkHistoryEntry["status"],
) {
	switch (status) {
		case "active":
			return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
		case "used":
			return "border-blue-500/30 bg-blue-500/10 text-blue-700";
		case "revoked":
			return "border-amber-500/30 bg-amber-500/10 text-amber-700";
		default:
			return "border-border bg-muted text-muted-foreground";
	}
}

export function DriveView() {
	const { workspace, basePath } = useWorkspaceContext();
	const [files, setFiles] = React.useState<R2File[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [search, setSearch] = React.useState("");
	const [actionLoadingKey, setActionLoadingKey] = React.useState<string | null>(
		null,
	);
	const [refreshToken, setRefreshToken] = React.useState(0);
	const [uploadOpen, setUploadOpen] = React.useState(false);
	const [uploadLinkOpen, setUploadLinkOpen] = React.useState(false);
	const [uploadLinkLoading, setUploadLinkLoading] = React.useState(false);
	const [uploadLinkRevoking, setUploadLinkRevoking] = React.useState(false);
	const [uploadLinkError, setUploadLinkError] = React.useState<string | null>(
		null,
	);
	const [uploadLinkHistoryLoading, setUploadLinkHistoryLoading] =
		React.useState(false);
	const [uploadLinkHistoryError, setUploadLinkHistoryError] = React.useState<
		string | null
	>(null);
	const [uploadLinkHistory, setUploadLinkHistory] = React.useState<
		UploadLinkHistoryEntry[]
	>([]);
	const [uploadLinkCopyState, setUploadLinkCopyState] = React.useState<
		"idle" | "copied" | "error"
	>("idle");
	const [uploadLink, setUploadLink] = React.useState<{
		key: string;
		url: string;
		expiresAt: string;
	} | null>(null);

	const loadFiles = React.useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch(
				`/api/files?creatorSlug=${encodeURIComponent(workspace.slug)}&limit=100`,
			);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					data?.details ||
						data?.error ||
						"Dateiliste konnte nicht geladen werden",
				);
			}
			const data = await res.json();
			setFiles(Array.isArray(data?.files) ? data.files : []);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Fehler beim Laden");
		} finally {
			setLoading(false);
		}
	}, [workspace.slug]);

	React.useEffect(() => {
		loadFiles();
	}, [loadFiles, refreshToken]);

	const loadUploadLinkHistory = React.useCallback(async () => {
		try {
			setUploadLinkHistoryLoading(true);
			setUploadLinkHistoryError(null);
			const res = await fetch(
				`/api/upload/link?creatorSlug=${encodeURIComponent(workspace.slug)}&limit=12`,
			);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					data?.details ||
						data?.error ||
						"Upload-Link Verlauf konnte nicht geladen werden",
				);
			}
			const data = await res.json().catch(() => ({}));
			const entries = Array.isArray(data?.links)
				? data.links
						.map((entry) => {
							if (!entry || typeof entry !== "object") return null;
							const candidate = entry as Partial<UploadLinkHistoryEntry>;
							if (
								typeof candidate.fingerprint !== "string" ||
								typeof candidate.keyLabel !== "string" ||
								typeof candidate.creatorSlug !== "string" ||
								typeof candidate.createdAt !== "number" ||
								typeof candidate.expiresAt !== "number" ||
								(candidate.status !== "active" &&
									candidate.status !== "used" &&
									candidate.status !== "revoked" &&
									candidate.status !== "expired")
							) {
								return null;
							}
							return candidate as UploadLinkHistoryEntry;
						})
						.filter((entry): entry is UploadLinkHistoryEntry => Boolean(entry))
				: [];
			setUploadLinkHistory(entries);
		} catch (e) {
			setUploadLinkHistoryError(
				e instanceof Error
					? e.message
					: "Upload-Link Verlauf konnte nicht geladen werden",
			);
		} finally {
			setUploadLinkHistoryLoading(false);
		}
	}, [workspace.slug]);

	React.useEffect(() => {
		loadUploadLinkHistory();
	}, [loadUploadLinkHistory]);

	const filteredFiles = React.useMemo(() => {
		if (!search.trim()) return files;
		const q = search.trim().toLowerCase();
		return files.filter((f) => {
			const name = getDisplayName(f.key).toLowerCase();
			return name.includes(q) || f.key.toLowerCase().includes(q);
		});
	}, [files, search]);

	const totalUsedBytes = React.useMemo(
		() => files.reduce((sum, file) => sum + file.size, 0),
		[files],
	);
	const availableBytes = React.useMemo(
		() => Math.max(0, WORKSPACE_STORAGE_LIMIT_BYTES - totalUsedBytes),
		[totalUsedBytes],
	);
	const uploadLinkCounts = React.useMemo(() => {
		return uploadLinkHistory.reduce(
			(acc, entry) => {
				acc[entry.status] += 1;
				return acc;
			},
			{ active: 0, used: 0, revoked: 0, expired: 0 },
		);
	}, [uploadLinkHistory]);

	const getDownloadUrl = React.useCallback(
		async (key: string, mode: "view" | "download") => {
			const res = await fetch("/api/download", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key, mode }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					data?.details || data?.error || "Link konnte nicht erstellt werden",
				);
			}
			const data = await res.json();
			if (!data?.downloadUrl) throw new Error("Link fehlt");
			return data.downloadUrl as string;
		},
		[],
	);

	const handleDownload = React.useCallback(
		async (key: string, displayName: string) => {
			try {
				setActionLoadingKey(key);
				const url = await getDownloadUrl(key, "download");
				const a = document.createElement("a");
				a.href = url;
				a.download = displayName;
				a.rel = "noopener noreferrer";
				a.style.display = "none";
				document.body.appendChild(a);
				a.click();
				a.remove();
			} catch (e) {
				setError(e instanceof Error ? e.message : "Download fehlgeschlagen");
			} finally {
				setActionLoadingKey(null);
			}
		},
		[getDownloadUrl],
	);

	const handleGenerateUploadLink = React.useCallback(async () => {
		try {
			setUploadLinkLoading(true);
			setUploadLinkError(null);
			setUploadLinkCopyState("idle");
			const res = await fetch("/api/upload/link", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ creatorSlug: workspace.slug }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					data?.details ||
						data?.error ||
						"Upload-Link konnte nicht erzeugt werden",
				);
			}
			const data = await res.json();
			if (
				typeof data?.key !== "string" ||
				typeof data?.url !== "string" ||
				typeof data?.expiresAt !== "string"
			) {
				throw new Error("Ungültige API-Antwort für Upload-Link");
			}
			setUploadLink({
				key: data.key,
				url: data.url,
				expiresAt: data.expiresAt,
			});
			setUploadLinkOpen(true);
			loadUploadLinkHistory();
		} catch (e) {
			setUploadLinkError(
				e instanceof Error
					? e.message
					: "Upload-Link konnte nicht erzeugt werden",
			);
		} finally {
			setUploadLinkLoading(false);
		}
	}, [loadUploadLinkHistory, workspace.slug]);

	const handleCopyUploadLink = React.useCallback(async () => {
		if (!uploadLink?.url) return;
		try {
			await navigator.clipboard.writeText(uploadLink.url);
			setUploadLinkCopyState("copied");
			window.setTimeout(() => setUploadLinkCopyState("idle"), 1800);
		} catch {
			setUploadLinkCopyState("error");
		}
	}, [uploadLink]);

	const handleRevokeUploadLink = React.useCallback(async () => {
		if (!uploadLink) return;
		try {
			setUploadLinkRevoking(true);
			setUploadLinkError(null);
			const res = await fetch("/api/upload/link/revoke", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					creatorSlug: workspace.slug,
					key: uploadLink.key,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					data?.details ||
						data?.error ||
						"Upload-Link konnte nicht widerrufen werden",
				);
			}

			setUploadLinkOpen(false);
			setUploadLink(null);
			loadUploadLinkHistory();
		} catch (e) {
			setUploadLinkError(
				e instanceof Error
					? e.message
					: "Upload-Link konnte nicht widerrufen werden",
			);
		} finally {
			setUploadLinkRevoking(false);
		}
	}, [loadUploadLinkHistory, uploadLink, workspace.slug]);

	const drivePath = basePath ? `${basePath}/drive` : `/${workspace.slug}/drive`;

	return (
		<div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-8 md:py-24">
			<section className="space-y-5">
				<Badge
					variant="outline"
					className="rounded-md border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
				>
					Drive
				</Badge>

				<p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
					Workspace:{" "}
					<code className="text-foreground/80">{workspace.slug}</code>
				</p>

				<h1 className="flex items-center gap-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
					<HugeiconsIcon
						icon={DriveIcon}
						size={28}
						className="size-7 shrink-0 text-muted-foreground"
					/>
					{workspace.name} Drive
				</h1>

				<p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
					Operational Layer für Creator und Cutter. Assets und Versionsstand im
					Workspace, Review/Ready/Published als Signale, Rückfragen direkt am
					Asset, Briefing und Zielzustand für den Schnittfluss.
				</p>

				<div className="flex flex-wrap gap-1.5 pt-1">
					{DRIVE_CAPS.map(({ icon: Icon, label }) => (
						<span
							key={label}
							className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
						>
							<HugeiconsIcon icon={Icon} size={12} className="shrink-0" />
							{label}
						</span>
					))}
				</div>
			</section>

			<section className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<nav className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
						<Link
							href={drivePath}
							className="transition-colors hover:text-foreground"
						>
							Drive
						</Link>
						<HugeiconsIcon
							icon={ArrowRight01Icon}
							size={12}
							className="size-3"
						/>
						<span className="text-foreground">Assets</span>
					</nav>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative">
						<HugeiconsIcon
							icon={Search01Icon}
							size={14}
							className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
						/>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Suchen..."
							className="h-8 w-40 rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-52"
						/>
					</div>


					<Button
						variant="outline"
						size="sm"
						className="rounded-md"
						onClick={handleGenerateUploadLink}
						disabled={uploadLinkLoading}
					>
						{uploadLinkLoading ? (
							<HugeiconsIcon
								icon={Loading03Icon}
								size={14}
								className="mr-1.5 animate-spin"
							/>
						) : (
							<HugeiconsIcon
								icon={ArrowRight01Icon}
								size={14}
								className="mr-1.5"
							/>
						)}
						Upload-Link
					</Button>

					<Button
						size="sm"
						className="rounded-md"
						onClick={() => setUploadOpen(true)}
					>
						<HugeiconsIcon
							icon={CloudUploadIcon}
							size={14}
							className="mr-1.5"
						/>
						Upload
					</Button>
				</div>
			</section>

			{uploadLinkError ? (
				<div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
					{uploadLinkError}
				</div>
			) : null}

			<section className="mt-4 rounded-lg border border-border bg-background/70 p-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h2 className="text-sm font-semibold text-foreground">
							Upload-Link Verlauf
						</h2>
						<p className="text-xs text-muted-foreground">
							Übersicht über aktive, verwendete und widerrufene Public
							Upload-Links.
						</p>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700">
							Aktiv {uploadLinkCounts.active}
						</span>
						<span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-700">
							Verwendet {uploadLinkCounts.used}
						</span>
						<span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700">
							Widerrufen {uploadLinkCounts.revoked}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							className="rounded-md"
							onClick={loadUploadLinkHistory}
							disabled={uploadLinkHistoryLoading}
						>
							{uploadLinkHistoryLoading ? "Lädt..." : "Aktualisieren"}
						</Button>
					</div>
				</div>

				{uploadLinkHistoryError ? (
					<div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
						{uploadLinkHistoryError}
					</div>
				) : null}

				<div className="mt-3 overflow-x-auto">
					<table className="w-full min-w-[560px] border-collapse text-xs">
						<thead>
							<tr className="border-b border-border text-left font-mono uppercase tracking-[0.16em] text-muted-foreground">
								<th className="px-2 py-2 font-medium">Key</th>
								<th className="px-2 py-2 font-medium">Status</th>
								<th className="px-2 py-2 font-medium">Erstellt</th>
								<th className="px-2 py-2 font-medium">Läuft ab</th>
							</tr>
						</thead>
						<tbody>
							{uploadLinkHistory.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className="px-2 py-6 text-center text-muted-foreground"
									>
										Noch keine Upload-Links erzeugt.
									</td>
								</tr>
							) : (
								uploadLinkHistory.map((entry) => (
									<tr
										key={entry.fingerprint}
										className="border-b border-border/60 last:border-b-0"
									>
										<td className="px-2 py-2">
											<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
												{entry.keyLabel}
											</code>
										</td>
										<td className="px-2 py-2">
											<span
												className={`rounded-md border px-2 py-0.5 text-[11px] ${getUploadLinkStatusClassName(entry.status)}`}
											>
												{getUploadLinkStatusLabel(entry.status)}
											</span>
										</td>
										<td className="px-2 py-2 text-muted-foreground">
											{formatDateTime(entry.createdAt)}
										</td>
										<td className="px-2 py-2 text-muted-foreground">
											{formatDateTime(entry.expiresAt)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</section>

			<Dialog open={uploadLinkOpen} onOpenChange={setUploadLinkOpen}>
				<DialogContent className="rounded-2xl sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Public Upload-Link</DialogTitle>
					</DialogHeader>

					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Link für{" "}
							<code className="rounded bg-muted px-1 py-0.5 text-xs">
								{workspace.slug}
							</code>
							. Gültig bis{" "}
							{uploadLink?.expiresAt
								? new Date(uploadLink.expiresAt).toLocaleString("de-DE")
								: "—"}
							.
						</p>
						<Input
							readOnly
							value={uploadLink?.url || ""}
							className="h-10 rounded-md font-mono text-xs"
						/>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								className="rounded-md"
								onClick={handleCopyUploadLink}
							>
								Link kopieren
							</Button>
							{uploadLink?.url ? (
								<Button
									type="button"
									variant="ghost"
									className="rounded-md"
									asChild
								>
									<a href={uploadLink.url} target="_blank" rel="noreferrer">
										Öffnen
									</a>
								</Button>
							) : null}
							<Button
								type="button"
								variant="destructive"
								className="rounded-md"
								onClick={handleRevokeUploadLink}
								disabled={!uploadLink || uploadLinkRevoking}
							>
								{uploadLinkRevoking ? "Widerrufe..." : "Link widerrufen"}
							</Button>
							{uploadLinkCopyState === "copied" ? (
								<span className="text-xs text-emerald-600">Kopiert</span>
							) : null}
							{uploadLinkCopyState === "error" ? (
								<span className="text-xs text-destructive">
									Kopieren fehlgeschlagen
								</span>
							) : null}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
				<DialogContent className="rounded-2xl sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Datei hochladen</DialogTitle>
					</DialogHeader>
					<FileUpload
						creatorSlug={workspace.slug}
						visibility="private"
						assetKind="file"
						onUploadSuccess={() => {
							setRefreshToken((r) => r + 1);
							setUploadOpen(false);
						}}
						className="min-w-0"
					/>
				</DialogContent>
			</Dialog>

			{error && (
				<div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			)}

			<section className="mt-6">
				{loading ? (
					<div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 py-16 text-sm text-muted-foreground">
						<HugeiconsIcon
							icon={Loading03Icon}
							size={18}
							className="animate-spin"
						/>
						Dateien werden geladen…
					</div>
				) : (
					<div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 md:grid-cols-4">
						{filteredFiles.length === 0 ? (
							<div className="col-span-full py-12 text-center text-sm text-muted-foreground">
								{search.trim() ? "Keine Treffer." : "Keine Dateien."}
							</div>
						) : (
							filteredFiles.map((file) => {
								const displayName = getDisplayName(file.key);
								const type = detectAssetType(displayName);
								const Icon = getFileIcon(type);
								const previewHref = `${drivePath}/${file.key.split("/").map(encodeURIComponent).join("/")}`;

								return (
									<Link
										key={file.key}
										href={previewHref}
										className="group flex flex-col bg-background p-4 transition-colors hover:bg-muted/30"
									>
										<div className="flex aspect-square items-center justify-center rounded-md border border-border bg-muted/40">
											<HugeiconsIcon
												icon={Icon}
												size={32}
												className="text-muted-foreground transition-colors group-hover:text-foreground"
											/>
										</div>
										<div className="mt-3 min-w-0 space-y-1">
											<p className="truncate text-xs font-medium text-foreground" title={displayName}>
												{displayName}
											</p>
											<p className="text-[11px] text-muted-foreground">
												{formatBytesUtil(file.size)} ·{" "}
												{formatModified(file.lastModified)}
											</p>
										</div>
									</Link>
								);
							})
						)}
					</div>
				)}
			</section>

			{!loading && (
				<section className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
					<div className="flex flex-col items-center gap-1 bg-background py-6 text-center">
						<p className="text-2xl font-semibold tracking-tight text-foreground">
							{files.length}
						</p>
						<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							Dateien
						</p>
					</div>
					<div className="flex flex-col items-center gap-1 bg-background py-6 text-center">
						<p className="text-2xl font-semibold tracking-tight text-foreground">
							{formatStorageBytes(totalUsedBytes)}
						</p>
						<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							Belegt
						</p>
					</div>
					<div className="flex flex-col items-center gap-1 bg-background py-6 text-center">
						<p className="text-2xl font-semibold tracking-tight text-foreground">
							—
						</p>
						<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							Team-Mitglieder
						</p>
					</div>
					<div className="flex flex-col items-center gap-1 bg-background py-6 text-center">
						<p className="text-2xl font-semibold tracking-tight text-foreground">
							{formatStorageBytes(availableBytes)}
						</p>
						<p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							Verfügbar
						</p>
					</div>
				</section>
			)}
		</div>
	);
}
