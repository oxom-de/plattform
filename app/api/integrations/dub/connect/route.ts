import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";

const DUB_CLIENT_ID = process.env.DUB_CLIENT_ID!;
const DUB_AUTHORIZE_URL = "https://app.dub.co/oauth/authorize";
const SCOPES = "links.read links.write analytics.read";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
	const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? "";
	const access = await requireWorkspaceAccessById(workspaceId, "ADMIN");
	if (access instanceof NextResponse) return access;

	const codeVerifier = crypto.randomBytes(32).toString("base64url");
	const codeChallenge = crypto
		.createHash("sha256")
		.update(codeVerifier)
		.digest("base64url");
	const state = crypto.randomBytes(16).toString("hex");

	const cookieStore = await cookies();
	cookieStore.set(
		"dub_oauth_state",
		JSON.stringify({ state, codeVerifier, workspaceId: access.workspaceId }),
		{
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 600,
			path: "/",
		},
	);

	const redirectUri = buildRedirectUri(req);
	const url = new URL(DUB_AUTHORIZE_URL);
	url.searchParams.set("client_id", DUB_CLIENT_ID);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("scope", SCOPES);
	url.searchParams.set("state", state);
	url.searchParams.set("code_challenge", codeChallenge);
	url.searchParams.set("code_challenge_method", "S256");

	return NextResponse.redirect(url.toString());
}

export function buildRedirectUri(req: NextRequest): string {
	const host = req.headers.get("host") ?? "localhost:3000";
	const proto = req.headers.get("x-forwarded-proto") ?? "http";
	return `${proto}://${host}/api/integrations/dub/callback`;
}
