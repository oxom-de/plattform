import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

type OxomRole = "ADMIN" | "MODERATOR" | "EDITOR" | "MEMBER";

function toClerkRole(role: OxomRole): "org:admin" | "org:member" {
	return role === "ADMIN" ? "org:admin" : "org:member";
}

/**
 * Creates a new Clerk Organization for a workspace.
 * The createdByUserId is automatically made org:admin by Clerk.
 * Returns the Clerk org ID, or null on failure (non-blocking).
 */
export async function createClerkOrg(
	name: string,
	slug: string,
	createdByUserId: string,
): Promise<string | null> {
	try {
		const clerk = await clerkClient();
		const org = await clerk.organizations.createOrganization({
			name,
			slug,
			createdBy: createdByUserId,
		});
		return org.id;
	} catch (err) {
		console.error("[clerk-org-sync] createOrg failed", { name, slug, err });
		return null;
	}
}

/**
 * Adds a user to a Clerk Organization with the given role.
 * Best-effort: failures are logged but do not throw.
 */
export async function syncAddOrgMember(
	clerkOrgId: string,
	userId: string,
	role: OxomRole,
): Promise<void> {
	try {
		const clerk = await clerkClient();
		await clerk.organizations.createOrganizationMembership({
			organizationId: clerkOrgId,
			userId,
			role: toClerkRole(role),
		});
	} catch (err) {
		console.error("[clerk-org-sync] addMember failed", {
			clerkOrgId,
			userId,
			err,
		});
	}
}

/**
 * Removes a user from a Clerk Organization.
 * Best-effort: failures are logged but do not throw.
 */
export async function syncRemoveOrgMember(
	clerkOrgId: string,
	userId: string,
): Promise<void> {
	try {
		const clerk = await clerkClient();
		await clerk.organizations.deleteOrganizationMembership({
			organizationId: clerkOrgId,
			userId,
		});
	} catch (err) {
		console.error("[clerk-org-sync] removeMember failed", {
			clerkOrgId,
			userId,
			err,
		});
	}
}

/**
 * Updates a user's role in a Clerk Organization.
 * Best-effort: failures are logged but do not throw.
 */
export async function syncUpdateOrgMemberRole(
	clerkOrgId: string,
	userId: string,
	role: OxomRole,
): Promise<void> {
	try {
		const clerk = await clerkClient();
		await clerk.organizations.updateOrganizationMembership({
			organizationId: clerkOrgId,
			userId,
			role: toClerkRole(role),
		});
	} catch (err) {
		console.error("[clerk-org-sync] updateRole failed", {
			clerkOrgId,
			userId,
			err,
		});
	}
}
