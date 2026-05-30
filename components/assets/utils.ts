export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return "—";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex += 1;
	}
	return `${size.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function formatDate(isoDate: string | null): string {
	if (!isoDate) return "—";
	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) return "—";
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60_000);
	if (diffMin < 1) return "Gerade eben";
	if (diffMin < 60) return `vor ${diffMin} Min.`;
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `vor ${diffHours} Std.`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
	return date.toLocaleDateString("de-DE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

export function formatDateGroup(isoDate: string | null): string {
	if (!isoDate) return "Älter";
	const date = new Date(isoDate);
	if (Number.isNaN(date.getTime())) return "Älter";
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const weekAgo = new Date(today);
	weekAgo.setDate(weekAgo.getDate() - 7);
	const fileDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	if (fileDay.getTime() === today.getTime()) return "Heute";
	if (fileDay.getTime() === yesterday.getTime()) return "Gestern";
	if (date.getTime() >= weekAgo.getTime()) return "Diese Woche";
	return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export function getDisplayName(key: string): string {
	const filename = key.split("/").pop() || key;
	// Strip ISO-date + UUID prefix: 2024-01-01T...-<uuid>-name.ext
	const uuidMatch = filename.match(
		/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9-]{12,}Z-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i,
	);
	if (uuidMatch?.[1]) return uuidMatch[1];
	// Strip Unix ms timestamp prefix: 1713000000000-name.ext
	const tsMatch = filename.match(/^\d{13}-(.+)$/);
	if (tsMatch?.[1]) return tsMatch[1];
	return filename;
}

export type AssetType =
	| "image"
	| "video"
	| "audio"
	| "document"
	| "archive"
	| "other";

export function detectAssetType(filename: string): AssetType {
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
}

export function getPreviewPath(workspaceSlug: string, key: string): string {
	const segments = key.split("/").map(encodeURIComponent).join("/");
	return `/${workspaceSlug}/drive/${segments}`;
}
