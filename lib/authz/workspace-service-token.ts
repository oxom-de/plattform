import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import type {
	AuthorizedWorkspaceAccess,
	WorkspaceMembershipRole,
} from "@/lib/authz/workspace-access";
import {
	requireWorkspaceAccessById,
	resolveWorkspaceIdentity,
} from "@/lib/authz/workspace-access";

function getBearerToken(request: NextRequest): string {
	const raw = request.headers.get("authorization") || "";
	const [scheme, token = ""] = raw.split(/\s+/, 2);
	if (scheme?.toLowerCase() !== "bearer") return "";
	return token.trim();
}

function getWorkspaceServiceToken(): string {
	return (
		process.env.MEDIA_WORKSPACE_TOKEN?.trim() ||
		process.env.OXOM_MEDIA_WORKSPACE_TOKEN?.trim() ||
		process.env.WORKSPACE_SERVICE_TOKEN?.trim() ||
		process.env.OXOM_WORKSPACE_SERVICE_TOKEN?.trim() ||
		""
	);
}

function getWorkspaceServiceWorkspaceId(): string {
	return (
		process.env.MEDIA_WORKSPACE_ID?.trim() ||
		process.env.OXOM_MEDIA_WORKSPACE_ID?.trim() ||
		process.env.WORKSPACE_SERVICE_WORKSPACE_ID?.trim() ||
		process.env.OXOM_WORKSPACE_SERVICE_WORKSPACE_ID?.trim() ||
		""
	);
}

export function getWorkspaceServiceTokenConfig(): {
	token: string;
	workspaceId: string;
} {
	return {
		token: getWorkspaceServiceToken(),
		workspaceId: getWorkspaceServiceWorkspaceId(),
	};
}

function constantTimeEqualString(a: string, b: string): boolean {
	const aBuffer = Buffer.from(a);
	const bBuffer = Buffer.from(b);
	if (aBuffer.length !== bBuffer.length) return false;
	return timingSafeEqual(aBuffer, bBuffer);
}

async function authorizeViaServiceToken(input: {
	request: NextRequest;
	workspaceId: string;
	requiredRole: WorkspaceMembershipRole;
}): Promise<AuthorizedWorkspaceAccess | null> {
	const configuredToken = getWorkspaceServiceToken();
	if (!configuredToken) return null;
	const configuredWorkspaceId = getWorkspaceServiceWorkspaceId();
	if (
		configuredWorkspaceId &&
		configuredWorkspaceId !== input.workspaceId.trim()
	) {
		return null;
	}

	const providedToken = getBearerToken(input.request);
	if (!providedToken) return null;
	if (!constantTimeEqualString(configuredToken, providedToken)) return null;

	const workspace = await resolveWorkspaceIdentity({ workspaceId: input.workspaceId });
	if (!workspace) return null;

	return {
		userId: "workspace-service-token",
		workspaceId: workspace.id,
		workspaceSlug: workspace.slug,
		workspaceName: workspace.name,
		membershipRole: input.requiredRole,
		clerkOrgId: workspace.clerkOrgId,
	};
}

export async function requireWorkspaceAccessByIdOrServiceToken(
	request: NextRequest,
	workspaceId: string,
	requiredRole: WorkspaceMembershipRole = "MEMBER",
): Promise<AuthorizedWorkspaceAccess | NextResponse> {
	const viaToken = await authorizeViaServiceToken({
		request,
		workspaceId,
		requiredRole,
	});
	if (viaToken) return viaToken;

	return requireWorkspaceAccessById(workspaceId, requiredRole);
}
