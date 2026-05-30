import { type NextRequest, NextResponse } from "next/server";
import { buildQrQuery } from "@/lib/dub/qr-presets";
import { requireWorkspaceAccessBySlug } from "@/lib/authz/workspace-access";
import { resolveDubApiKey } from "@/lib/dub";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const DUB_API_BASE_URL = "https://dub.co/api";

export async function GET(req: NextRequest) {
	try {
		const params = req.nextUrl.searchParams;
		const team = params.get("team") || "";
		const url = params.get("url") || "";

		if (!team || !url) {
			return NextResponse.json(
				{ error: "Missing team or url" },
				{ status: 400 },
			);
		}

		try {
			new URL(url);
		} catch {
			return NextResponse.json({ error: "Invalid url" }, { status: 400 });
		}

		const access = await requireWorkspaceAccessBySlug(team);
		if (access instanceof NextResponse) return access;

		const limit = await checkRateLimit({
			tier: "links",
			route: "/api/qr",
			userId: access.userId,
			workspaceId: access.workspaceId,
		});
		if (!limit.allowed) return rateLimitedResponse(limit);

		const apiKey = await resolveDubApiKey(access.workspaceSlug);

		const proxyQuery = buildQrQuery({
			url,
			logo: params.get("logo"),
			size: params.get("size"),
			level: params.get("level"),
			fgColor: params.get("fgColor"),
			bgColor: params.get("bgColor"),
			hideLogo: params.get("hideLogo"),
			margin: params.get("margin"),
			includeMargin: params.get("includeMargin"),
		});

		const response = await fetch(
			`${DUB_API_BASE_URL}/qr?${proxyQuery.toString()}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					Accept: "image/png",
				},
			},
		);

		if (!response.ok) {
			const errText = await response.text().catch(() => "");
			return NextResponse.json(
				{
					error: `Dub QR API error (${response.status})`,
					details: errText || response.statusText,
				},
				{ status: response.status },
			);
		}

		const body = await response.arrayBuffer();
		const contentType = response.headers.get("content-type") || "image/png";

		return new Response(body, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "private, max-age=60",
			},
		});
	} catch (error: any) {
		return NextResponse.json(
			{
				error: "Failed to retrieve QR code",
				details: error?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}
