import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
	createServerSupabaseAdminClient,
	createServerSupabaseClientWithClerk,
} from "@/lib/supabase/server";
import {
	extractWorkspaceSlugFromObjectKey as extractWorkspaceSlugFromObjectKeyBase,
	normalizeWorkspaceSlug as normalizeWorkspaceSlugBase,
} from "@/lib/tenant/tenant-utils";

export type WorkspaceMembershipRole = "ADMIN" | "MODERATOR" | "MEMBER";

export type WorkspaceIdentity = {
	id: string;
	slug: string;
	name: string;
	clerkOrgId: string | null;
};

export type AuthorizedWorkspaceAccess = {
	userId: string;
	workspaceId: string;
	workspaceSlug: string;
	workspaceName: string;
	membershipRole: WorkspaceMembershipRole;
	clerkOrgId: string | null;
};

const ROLE_RANK: Record<WorkspaceMembershipRole, number> = {
	MEMBER: 1,
	MODERATOR: 2,
	ADMIN: 3,
};

function hasRequiredRole(
	role: WorkspaceMembershipRole,
	required: WorkspaceMembershipRole,
) {
	return ROLE_RANK[role] >= ROLE_RANK[required];
}

export const normalizeWorkspaceSlug = normalizeWorkspaceSlugBase;

export const extractWorkspaceSlugFromObjectKey =
	extractWorkspaceSlugFromObjectKeyBase;

export function unauthorizedResponse() {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
	return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequestResponse(message = "Bad request") {
	return NextResponse.json({ error: message }, { status: 400 });
}

type WorkspaceReadClient = ReturnType<typeof createServerSupabaseAdminClient>;

export async function requireAuthenticatedUser(): Promise<
	string | NextResponse
> {
	const { userId } = await auth();
	if (!userId) return unauthorizedResponse();
	return userId;
}

async function getWorkspaceBySlug(
	slug: string,
	supabase: WorkspaceReadClient = createServerSupabaseAdminClient(),
): Promise<WorkspaceIdentity | null> {
	const { data, error } = await supabase
		.from("workspaces")
		.select("id, slug, name, clerk_org_id")
		.eq("slug", slug)
		.maybeSingle<{ id: string; slug: string; name: string; clerk_org_id: string | null }>();

	if (error || !data) return null;
	return { id: data.id, slug: data.slug, name: data.name, clerkOrgId: data.clerk_org_id };
}

async function getWorkspaceById(
	id: string,
	supabase: WorkspaceReadClient = createServerSupabaseAdminClient(),
): Promise<WorkspaceIdentity | null> {
	const { data, error } = await supabase
		.from("workspaces")
		.select("id, slug, name, clerk_org_id")
		.eq("id", id)
		.maybeSingle<{ id: string; slug: string; name: string; clerk_org_id: string | null }>();

	if (error || !data) return null;
	return { id: data.id, slug: data.slug, name: data.name, clerkOrgId: data.clerk_org_id };
}

export async function resolveWorkspaceIdentity(
	input: {
		workspaceSlug?: string | null;
		workspaceId?: string | null;
	},
	supabase: WorkspaceReadClient = createServerSupabaseAdminClient(),
): Promise<WorkspaceIdentity | null> {
	const normalizedSlug = normalizeWorkspaceSlug(input.workspaceSlug);
	if (normalizedSlug) {
		return getWorkspaceBySlug(normalizedSlug, supabase);
	}

	const rawWorkspaceId = (input.workspaceId || "").trim();
	if (!rawWorkspaceId) return null;
	return getWorkspaceById(rawWorkspaceId, supabase);
}

export async function authorizeWorkspaceAccess(
	userId: string,
	workspaceId: string,
	requiredRole: WorkspaceMembershipRole = "MEMBER",
	supabase: WorkspaceReadClient = createServerSupabaseAdminClient(),
): Promise<{ role: WorkspaceMembershipRole } | null> {
	const { data, error } = await supabase
		.from("workspace_memberships")
		.select("role")
		.eq("workspace_id", workspaceId)
		.eq("user_id", userId)
		.maybeSingle<{ role: WorkspaceMembershipRole }>();

	if (error || !data) return null;
	if (!hasRequiredRole(data.role, requiredRole)) return null;
	return { role: data.role };
}

export async function requireWorkspaceAccessBySlug(
	workspaceSlug: string,
	requiredRole: WorkspaceMembershipRole = "MEMBER",
): Promise<AuthorizedWorkspaceAccess | NextResponse> {
	const userId = await requireAuthenticatedUser();
	if (userId instanceof NextResponse) return userId;

	const normalizedSlug = normalizeWorkspaceSlug(workspaceSlug);
	if (!normalizedSlug) return badRequestResponse("Missing workspace slug");

	const readClient = await createServerSupabaseClientWithClerk();
	const workspace = await resolveWorkspaceIdentity({
		workspaceSlug: normalizedSlug,
	}, readClient);
	if (!workspace) {
		return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
	}

	const membership = await authorizeWorkspaceAccess(
		userId,
		workspace.id,
		requiredRole,
		readClient,
	);
	if (!membership)
		return forbiddenResponse("Forbidden: no workspace membership");

	return {
		userId,
		workspaceId: workspace.id,
		workspaceSlug: workspace.slug,
		workspaceName: workspace.name,
		membershipRole: membership.role,
		clerkOrgId: workspace.clerkOrgId,
	};
}

export async function requireWorkspaceAccessById(
	workspaceId: string,
	requiredRole: WorkspaceMembershipRole = "MEMBER",
): Promise<AuthorizedWorkspaceAccess | NextResponse> {
	const userId = await requireAuthenticatedUser();
	if (userId instanceof NextResponse) return userId;

	const resolvedWorkspaceId = workspaceId.trim();
	if (!resolvedWorkspaceId) return badRequestResponse("Missing workspace id");

	const readClient = await createServerSupabaseClientWithClerk();
	const workspace = await resolveWorkspaceIdentity({
		workspaceId: resolvedWorkspaceId,
	}, readClient);
	if (!workspace) {
		return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
	}

	const membership = await authorizeWorkspaceAccess(
		userId,
		workspace.id,
		requiredRole,
		readClient,
	);
	if (!membership)
		return forbiddenResponse("Forbidden: no workspace membership");

	return {
		userId,
		workspaceId: workspace.id,
		workspaceSlug: workspace.slug,
		workspaceName: workspace.name,
		membershipRole: membership.role,
		clerkOrgId: workspace.clerkOrgId,
	};
}
