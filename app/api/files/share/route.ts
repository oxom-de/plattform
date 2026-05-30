import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccessBySlug } from "@/lib/authz/workspace-access";
import { createShareUrl, SHARE_EXPIRY } from "@/lib/drive-share";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const EXPIRY_MAP: Record<string, number> = {
	"1h": SHARE_EXPIRY.oneHour,
	"1d": SHARE_EXPIRY.oneDay,
	"7d": SHARE_EXPIRY.sevenDays,
	"30d": SHARE_EXPIRY.thirtyDays,
};

const schema = z.object({
	key: z.string().min(1).max(1024),
	creatorSlug: z.string().min(1),
	expiry: z.enum(["1h", "1d", "7d", "30d"]).optional().default("7d"),
});

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	const { key, creatorSlug, expiry } = parsed.data;

	const access = await requireWorkspaceAccessBySlug(creatorSlug);
	if (access instanceof NextResponse) return access;

	// Ensure the key belongs to this workspace
	if (!key.startsWith(`${access.workspaceSlug}/`)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/files/share",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const expiresInSeconds = EXPIRY_MAP[expiry] ?? SHARE_EXPIRY.sevenDays;
	const url = createShareUrl(key, expiresInSeconds);

	return NextResponse.json({ url, expiry, key });
}
