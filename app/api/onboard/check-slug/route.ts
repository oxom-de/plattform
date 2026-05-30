import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const RESERVED_SLUGS = new Set([
	"admin",
	"api",
	"app",
	"auth",
	"billing",
	"blog",
	"dashboard",
	"docs",
	"help",
	"login",
	"oxom",
	"pricing",
	"settings",
	"support",
	"www",
]);

export async function GET(req: NextRequest) {
	const slug = req.nextUrl.searchParams
		.get("slug")
		?.toLowerCase()
		.replace(/[^a-z0-9-]/g, "")
		.slice(0, 32);

	if (!slug || slug.length < 2) {
		return NextResponse.json({ available: false, reason: "too_short" });
	}

	if (RESERVED_SLUGS.has(slug)) {
		return NextResponse.json({ available: false, reason: "reserved" });
	}

	try {
		const supabase = createServerSupabaseAdminClient();
		const { data } = await supabase
			.from("workspace")
			.select("id")
			.eq("slug", slug)
			.maybeSingle();

		return NextResponse.json({ available: !data });
	} catch {
		return NextResponse.json(
			{ available: false, reason: "error" },
			{ status: 500 },
		);
	}
}
