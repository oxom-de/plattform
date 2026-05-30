import "server-only";

import { Dub } from "dub";
import {
	getWorkspaceIntegrationSecret,
	upsertWorkspaceIntegration,
} from "@/lib/integrations/workspace-integrations";
import { resolveWorkspaceIdentity } from "@/lib/authz/workspace-access";

const PROVIDER = "dub";

type DubOAuthTokens = {
	access_token: string;
	refresh_token: string;
	expires_at: number;
};

/**
 * Resolves a valid Dub access token for a workspace (OAuth path only).
 * Throws if the workspace has not connected Dub.
 */
export async function resolveDubApiKey(workspaceId: string): Promise<string> {
	const workspace = await resolveWorkspaceIdentity({
		workspaceSlug: workspaceId,
		workspaceId,
	});

	if (!workspace) {
		throw new Error("Workspace not found");
	}

	const secret = await getWorkspaceIntegrationSecret(workspace.id, PROVIDER);
	if (!secret) {
		throw new Error(
			"Dub ist nicht verbunden. Gehe zu Settings → Integrations, um Dub zu verbinden.",
		);
	}

	return resolveTokenFromSecret(secret, workspace.id);
}

async function resolveTokenFromSecret(
	secret: string,
	workspaceId: string,
): Promise<string> {
	try {
		const tokens: DubOAuthTokens = JSON.parse(secret);
		if (tokens.access_token && tokens.refresh_token && tokens.expires_at) {
			return getValidAccessToken(tokens, workspaceId);
		}
	} catch {
		// Plain API key (manually entered)
	}
	return secret;
}

async function getValidAccessToken(
	tokens: DubOAuthTokens,
	workspaceId: string,
): Promise<string> {
	if (Date.now() < tokens.expires_at - 60_000) {
		return tokens.access_token;
	}

	const fresh = await refreshDubTokens(tokens.refresh_token);
	await upsertWorkspaceIntegration({
		workspaceId,
		provider: PROVIDER,
		secret: JSON.stringify(fresh),
		secretHint: `${fresh.access_token.slice(0, 6)}...${fresh.access_token.slice(-4)}`,
		authType: "oauth2",
		actorId: "system",
	});

	return fresh.access_token;
}

async function refreshDubTokens(refreshToken: string): Promise<DubOAuthTokens> {
	const res = await fetch("https://api.dub.co/oauth/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: process.env.DUB_CLIENT_ID!,
			client_secret: process.env.DUB_CLIENT_SECRET!,
		}),
	});

	if (!res.ok) {
		throw new Error(`Dub token refresh failed: ${res.status} ${await res.text()}`);
	}

	const data = await res.json();
	return {
		access_token: data.access_token,
		refresh_token: data.refresh_token,
		expires_at: Date.now() + data.expires_in * 1000,
	};
}

export async function getDubClientForWorkspace(workspaceId: string): Promise<Dub> {
	const apiKey = await resolveDubApiKey(workspaceId);
	return new Dub({ token: apiKey });
}
