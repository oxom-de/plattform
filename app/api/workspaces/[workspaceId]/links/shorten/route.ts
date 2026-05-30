import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccessByIdOrServiceToken } from "@/lib/authz/workspace-service-token";
import { getDubClientForWorkspace, getTeamDomain } from "@/lib/dub";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

interface RouteContext {
	params: Promise<{ workspaceId: string }>;
}

const shortenLinkSchema = z.object({
	url: z.string().trim().url().max(2_048),
});

function errorMessage(value: unknown): string {
	if (typeof value === "string" && value.trim()) return value;
	if (value && typeof value === "object" && "message" in value) {
		const message = (value as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) return message;
	}
	return "Failed to shorten link";
}

export async function POST(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessByIdOrServiceToken(req, workspaceId);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/links/shorten",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = await req.json().catch(() => ({}));
	const parsed = shortenLinkSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	try {
		const dub = await getDubClientForWorkspace(access.workspaceSlug);
		const created = await dub.links.create({
			domain: getTeamDomain(access.workspaceSlug),
			url: parsed.data.url,
		});

		const shortUrl = created.shortLink?.trim();
		if (!shortUrl) {
			return NextResponse.json(
				{ error: "Short URL missing in provider response" },
				{ status: 502 },
			);
		}

		return NextResponse.json({
			data: {
				shortUrl,
				originalUrl: parsed.data.url,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ error: errorMessage(error) },
			{ status: 500 },
		);
	}
}
