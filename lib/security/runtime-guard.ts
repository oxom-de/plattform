import "server-only";

import { NextResponse } from "next/server";

function parseBooleanFlag(value: string | undefined): boolean {
	if (!value) return false;
	const normalized = value.trim().toLowerCase();
	return (
		normalized === "1" ||
		normalized === "true" ||
		normalized === "yes" ||
		normalized === "on"
	);
}

export function isProductionEnvironment(): boolean {
	const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
	if (vercelEnv === "production") return true;
	return process.env.NODE_ENV === "production";
}

export function isDebugApiEnabled(): boolean {
	if (!isProductionEnvironment()) return true;
	return parseBooleanFlag(process.env.OXOM_ENABLE_DEBUG_API);
}

export function isLegacyApiEnabled(): boolean {
	if (!isProductionEnvironment()) return true;
	return parseBooleanFlag(process.env.OXOM_ENABLE_LEGACY_API);
}

export function requireDebugApiEnabled(): NextResponse | null {
	if (isDebugApiEnabled()) return null;
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function requireLegacyApiEnabled(): NextResponse | null {
	if (isLegacyApiEnabled()) return null;
	return NextResponse.json({ error: "Not found" }, { status: 404 });
}
