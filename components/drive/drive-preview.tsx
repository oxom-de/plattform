"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowLeft01Icon,
	Delete02Icon,
	Download01Icon,
	File01Icon,
	File02Icon,
	FolderOpenIcon,
	Image01Icon,
	Link01Icon,
	Loading03Icon,
	MoreVerticalIcon,
	MusicNote01Icon,
	Share01Icon,
	Tick01Icon,
	Video01Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import Link from "next/link";
import * as React from "react";
import { detectAssetType, getDisplayName } from "@/components/assets/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceContext } from "@/components/workspace/workspace-context";

interface DrivePreviewProps {
	contentKey: string;
}

export function DrivePreview({ contentKey }: DrivePreviewProps) {
	const { basePath, workspace } = useWorkspaceContext();
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [menuOpen, setMenuOpen] = React.useState(false);
	const [downloading, setDownloading] = React.useState(false);
	const [sharing, setSharing] = React.useState(false);
	const [shareState, setShareState] = React.useState<"idle" | "copied" | "error">("idle");

	const displayName = React.useMemo(
		() => getDisplayName(contentKey),
		[contentKey],
	);
	const type = React.useMemo(() => detectAssetType(displayName), [displayName]);
	const isPdf = React.useMemo(
		() => displayName.toLowerCase().endsWith(".pdf"),
		[displayName],
	);
	const drivePath = basePath ? `${basePath}/drive` : `/${workspace.slug}/drive`;

	React.useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError(null);
				const res = await fetch("/api/download", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ key: contentKey, mode: "view" }),
				});
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					throw new Error(
						data?.details ||
							data?.error ||
							"Vorschau konnte nicht geladen werden",
					);
				}
				const data = await res.json();
				if (!cancelled && data?.downloadUrl) setPreviewUrl(data.downloadUrl);
			} catch (e) {
				if (!cancelled)
					setError(e instanceof Error ? e.message : "Vorschau fehlgeschlagen");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [contentKey]);

	const handleDownload = React.useCallback(async () => {
		try {
			setDownloading(true);
			const res = await fetch("/api/download", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key: contentKey, mode: "download" }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(
					data?.details || data?.error || "Download fehlgeschlagen",
				);
			}
			const data = await res.json();
			const url = data?.downloadUrl;
			if (!url) throw new Error("Download-Link fehlt");
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
			setDownloading(false);
		}
	}, [contentKey, displayName]);

	const handleShare = React.useCallback(async () => {
		try {
			setSharing(true);
			setShareState("idle");
			const res = await fetch("/api/files/share", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					key: contentKey,
					creatorSlug: workspace.slug,
					expiry: "7d",
				}),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error || "Teilen fehlgeschlagen");
			}
			const { url } = await res.json();
			await navigator.clipboard.writeText(url);
			setShareState("copied");
			setTimeout(() => setShareState("idle"), 2500);
		} catch {
			setShareState("error");
			setTimeout(() => setShareState("idle"), 2500);
		} finally {
			setSharing(false);
		}
	}, [contentKey, workspace.slug]);

	const typeLabel =
		type === "image"
			? "Bild"
			: type === "video"
				? "Video"
				: type === "audio"
					? "Audio"
					: type === "document"
						? "Dokument"
						: type === "archive"
							? "Archiv"
							: "Datei";

	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-16 md:px-8 md:py-24">
			<section className="space-y-5">
				<Badge
					variant="outline"
					className="rounded-md border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
				>
					Drive · Vorschau
				</Badge>

				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<Button
						asChild
						variant="outline"
						size="sm"
						className="w-fit rounded-md"
					>
						<Link href={drivePath}>
							<HugeiconsIcon
								icon={ArrowLeft01Icon}
								size={14}
								className="mr-1.5"
							/>
							Zurück zum Drive
						</Link>
					</Button>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							className="rounded-md"
							onClick={handleShare}
							disabled={sharing}
						>
							{sharing ? (
								<HugeiconsIcon icon={Loading03Icon} size={14} className="mr-1.5 animate-spin" />
							) : shareState === "copied" ? (
								<HugeiconsIcon icon={Tick01Icon} size={14} className="mr-1.5 text-emerald-500" />
							) : (
								<HugeiconsIcon icon={Share01Icon} size={14} className="mr-1.5" />
							)}
							{shareState === "copied" ? "Kopiert!" : shareState === "error" ? "Fehler" : "Teilen"}
						</Button>
						<Button
							size="sm"
							className="rounded-md"
							onClick={handleDownload}
							disabled={downloading}
						>
							{downloading ? (
								<HugeiconsIcon
									icon={Loading03Icon}
									size={14}
									className="mr-1.5 animate-spin"
								/>
							) : (
								<HugeiconsIcon
									icon={Download01Icon}
									size={14}
									className="mr-1.5"
								/>
							)}
							Herunterladen
						</Button>
						<div className="relative">
							<button
								onClick={() => setMenuOpen(!menuOpen)}
								className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								aria-label="Weitere Aktionen"
							>
								<HugeiconsIcon icon={MoreVerticalIcon} size={16} />
							</button>
							{menuOpen && (
								<div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
									<a
										href={previewUrl ?? "#"}
										target="_blank"
										rel="noreferrer"
										className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-muted"
										onClick={() => setMenuOpen(false)}
									>
										<HugeiconsIcon icon={Link01Icon} size={14} />
										Im neuen Tab öffnen
									</a>
									<div className="border-t border-border" />
									<button
										className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
										onClick={() => setMenuOpen(false)}
									>
										<HugeiconsIcon icon={Delete02Icon} size={14} />
										Löschen
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</section>

			{error && (
				<div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			)}

			<section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
				<div className="overflow-hidden rounded-lg border border-border">
					<div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
						<div className="flex items-center gap-2.5">
							<HugeiconsIcon
								icon={
									type === "image"
										? Image01Icon
										: type === "video"
											? Video01Icon
											: type === "audio"
												? MusicNote01Icon
												: File01Icon
								}
								size={16}
								className="text-muted-foreground"
							/>
							<span className="text-sm font-medium text-foreground">
								{displayName}
							</span>
							<Badge variant="secondary" className="text-[10px] uppercase">
								{typeLabel}
							</Badge>
						</div>
					</div>

					<div className={`${isPdf ? "min-h-[80vh]" : "aspect-video"} flex items-center justify-center bg-muted/20`}>
						{loading ? (
							<div className="flex flex-col items-center gap-3 text-center">
								<HugeiconsIcon
									icon={Loading03Icon}
									size={32}
									className="animate-spin text-muted-foreground"
								/>
								<p className="text-sm text-muted-foreground">
									Vorschau wird geladen…
								</p>
							</div>
						) : error ? (
							<div className="px-4 py-8 text-center text-sm text-destructive">
								{error}
							</div>
						) : previewUrl ? (
							type === "image" ? (
								<img
									src={previewUrl}
									alt={displayName}
									className="max-h-[70vh] w-auto object-contain"
								/>
							) : type === "video" ? (
								<video
									src={previewUrl}
									controls
									className="max-h-[70vh] w-full object-contain"
								/>
							) : type === "audio" ? (
								<audio src={previewUrl} controls className="w-full max-w-md" />
							) : isPdf ? (
								<iframe
									src={`${previewUrl}#toolbar=1&navpanes=0`}
									className="h-full min-h-[80vh] w-full"
									title={displayName}
								/>
							) : (
								<div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-4 text-center text-sm text-muted-foreground">
									<HugeiconsIcon icon={File02Icon} size={32} />
									<p>Keine Inline-Vorschau für diesen Dateityp.</p>
									<a
										href={previewUrl}
										target="_blank"
										rel="noreferrer"
										className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
									>
										Im neuen Tab öffnen
									</a>
								</div>
							)
						) : (
							<div className="text-sm text-muted-foreground">
								Keine Vorschau verfügbar.
							</div>
						)}
					</div>
				</div>

				<div className="space-y-4">
					<div className="overflow-hidden rounded-lg border border-border">
						<div className="border-b border-border bg-muted/30 px-4 py-2.5">
							<p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
								Details
							</p>
						</div>
						<div className="divide-y divide-border/60">
							<div className="flex items-start gap-3 px-4 py-3">
								<HugeiconsIcon
									icon={File01Icon}
									size={14}
									className="mt-0.5 shrink-0 text-muted-foreground"
								/>
								<div className="min-w-0">
									<p className="text-[11px] text-muted-foreground">Typ</p>
									<p className="truncate text-xs font-medium text-foreground">
										{typeLabel}
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3 px-4 py-3">
								<HugeiconsIcon
									icon={FolderOpenIcon}
									size={14}
									className="mt-0.5 shrink-0 text-muted-foreground"
								/>
								<div className="min-w-0">
									<p className="text-[11px] text-muted-foreground">Pfad</p>
									<p className="truncate break-all text-xs font-medium text-foreground">
										{contentKey}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
