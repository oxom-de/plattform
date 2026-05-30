import { auth, currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { shouldForcePasswordChange } from "@/lib/auth/password-reset";
import {
	isLinkInBioEnabledForWorkspace,
	isMediaEnabledForWorkspace,
} from "@/lib/feature-flags";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import {
	getWorkspaceBasePathFromHeaders,
	getCurrentPathnameFromHeaders,
	getWorkspaceFromHeaders,
} from "@/lib/tenant/get-workspace";
import { resolveWorkspaceByPathSlug } from "@/lib/tenant/resolve-workspace";

interface WorkspaceLayoutProps {
	children: ReactNode;
	params: Promise<{ workspace: string }>;
}

type MembershipRow = {
	id: string;
	onboarding_completed?: boolean | null;
};

export const metadata: Metadata = {
	robots: NO_INDEX_ROBOTS,
};

function isValidWorkspaceSlug(value: string) {
	return /^[a-z0-9_-]{1,64}$/.test(value);
}

export default async function WorkspaceLayout({
	children,
	params,
}: WorkspaceLayoutProps) {
	const { workspace: requestedWorkspaceSlug } = await params;
	const normalizedRequestedWorkspaceSlug = requestedWorkspaceSlug
		.trim()
		.toLowerCase();
	if (!isValidWorkspaceSlug(normalizedRequestedWorkspaceSlug)) {
		notFound();
	}

	const { userId } = await auth();
	if (!userId) {
		redirect("/sign-in");
	}

	const workspace =
		(await getWorkspaceFromHeaders()) ||
		(await resolveWorkspaceByPathSlug(normalizedRequestedWorkspaceSlug));
	if (!workspace) {
		notFound();
	}

	if (workspace.slug !== normalizedRequestedWorkspaceSlug) {
		notFound();
	}

	const user = await currentUser();
	if (shouldForcePasswordChange(user)) {
		redirect(
			`/onboarding/password?redirect_url=${encodeURIComponent(`/${workspace.slug}`)}`,
		);
	}

	const supabase = createServerSupabaseAdminClient();
	let membership: MembershipRow | null = null;
	let membershipError: { code?: string | null } | null = null;

	{
		const result = await supabase
			.from("workspace_memberships")
			.select("id, onboarding_completed")
			.eq("workspace_id", workspace.id)
			.eq("user_id", userId)
			.maybeSingle<MembershipRow>();

		membership = result.data;
		membershipError = result.error;
	}

	// Backward compatibility if migration is not yet applied.
	if (membershipError?.code === "42703") {
		const fallback = await supabase
			.from("workspace_memberships")
			.select("id")
			.eq("workspace_id", workspace.id)
			.eq("user_id", userId)
			.maybeSingle<{ id: string }>();

		membership = fallback.data;
		membershipError = fallback.error;
	}

	if (!membership || membershipError) {
		redirect("/switcher");
	}

	const needsOnboarding = !membership.onboarding_completed;
	const basePath = await getWorkspaceBasePathFromHeaders(workspace.slug);
	const currentPathname = await getCurrentPathnameFromHeaders();
	const isEmbeddedNotesRoute = currentPathname.endsWith("/notes/embeded");
	const linkInBioEnabled = await isLinkInBioEnabledForWorkspace(workspace.id);
	const mediaEnabled = await isMediaEnabledForWorkspace(workspace.id);

	return (
		<WorkspaceProvider
			workspace={workspace}
			basePath={basePath}
			flags={{ linkInBio: linkInBioEnabled, media: mediaEnabled }}
		>
			<OnboardingProvider
				needsOnboarding={needsOnboarding}
				workspaceId={workspace.id}
			>
				{isEmbeddedNotesRoute ? (
					children
				) : (
					<WorkspaceShell>
						<OnboardingTour />
						{children}
					</WorkspaceShell>
				)}
			</OnboardingProvider>
		</WorkspaceProvider>
	);
}
