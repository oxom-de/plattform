"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { FileEditIcon } from "@hugeicons-pro/core-twotone-rounded";
import type React from "react";
import {
	type DragEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UploadIcon } from "./ui/upload";

type FileStatus = "idle" | "dragging" | "uploading" | "error" | "success";
type UploadAssetKind = "file" | "clip" | "auto";

interface FileError {
	message: string;
	code: string;
}

interface UploadResult {
	url: string | null;
	key: string;
	filename: string;
	size: number;
	type: string;
	assetKind: "file" | "clip";
}

interface FileUploadProps {
	onUploadSuccess?: (result: UploadResult) => void;
	onUploadError?: (error: FileError) => void;
	acceptedFileTypes?: string[];
	maxFileSize?: number;
	uploadFilename?: string | ((file: File) => string);
	renameWithDialog?: boolean;
	currentFile?: File | null;
	onFileRemove?: () => void;
	/** Deprecated: used by legacy simulated progress; kept for API compatibility */
	uploadDelay?: number;
	validateFile?: (file: File) => FileError | null;
	creatorSlug?: string;
	visibility?: "private" | "public";
	assetKind?: UploadAssetKind;
	uploadAccessKey?: string;
	className?: string;
}

const DEFAULT_MAX_FILE_SIZE = (() => {
	const raw = process.env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES;
	const parsed = Number(raw);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
})();
const FILE_SIZES = [
	"Bytes",
	"KB",
	"MB",
	"GB",
	"TB",
	"PB",
	"EB",
	"ZB",
	"YB",
] as const;
const LEGACY_DIRECT_UPLOAD_ENABLED =
	process.env.NEXT_PUBLIC_UPLOAD_DIRECT === "true";
const RAW_UPLOAD_MODE = (
	process.env.NEXT_PUBLIC_UPLOAD_MODE || ""
).toLowerCase();
const UPLOAD_MODE: "presigned" | "direct" | "auto" =
	RAW_UPLOAD_MODE === "direct" ||
	RAW_UPLOAD_MODE === "auto" ||
	RAW_UPLOAD_MODE === "presigned"
		? RAW_UPLOAD_MODE
		: LEGACY_DIRECT_UPLOAD_ENABLED
			? "direct"
			: "presigned";
const DIRECT_FALLBACK_ENABLED =
	process.env.NEXT_PUBLIC_UPLOAD_DIRECT_FALLBACK === "true" ||
	UPLOAD_MODE === "auto";
const DIRECT_FALLBACK_MAX_BYTES = Number(
	process.env.NEXT_PUBLIC_UPLOAD_DIRECT_FALLBACK_MAX_BYTES ||
		String(100 * 1024 * 1024),
);

