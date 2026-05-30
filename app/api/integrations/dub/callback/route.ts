import "server-only";

import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
	upsertWorkspaceIntegration,
} from "@/lib/integrations/workspace-integrations";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { buildRedirectUri } from "../connect/route";

const DUB_CLIENT_ID = process.env.DUB_CLIENT_ID!;
const DUB_CLIENT_SECRET = process.env.DUB_CLIENT_SECRET!;
const DUB_TOKEN_URL = "https://api.dub.co/oauth/token";

export const runtime = "nodejs";

type DubTokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
};

type DubOAuthCookieState = {
	state: string;
	codeVerifier: string;
	workspaceId: string;
};

export async function GET(req: NextRequest) {
	const code = req.nextUrl.searchParams.get("code");
	const state = req.nextUrl.searchParams.get("state");
	const oauthError = req.nextUrl.searchParams.get("error");

	const cookieStore = await cookies();
	const cookieRaw = cookieStore.get("dub_oauth_state")?.value;
	cookieStore.delete("dub_oauth_state");

	if (oauthError) {
		return settingsRedirect(req, null, `dub_error=${encodeURIComponent(oauthError)}`);
	}

	if (!cookieRaw || !code || !state) {
		return settingsRedirect(req, null, "dub_error=invalid_state");
	}

	let stored: DubOAuthCookieState;
	try {
		stored = JSON.parse(cookieRaw);
	} catch {
		return settingsRedirect(req, null, "dub_error=invalid_state");
	}

	if (stored.state !== state) {
		return settingsRedirect(req, null, "dub_error=state_mismatch");
	}

	const access = await requireWorkspaceAccessById(stored.workspaceId, "ADMIN");
	if (access instanceof NextResponse) {
		return settingsRedirect(req, null, "dub_error=unauthorized");
	}

	// Exchange code for tokens
	const tokenRes = await fetch(DUB_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: buildRedirectUri(req),
			client_id: DUB_CLIENT_ID,
			client_secret: DUB_CLIENT_SECRET,
			code_verifier: stored.codeVerifier,
		}),
	});

	if (!tokenRes.ok) {
		console.error("[dub oauth] token exchange failed:", await tokenRes.text());
		return settingsRedirect(req, access.workspaceSlug, "dub_error=token_exchange_failed");
	}

	const tokens: DubTokenResponse = await tokenRes.json();
	const expiresAt = Date.now() + tokens.expires_in * 1000;

	const secret = JSON.stringify({
		access_token: tokens.access_token,
		refresh_token: tokens.refresh_token,
		expires_at: expiresAt,
	});

	await upsertWorkspaceIntegration({
		workspaceId: access.workspaceId,
		provider: "dub",
		secret,
		secretHint: deriveTokenHint(tokens.access_token),
		authType: "oauth2",
		actorId: access.userId,
	});

	// Register webhook (non-fatal if it fails)
	try {
		const webhookSecret = await registerDubWebhook(
			tokens.access_token,
			req,
			access.workspaceId,
		);
		if (webhookSecret) {
			// Update metadata with webhook secret
			await upsertWorkspaceIntegration({
				workspaceId: access.workspaceId,
				provider: "dub",
				secret,
				secretHint: deriveTokenHint(tokens.access_token),
				authType: "oauth2",
				metadata: { webhook_secret: webhookSecret },
				actorId: access.userId,
			});
		}
	} catch (err) {
		console.error("[dub oauth] webhook registration failed:", err);
	}

	return settingsRedirect(req, access.workspaceSlug, "dub_connected=1");
}

async function registerDubWebhook(
	accessToken: string,
	req: NextRequest,
	workspaceId: string,
): Promise<string | null> {
	const host = req.headers.get("host") ?? "localhost:3000";
	const proto = req.headers.get("x-forwarded-proto") ?? "http";
	const webhookUrl = `${proto}://${host}/api/webhooks/dub?workspaceId=${workspaceId}`;

	const res = await fetch("https://api.dub.co/webhooks", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			name: `oxom-${workspaceId.slice(0, 8)}`,
			url: webhookUrl,
			triggers: ["link.created", "link.updated", "link.deleted"],
		}),
	});

	if (!res.ok) {
		console.error("[dub oauth] webhook creation failed:", await res.text());
		return null;
	}

	const data = await res.json();
	return (data.secret as string) ?? null;
}

function deriveTokenHint(token: string): string {
	if (token.length <= 8) return token;
	return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function settingsRedirect(
	req: NextRequest,
	workspaceSlug: string | null,
	query: string,
): NextResponse {
	const host = req.headers.get("host") ?? "localhost:3000";
	const proto = req.headers.get("x-forwarded-proto") ?? "http";
	const base = workspaceSlug
		? `${proto}://${host}/${workspaceSlug}/settings/integrations`
		: `${proto}://${host}`;
	return NextResponse.redirect(`${base}?${query}`);
}
