export type QrLevel = "L" | "M" | "Q" | "H";

export interface QrOptions {
	url: string;
	logo?: string | null;
	size?: number | string | null;
	level?: QrLevel | string | null;
	fgColor?: string | null;
	bgColor?: string | null;
	hideLogo?: boolean | string | null;
	margin?: number | string | null;
	includeMargin?: boolean | string | null;
}

function normalizeColor(value: string | null | undefined): string | undefined {
	if (!value || typeof value !== "string") return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
	return withHash.toUpperCase();
}

function normalizeBoolean(value: boolean | string | null | undefined): boolean | undefined {
	if (typeof value === "boolean") return value;
	if (typeof value !== "string") return undefined;
	const normalized = value.trim().toLowerCase();
	if (["true", "1", "yes"].includes(normalized)) return true;
	if (["false", "0", "no"].includes(normalized)) return false;
	return undefined;
}

function normalizeNumber(value: number | string | null | undefined): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return undefined;
	const parsed = Number.parseInt(value.trim(), 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildQrQuery(input: QrOptions): URLSearchParams {
	const query = new URLSearchParams({ url: input.url });

	const logo = input.logo ?? undefined;
	const hideLogo = normalizeBoolean(input.hideLogo);
	const size = normalizeNumber(input.size);
	const margin = normalizeNumber(input.margin);
	const fgColor = normalizeColor(input.fgColor);
	const bgColor = normalizeColor(input.bgColor);
	const includeMargin = normalizeBoolean(input.includeMargin);

	if (logo && !hideLogo) query.set("logo", logo);
	if (size !== undefined) query.set("size", String(size));
	if (input.level) query.set("level", input.level as string);
	if (fgColor) query.set("fgColor", fgColor);
	if (bgColor) query.set("bgColor", bgColor);
	if (hideLogo !== undefined) query.set("hideLogo", String(hideLogo));
	if (margin !== undefined) query.set("margin", String(margin));
	if (includeMargin !== undefined) query.set("includeMargin", String(includeMargin));

	return query;
}
