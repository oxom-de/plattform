import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InviteMemberButton } from "@/components/members/invite-member-button";
import { MembersList } from "@/components/members/members-list";
import { PendingInvitations } from "@/components/members/pending-invitations";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import {
	getWorkspaceBasePathFromHeaders,
	getWorkspaceFromHeaders,
} from "@/lib/tenant/get-workspace";
import { resolveWorkspaceByPathSlug } from "@/lib/tenant/resolve-workspace";

interface MembersPageProps {
	params: Promise<{ workspace: string }>;
}

type MembershipRow = {
	id: string;
	user_id: string;
	role: "ADMIN" | "MODERATOR" | "EDITOR" | "MEMBER";
	created_at: string;
};

type InvitationRow = {
	id: string;
	role: "ADMIN" | "MODERATOR" | "EDITOR" | "MEMBER";
	token: string;
	expires_at: string;
	created_at: string;
};

function isValidWorkspaceSlug(value: string) {
	return /^[a-z0-9_-]{1,64}$/.test(value);
}

export default async function WorkspaceMembersSettingsPage({
	params,
}: MembersPageProps) {
	const { workspace: requestedSlug } = await params;
	const normalizedRequestedSlug = requestedSlug.trim().toLowerCase();
	if (!isValidWorkspaceSlug(normalizedRequestedSlug)) {
		notFound();
	}

	const { userId } = await auth();
	if (!userId) {
		notFound();
	}

	const workspaceFromHeaders = await getWorkspaceFromHeaders();
	const workspace =
		workspaceFromHeaders?.slug === normalizedRequestedSlug
			? workspaceFromHeaders
			: await resolveWorkspaceByPathSlug(normalizedRequestedSlug);

	if (!workspace || workspace.slug !== normalizedRequestedSlug) {
		notFound();
	}

	const basePath = await getWorkspaceBasePathFromHeaders(workspace.slug);
	const settingsHref = basePath ? `${basePath}/settings` : "/settings";

	const supabase = createServerSupabaseAdminClient();
	const { data: callerMembership } = await supabase
		.from("workspace_memberships")
		.select("role")
		.eq("workspace_id", workspace.id)
		.eq("user_id", userId)
		.maybeSingle<{ role: "ADMIN" | "MODERATOR" | "EDITOR" | "MEMBER" }>();

	if (!callerMembership) {
		notFound();
	}

	const isAdmin = callerMembership.role === "ADMIN";

	const { data: memberships, error: membershipsError } = await supabase
		.from("workspace_memberships")
		.select("id, user_id, role, created_at")
		.eq("workspace_id", workspace.id)
		.order("created_at", { ascending: true });

	if (membershipsError) {
		return (
			<div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
				Members konnten nicht geladen werden: {membershipsError.message}
			</div>
		);
	}

	const typedMemberships = (memberships || []) as MembershipRow[];
	const userIds = Array.from(
		new Set(typedMemberships.map((entry) => entry.user_id).filter(Boolean)),
	);

	const clerk = await clerkClient();
	const userMap = new Map<
		string,
		{
			username: string;
			email: string;
			avatarUrl: string | null;
		}
	>();

	for (let index = 0; index < userIds.length; index += 100) {
		const chunk = userIds.slice(index, index + 100);
		if (chunk.length === 0) continue;

		const result = await clerk.users.getUserList({
			userId: chunk,
			limit: chunk.length,
		});
		for (const user of result.data) {
			userMap.set(user.id, {
				username: user.username || "—",
				email: user.emailAddresses?.[0]?.emailAddress || "—",
				avatarUrl: user.imageUrl || null,
			});
		}
	}

	const members = typedMemberships.map((entry) => {
		const clerkUser = userMap.get(entry.user_id);
		return {
			membershipId: entry.id,
			userId: entry.user_id,
			username: clerkUser?.username || "—",
			email: clerkUser?.email || "—",
			avatarUrl: clerkUser?.avatarUrl || null,
			role: entry.role,
			joinedAt: entry.created_at,
			isSelf: entry.user_id === userId,
		};
	});

	let pendingInvitations: InvitationRow[] = [];
	let invitationLoadError: string | null = null;

	if (isAdmin) {
		const { data, error } = await supabase
			.from("workspace_invitations")
			.select("id, role, token, expires_at, created_at")
			.eq("workspace_id", workspace.id)
			.is("accepted_at", null)
			.gt("expires_at", new Date().toISOString())
			.order("created_at", { ascending: false });

		if (error) {
			invitationLoadError = error.message;
		} else {
			pendingInvitations = (data || []) as InvitationRow[];
		}
	}

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-6">
			<WorkspacePageHeader
				label="Members"
				clerkOrgId={workspace.clerk_org_id}
				breadcrumbs={[{ label: "Settings", href: settingsHref }]}
			/>
			<FadeIn>
				<div className="flex flex-wrap gap-1.5">
					{isAdmin ? <InviteMemberButton workspaceId={workspace.id} /> : null}
				</div>
			</FadeIn>

			<FadeIn delay={0.1}>
				<section className="flex flex-col gap-5">
					<MembersList
						members={members}
						isAdmin={isAdmin}
						workspaceId={workspace.id}
					/>

					{isAdmin ? (
						invitationLoadError ? (
							<div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
								Einladungen konnten nicht geladen werden: {invitationLoadError}
							</div>
						) : (
							<PendingInvitations
								invitations={pendingInvitations}
								workspaceId={workspace.id}
							/>
						)
					) : null}
				</section>
			</FadeIn>
		</main>
	);
}
