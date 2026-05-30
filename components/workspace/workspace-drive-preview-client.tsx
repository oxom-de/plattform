"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowLeft01Icon,
	Download01Icon,
	File02Icon,
	Loading03Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AssetType = "image" | "video" | "audio" | "document" | "archive" | "other";

interface WorkspaceDrivePreviewClientProps {
	basePath: string;
	content: string;
}

function toWorkspacePath(basePath: string, path?: string): string {
	const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";
	if (!basePath) return normalizedPath || "/";
	return normalizedPath ? `${basePath}${normalizedPath}` : basePath;
}

const detectAssetType = (filename: string): AssetType => {
	const ext = filename.split(".").pop()?.toLowerCase() || "";
	if (
		["png", "jpg", "jpeg", "webp", "gif", "svg", "heic", "avif"].includes(ext)
	)
		return "image";
	if (["mp4", "mov", "mkv", "webm", "avi", "m4v"].includes(ext)) return "video";
	if (["mp3", "wav", "aac", "m4a", "flac", "ogg"].includes(ext)) return "audio";
	if (
		[
			"pdf",
			"doc",
			"docx",
			"txt",
			"md",
			"rtf",
			"ppt",
			"pptx",
			"xls",
			"xlsx",
		].includes(ext)
	)
		return "document";
	if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
	return "other";
};

const getDisplayName = (key: string) => {
	const filename = key.split("/").pop() || key;
	const match = filename.match(
		/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9-]{12,}Z-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i,
	);
	return match?.[1] || filename;
};

const decodeContentKey = (content: string) => {
	try {
		return decodeURIComponent(content);
	} catch {
		return content;
	}
};

export function WorkspaceDrivePreviewClient({
	basePath,
	content,
}: WorkspaceDrivePreviewClientProps) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [downloading, setDownloading] = useState(false);

	const key = useMemo(() => decodeContentKey(content), [content]);
	const displayName = useMemo(() => getDisplayName(key), [key]);
	const type = useMemo(() => detectAssetType(displayName), [displayName]);

	useEffect(() => {
		let active = true;
		const loadPreviewUrl = async () => {
			try {
				setLoading(true);
				setError(null);
				const response = await fetch("/api/download", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ key, mode: "view" }),
				});

				if (!response.ok) {
					const data = await response.json().catch(() => ({}));
					throw new Error(
						data?.details ||
							data?.error ||
							"Vorschau konnte nicht geladen werden",
					);
				}

				const data = await response.json();
				if (!active) return;
				setPreviewUrl(data?.downloadUrl || null);
			} catch (loadError: any) {
				if (!active) return;
				setError(loadError?.message || "Vorschau konnte nicht geladen werden");
			} finally {
				if (!active) return;
				setLoading(false);
			}
		};

		loadPreviewUrl();

		return () => {
			active = false;
		};
	}, [key]);

	const handleDownload = useCallback(async () => {
		try {
			setDownloading(true);
			const response = await fetch("/api/download", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ key, mode: "download" }),
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(
					data?.details ||
						data?.error ||
						"Download konnte nicht gestartet werden",
				);
			}

			const data = await response.json();
			const url = data?.downloadUrl as string | undefined;
			if (!url) {
				throw new Error("Download-Link fehlt");
			}

			const link = document.createElement("a");
			link.href = url;
			link.download = displayName;
			link.rel = "noopener noreferrer";
			link.style.display = "none";
			document.body.appendChild(link);
			link.click();
			link.remove();
		} catch (downloadError: any) {
			setError(
				downloadError?.message || "Download konnte nicht gestartet werden",
			);
		} finally {
			setDownloading(false);
		}
	}, [key, displayName]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Button asChild variant="outline" size="sm">
					<Link href={toWorkspacePath(basePath, "drive")}>
						<HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
						Zurück zum Drive
					</Link>
				</Button>
				<Button size="sm" onClick={handleDownload} disabled={downloading}>
					{downloading ? (
						<HugeiconsIcon
							icon={Loading03Icon}
							size={16}
							className="animate-spin"
						/>
					) : (
						<HugeiconsIcon icon={Download01Icon} size={16} />
					)}
					Herunterladen
				</Button>
			</div>

			<Card className="border-border/70 bg-card/40">
				<CardHeader className="space-y-2 pb-3">
					<div className="flex items-center gap-2">
						<CardTitle className="truncate text-lg">{displayName}</CardTitle>
						<Badge variant="secondary">{type}</Badge>
					</div>
					<p className="truncate text-xs text-muted-foreground">{key}</p>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
							<HugeiconsIcon
								icon={Loading03Icon}
								size={16}
								className="mr-2 animate-spin"
							/>
							Vorschau wird geladen...
						</div>
					) : error ? (
						<div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					) : previewUrl ? (
						<div className="overflow-hidden rounded-md border border-border/70 bg-black/30 p-2">
							{type === "image" ? (
								<img
									src={previewUrl}
									alt={displayName}
									className="mx-auto max-h-[68vh] w-auto rounded-md"
								/>
							) : type === "video" ? (
								<video
									src={previewUrl}
									controls
									className="mx-auto max-h-[68vh] w-full rounded-md"
								/>
							) : type === "audio" ? (
								<audio src={previewUrl} controls className="w-full" />
							) : (
								<div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-4 text-center text-sm text-muted-foreground">
									<HugeiconsIcon icon={File02Icon} size={32} />
									<p>Für diesen Dateityp gibt es keine Inline-Vorschau.</p>
									<a
										href={previewUrl}
										target="_blank"
										rel="noreferrer"
										className="rounded-md border px-3 py-1.5 text-xs text-foreground hover:bg-accent"
									>
										Datei im neuen Tab öffnen
									</a>
								</div>
							)}
						</div>
					) : (
						<div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
							Vorschau-Link fehlt.
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
