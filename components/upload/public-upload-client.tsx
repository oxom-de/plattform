"use client";

import Link from "next/link";
import { useState } from "react";
import FileUpload from "@/components/file-upload";

interface PublicUploadClientProps {
	creatorSlug: string;
	accessKey: string;
	expiresAt: number;
}

const SIGNED_UPLOAD_ALLOWED_VIDEO_TYPES = new Set([
	"video/mp4",
	"video/webm",
	"video/quicktime",
	"video/x-matroska",
	"video/x-msvideo",
	"video/x-m4v",
	"video/mpeg",
]);

function isSignedUploadMimeAllowed(fileType: string): boolean {
	const normalized = fileType.toLowerCase().trim();
	if (normalized.startsWith("image/")) return true;
	return SIGNED_UPLOAD_ALLOWED_VIDEO_TYPES.has(normalized);
}

export function PublicUploadClient({
	creatorSlug,
	accessKey,
	expiresAt,
}: PublicUploadClientProps) {
	const [uploadState, setUploadState] = useState<{
		key: string;
		url: string | null;
		filename: string;
		assetKind: "file" | "clip";
	} | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);

	return (
		<main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
			<div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8">
				<div className="mb-6 flex items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Freigegebener Upload-Link für{" "}
							<code className="rounded bg-muted/60 px-1 py-0.5 text-xs">
								{creatorSlug}
							</code>
							.
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Gültig bis {new Date(expiresAt).toLocaleString("de-DE")}.
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Erlaubt: Bilder + gängige Videoformate (z. B. MP4, MOV, WEBM).
						</p>
					</div>
					<Link
						href="/"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						Zur Startseite
					</Link>
				</div>

				<FileUpload
					creatorSlug={creatorSlug}
					visibility="private"
					assetKind="auto"
					uploadAccessKey={accessKey}
					validateFile={(file) =>
						isSignedUploadMimeAllowed(file.type)
							? null
							: {
									message:
										"Nur Bilder und gängige Videoformate sind erlaubt (MP4, MOV, WEBM, MKV, AVI, M4V, MPEG).",
									code: "UNSUPPORTED_PUBLIC_UPLOAD_TYPE",
								}
					}
					onUploadSuccess={(result) => {
						setUploadError(null);
						setUploadState({
							key: result.key,
							url: result.url,
							filename: result.filename,
							assetKind: result.assetKind,
						});
					}}
					onUploadError={(error) => {
						setUploadState(null);
						setUploadError(error.message);
					}}
				/>

				{uploadState ? (
					<div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
						<p className="text-sm font-medium text-emerald-200">
							Upload erfolgreich
						</p>
						<p className="mt-2 text-xs text-emerald-100/90">
							Datei: {uploadState.filename}
						</p>
						<p className="mt-1 text-xs text-emerald-100/90">
							Asset-Typ: {uploadState.assetKind}
						</p>
						<p className="mt-1 break-all text-xs text-emerald-100/90">
							Key: {uploadState.key}
						</p>
						{uploadState.url ? (
							<a
								href={uploadState.url}
								target="_blank"
								rel="noreferrer"
								className="mt-3 inline-block text-xs text-emerald-100 underline underline-offset-4"
							>
								Datei öffnen
							</a>
						) : null}
					</div>
				) : null}

				{uploadError ? (
					<div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
						<p className="text-sm font-medium text-red-200">
							Upload fehlgeschlagen
						</p>
						<p className="mt-1 text-xs text-red-100/90">{uploadError}</p>
					</div>
				) : null}
			</div>
		</main>
	);
}