const formatBytes = (bytes: number, decimals = 2): string => {
	if (!+bytes) return "0 Bytes";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const unit = FILE_SIZES[i] || FILE_SIZES[FILE_SIZES.length - 1];
	return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${unit}`;
};

export default function FileUpload({
	onUploadSuccess = () => {},
	onUploadError = () => {},
	acceptedFileTypes = [],
	maxFileSize = DEFAULT_MAX_FILE_SIZE,
	uploadFilename,
	renameWithDialog = true,
	currentFile: initialFile = null,
	onFileRemove = () => {},
	uploadDelay = 2000,
	validateFile = () => null,
	creatorSlug = "unknown",
	visibility = "private",
	assetKind = "auto",
	uploadAccessKey,
	className,
}: FileUploadProps) {
	const [file, setFile] = useState<File | null>(initialFile);
	const [status, setStatus] = useState<FileStatus>("idle");
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<FileError | null>(null);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [pendingFilename, setPendingFilename] = useState("");
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const xhrRef = useRef<XMLHttpRequest | null>(null);
	const requestAbortControllerRef = useRef<AbortController | null>(null);

	useEffect(() => {
		return () => {
			requestAbortControllerRef.current?.abort();
			requestAbortControllerRef.current = null;
			xhrRef.current?.abort();
			xhrRef.current = null;
		};
	}, []);

	const validateFileSize = useCallback(
		(file: File): FileError | null => {
			if (maxFileSize > 0 && file.size > maxFileSize) {
				return {
					message: `File size exceeds ${formatBytes(maxFileSize)}`,
					code: "FILE_TOO_LARGE",
				};
			}
			return null;
		},
		[maxFileSize],
	);

	const resolveUploadFilename = useCallback(
		(uploadingFile: File, overrideName?: string) => {
			const override =
				typeof overrideName === "string" ? overrideName.trim() : "";
			if (override) return override;
			const customName =
				typeof uploadFilename === "function"
					? uploadFilename(uploadingFile)
					: uploadFilename;
			const normalized =
				typeof customName === "string" ? customName.trim() : "";
			return normalized || uploadingFile.name;
		},
		[uploadFilename],
	);

	const resolveAssetKind = useCallback(
		(uploadingFile: File): "file" | "clip" => {
			if (assetKind === "file" || assetKind === "clip") return assetKind;
			const type = uploadingFile.type.toLowerCase();
			return type.startsWith("video/") ? "clip" : "file";
		},
		[assetKind],
	);

	const validateFileType = useCallback(
		(file: File): FileError | null => {
			if (!acceptedFileTypes?.length) return null;

			const fileType = file.type.toLowerCase();
			if (
				!acceptedFileTypes.some((type) => fileType.match(type.toLowerCase()))
			) {
				return {
					message: `File type must be ${acceptedFileTypes.join(", ")}`,
					code: "INVALID_FILE_TYPE",
				};
			}
			return null;
		},
		[acceptedFileTypes],
	);

	const handleError = useCallback(
		(error: FileError) => {
			setError(error);
			setStatus("error");
			onUploadError?.(error);

			setTimeout(() => {
				setError(null);
				setStatus("idle");
			}, 3000);
		},
		[onUploadError],
	);

	const uploadWithXhr = useCallback(
		(
			url: string,
			uploadingFile: File,
			options: {
				method: "PUT" | "POST";
				headers?: Record<string, string>;
			},
		) =>
			new Promise<{ status: number; responseText: string }>(
				(resolve, reject) => {
					const xhr = new XMLHttpRequest();
					xhrRef.current = xhr;

					xhr.open(options.method, url, true);
					if (options.headers) {
						Object.entries(options.headers).forEach(([key, value]) => {
							xhr.setRequestHeader(key, value);
						});
					}

					xhr.upload.onprogress = (event) => {
						if (!event.lengthComputable || !event.total) return;
						const next = Math.min(
							99,
							Math.max(1, Math.round((event.loaded / event.total) * 99)),
						);
						setProgress((prev) => (next > prev ? next : prev));
					};

					xhr.onload = () => {
						const status = xhr.status;
						const responseText = xhr.responseText || "";
						xhrRef.current = null;

						if (status >= 200 && status < 300) {
							resolve({ status, responseText });
							return;
						}

						reject(new Error(`Upload failed (${status})`));
					};

					xhr.onerror = () => {
						xhrRef.current = null;
						reject(new Error("Network request failed during upload"));
					};

					xhr.onabort = () => {
						xhrRef.current = null;
						reject(new Error("UPLOAD_ABORTED"));
					};

					xhr.send(uploadingFile);
				},
			),
		[],
	);

	const abortActiveUpload = useCallback(() => {
		requestAbortControllerRef.current?.abort();
		requestAbortControllerRef.current = null;
		xhrRef.current?.abort();
		xhrRef.current = null;
	}, []);

	const uploadToBlob = useCallback(
		async (uploadingFile: File, desiredName?: string) => {
			try {
				const desiredFilename = resolveUploadFilename(
					uploadingFile,
					desiredName,
				);
				const resolvedAssetKind = resolveAssetKind(uploadingFile);
				setProgress(1);

				const runDirectUpload = async () => {
					const directParams = new URLSearchParams({
						mode: "direct",
						filename: uploadingFile.name,
						desiredFilename,
						creatorSlug,
						visibility,
						assetKind: resolvedAssetKind,
					});
					if (uploadAccessKey?.trim()) {
						directParams.set("key", uploadAccessKey.trim());
					}
					const { responseText } = await uploadWithXhr(
						`/api/upload?${directParams.toString()}`,
						uploadingFile,
						{
							method: "POST",
							headers: {
								"Content-Type":
									uploadingFile.type || "application/octet-stream",
							},
						},
					);
					const directResult = JSON.parse(responseText || "{}");
					return {
						url: directResult?.publicUrl || null,
						key: directResult?.key || "",
						filename: desiredFilename,
						size: uploadingFile.size,
						type: uploadingFile.type,
						assetKind: directResult?.assetKind === "clip" ? "clip" : "file",
					} as UploadResult;
				};

				const runPresignedUpload = async () => {
					const controller = new AbortController();
					requestAbortControllerRef.current = controller;
					const presignResponse = await fetch("/api/upload", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						signal: controller.signal,
						body: JSON.stringify({
							filename: uploadingFile.name,
							desiredFilename,
							contentType: uploadingFile.type || "application/octet-stream",
							size: uploadingFile.size,
							creatorSlug,
							visibility,
							assetKind: resolvedAssetKind,
							...(uploadAccessKey?.trim()
								? { key: uploadAccessKey.trim() }
								: {}),
						}),
					});

					if (!presignResponse.ok) {
						const errorData = await presignResponse.json().catch(() => ({}));
						console.error("[upload] client:presign_failed", {
							status: presignResponse.status,
							errorData,
						});
						throw new Error(errorData.error || "Upload init failed");
					}

					requestAbortControllerRef.current = null;
					const presignResult = await presignResponse.json();
					const uploadUrl = presignResult?.uploadUrl as string | undefined;
					console.log("[upload] client:presign_ok", {
						key: presignResult?.key,
						uploadUrl,
					});
					if (!uploadUrl) {
						throw new Error("Missing upload URL");
					}

					await uploadWithXhr(uploadUrl, uploadingFile, {
						method: "PUT",
					});

					return {
						url: presignResult?.publicUrl || null,
						key: presignResult?.key || "",
						filename: desiredFilename,
						size: uploadingFile.size,
						type: uploadingFile.type,
						assetKind: presignResult?.assetKind === "clip" ? "clip" : "file",
					} as UploadResult;
				};

				console.log("[upload] client:start", {
					name: uploadingFile.name,
					desiredName: desiredFilename,
					size: uploadingFile.size,
					type: uploadingFile.type,
					creatorSlug,
					visibility,
					assetKind: resolvedAssetKind,
					uploadMode: UPLOAD_MODE,
					directFallback: DIRECT_FALLBACK_ENABLED,
				});
				let result: UploadResult;
				if (UPLOAD_MODE === "direct") {
					result = await runDirectUpload();
				} else {
					const allowDirectFallback =
						DIRECT_FALLBACK_ENABLED &&
						uploadingFile.size <= DIRECT_FALLBACK_MAX_BYTES;
					try {
						result = await runPresignedUpload();
					} catch (presignError) {
						if (!allowDirectFallback) {
							throw presignError;
						}
						console.warn(
							"[upload] client:presign_fallback_to_direct",
							presignError,
						);
						result = await runDirectUpload();
					}
				}

				setProgress(100);
				setStatus("success");

				// Show success state briefly before resetting
				setTimeout(() => {
					setProgress(0);
					setStatus("idle");
					setFile(null);
					onUploadSuccess?.(result);
				}, 1000);
			} catch (error) {
				if (
					error instanceof Error &&
					(error.message === "UPLOAD_ABORTED" || error.name === "AbortError")
				) {
					return;
				}
				console.error("[upload] client:error", error);
				const uploadError: FileError = {
					message: error instanceof Error ? error.message : "Upload failed",
					code: "UPLOAD_ERROR",
				};
				handleError(uploadError);
			} finally {
				requestAbortControllerRef.current = null;
				xhrRef.current = null;
			}
		},
		[
			onUploadSuccess,
			handleError,
			creatorSlug,
			visibility,
			resolveUploadFilename,
			resolveAssetKind,
			uploadWithXhr,
			uploadAccessKey,
		],
	);

	const startUploadFromSelection = useCallback(
		(selectedFile: File, desiredName?: string) => {
			setFile(selectedFile);
			setStatus("uploading");
			setProgress(0);
			uploadToBlob(selectedFile, desiredName);
		},
		[uploadToBlob],
	);

	const handleFileSelect = useCallback(
		(selectedFile: File | null) => {
			if (!selectedFile) return;

			// Reset error state
			setError(null);

			// Validate file
			const sizeError = validateFileSize(selectedFile);
			if (sizeError) {
				handleError(sizeError);
				return;
			}

			const typeError = validateFileType(selectedFile);
			if (typeError) {
				handleError(typeError);
				return;
			}

			const customError = validateFile?.(selectedFile);
			if (customError) {
				handleError(customError);
				return;
			}

			const resolvedFilename = resolveUploadFilename(selectedFile);
			if (renameWithDialog) {
				setPendingFile(selectedFile);
				setPendingFilename(resolvedFilename);
				setIsRenameDialogOpen(true);
				return;
			}

			startUploadFromSelection(selectedFile, resolvedFilename);
		},
		[
			validateFileSize,
			validateFileType,
			validateFile,
			handleError,
			resolveUploadFilename,
			renameWithDialog,
			startUploadFromSelection,
		],
	);

	const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setStatus((prev) => (prev !== "uploading" ? "dragging" : prev));
	}, []);

	const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setStatus((prev) => (prev === "dragging" ? "idle" : prev));
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			if (status === "uploading") return;
			setStatus("idle");
			const droppedFile = e.dataTransfer.files?.[0];
			if (droppedFile) handleFileSelect(droppedFile);
		},
		[status, handleFileSelect],
	);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selectedFile = e.target.files?.[0];
			handleFileSelect(selectedFile || null);
			if (e.target) e.target.value = "";
		},
		[handleFileSelect],
	);

	const triggerFileInput = useCallback(() => {
		if (status === "uploading") return;
		fileInputRef.current?.click();
	}, [status]);

	const resetState = useCallback(() => {
		abortActiveUpload();
		setFile(null);
		setStatus("idle");
		setProgress(0);
		setPendingFile(null);
		setPendingFilename("");
		setIsRenameDialogOpen(false);
		if (onFileRemove) onFileRemove();
	}, [onFileRemove, abortActiveUpload]);

	const handleRenameDialogOpenChange = useCallback((open: boolean) => {
		setIsRenameDialogOpen(open);
		if (!open) {
			setPendingFile(null);
			setPendingFilename("");
		}
	}, []);

	const handleRenameSubmit = useCallback(() => {
		if (!pendingFile) return;
		const filename = pendingFilename.trim() || pendingFile.name;
		setIsRenameDialogOpen(false);
		setPendingFile(null);
		setPendingFilename("");
		startUploadFromSelection(pendingFile, filename);
	}, [pendingFile, pendingFilename, startUploadFromSelection]);

	return (
		<div
			className={cn("relative w-full", className || "")}
			role="complementary"
			aria-label="File upload"
		>
			{/* Dropzone / Idle & Dragging – ohne Motion, damit Inhalt sofort sichtbar ist */}
			<div
				className={cn(
					"relative w-full rounded-lg border-2 border-dashed transition-colors min-h-[200px] flex flex-col items-center justify-center p-6",
					"border-muted-foreground/30 bg-muted/30",
					status === "dragging" && "border-primary/50 bg-primary/5",
					(status === "idle" || status === "dragging") && "cursor-pointer",
					error && "border-destructive/40",
				)}
				role={status === "idle" || status === "dragging" ? "button" : undefined}
				tabIndex={status === "idle" || status === "dragging" ? 0 : undefined}
				aria-label={
					status === "idle" || status === "dragging"
						? "Datei auswählen oder hier ablegen"
						: undefined
				}
				onDragOver={
					status === "idle" || status === "dragging"
						? handleDragOver
						: undefined
				}
				onDragLeave={
					status === "idle" || status === "dragging"
						? handleDragLeave
						: undefined
				}
				onDrop={
					status === "idle" || status === "dragging" ? handleDrop : undefined
				}
				onClick={
					status === "idle" || status === "dragging"
						? triggerFileInput
						: undefined
				}
				onKeyDown={
					status === "idle" || status === "dragging"
						? (e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									triggerFileInput();
								}
							}
						: undefined
				}
			>
				{(status === "idle" || status === "dragging") && (
					<>
						<div className="flex flex-col items-center gap-3 text-center max-w-sm">
							<div className="rounded-full border-2 border-dashed border-muted-foreground/40 bg-background/80 p-3">
								<UploadIcon size={28} className="text-muted-foreground" />
							</div>
							<div className="space-y-1">
								<p className="text-sm font-semibold text-foreground">
									Datei hierher ziehen oder klicken
								</p>
								<p className="text-xs text-muted-foreground">
									{acceptedFileTypes?.length
										? `${acceptedFileTypes
												.map((t) => t.split("/")[1])
												.join(", ")
												.toUpperCase()}`
										: "Beliebige Dateitypen"}
									{maxFileSize > 0 && ` · bis ${formatBytes(maxFileSize)}`}
								</p>
							</div>
							<Button
								type="button"
								variant="default"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									triggerFileInput();
								}}
								className="mt-1"
							>
								<UploadIcon size={16} className="mr-2" />
								Datei auswählen
							</Button>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							className="sr-only"
							onChange={handleFileInputChange}
							accept={acceptedFileTypes?.join(",")}
							aria-label="Datei auswählen"
						/>
					</>
				)}

				{status === "uploading" && file && (
					<div className="flex flex-col items-center gap-3 text-center max-w-sm w-full">
						<p className="text-sm font-semibold text-foreground truncate w-full">
							{file.name}
						</p>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<span>{formatBytes(file.size)}</span>
							<span className="font-medium text-primary">
								{progress === 100 ? "Fertig!" : "Wird hochgeladen…"}{" "}
								{Math.round(progress)}%
							</span>
						</div>
						<div className="w-full max-w-[240px] h-2 rounded-full bg-muted overflow-hidden">
							<div
								className="h-full bg-primary transition-all duration-200"
								style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
							/>
						</div>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onClick={resetState}
						>
							Abbrechen
						</Button>
					</div>
				)}

				{status === "success" && (
					<div className="flex flex-col items-center gap-3 text-center">
						<div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
							<HugeiconsIcon
								icon={FileEditIcon}
								size={32}
								className="h-8 w-8 text-green-600 dark:text-green-400"
							/>
						</div>
						<p className="text-sm font-semibold text-green-600 dark:text-green-400">
							Hochladen abgeschlossen
						</p>
						<p className="text-xs text-muted-foreground">
							Datei wurde erfolgreich hochgeladen.
						</p>
					</div>
				)}

				{error && (
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
						<p className="text-sm text-destructive">{error.message}</p>
					</div>
				)}
			</div>

			<Dialog
				open={isRenameDialogOpen}
				onOpenChange={handleRenameDialogOpenChange}
			>
				<DialogContent className="border-border bg-background text-foreground sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Dateiname anpassen</DialogTitle>
						<DialogDescription>
							Optional kannst du den Dateinamen vor dem Upload ändern.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<p className="text-xs text-muted-foreground">
							Original:{" "}
							<span className="font-medium text-foreground">
								{pendingFile?.name}
							</span>
						</p>
						<Input
							value={pendingFilename}
							onChange={(event) => setPendingFilename(event.target.value)}
							placeholder="Neuer Dateiname"
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleRenameDialogOpenChange(false)}
						>
							Abbrechen
						</Button>
						<Button type="button" onClick={handleRenameSubmit}>
							Upload starten
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

FileUpload.displayName = "FileUpload";
