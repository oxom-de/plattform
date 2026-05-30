import { NextResponse } from "next/server";
import type {
	AuthorizedWorkspaceAccess,
	WorkspaceMembershipRole,
} from "@/lib/authz/workspace-access";
import {
	requireWorkspaceAccessById,
	requireWorkspaceAccessBySlug,
} from "@/lib/authz/workspace-access";

export async function withWorkspaceAccessBySlug<T>(
	workspaceSlug: string,
	handler: (access: AuthorizedWorkspaceAccess) => Promise<T>,
	requiredRole: WorkspaceMembershipRole = "MEMBER",
): Promise<T | NextResponse> {
	const access = await requireWorkspaceAccessBySlug(
		workspaceSlug,
		requiredRole,
	);
	if (access instanceof NextResponse) return access;
	return handler(access);
}

export async function withWorkspaceAccessById<T>(
	workspaceId: string,
	handler: (access: AuthorizedWorkspaceAccess) => Promise<T>,
	requiredRole: WorkspaceMembershipRole = "MEMBER",
): Promise<T | NextResponse> {
	const access = await requireWorkspaceAccessById(workspaceId, requiredRole);
	if (access instanceof NextResponse) return access;
	return handler(access);
}
