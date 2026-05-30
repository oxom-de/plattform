import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { WorkspaceLinkInBioClient } from "@/components/workspace/workspace-link-in-bio-client";
import { isLinkInBioEnabledForWorkspace } from "@/lib/feature-flags";
import {
	createDefaultLinkInBioProfile,
	getLinkInBioVerificationLabelForWorkspaceId,
	getLinkInBioProfileByWorkspaceId,
} from "@/lib/link-in-bio/loaders";
import { buildLinkInBioPublicUrl } from "@/lib/link-in-bio/routing";
import { getWorkspaceFromHeaders } from "@/lib/tenant/get-workspace";
import { listDomainsForWorkspace } from "@/lib/tenant/loaders";

const VERIFIED_BADGE_WORKSPACES = new Set(["leon", "oxom"]);

export default async function WorkspaceLinkInBioPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	if (!(await isLinkInBioEnabledForWorkspace(workspace.id))) notFound();

	const loadResult = await getLinkInBioProfileByWorkspaceId(workspace.id);
	const publicUrl = buildLinkInBioPublicUrl(workspace.slug);

	if (loadResult.missingTable || loadResult.error) {
		return (
			<main className="flex min-h-0 flex-1 flex-col gap-6">
				<WorkspacePageHeader label="Link in Bio" clerkOrgId={workspace.clerk_org_id} />
				<p className="text-sm text-muted-foreground">
					{loadResult.missingTable
						? "Datenbanktabelle fehlt. Bitte docs/sql/link-in-bio.sql in Supabase ausführen."
						: (loadResult.error?.message ?? "Link in Bio konnte nicht geladen werden.")}
				</p>
			</main>
		);
	}

	const initialProfile =
		loadResult.profile ?? createDefaultLinkInBioProfile(workspace.id, workspace.name);
	const domains = await listDomainsForWorkspace(workspace.id);
	const customLinkInBioDomain =
		domains.find((d) => d.purpose === "LINK_IN_BIO" && d.type === "CUSTOM") ?? null;
	const resolvedPublicUrl = customLinkInBioDomain?.verified
		? `https://${customLinkInBioDomain.hostname}`
		: publicUrl;

	// Verified check badge only for specific workspaces
	const verificationLabel = VERIFIED_BADGE_WORKSPACES.has(workspace.slug)
		? await getLinkInBioVerificationLabelForWorkspaceId(workspace.id)
		: null;

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-6">
			<WorkspacePageHeader label="Link in Bio" clerkOrgId={workspace.clerk_org_id} />
			<WorkspaceLinkInBioClient
				workspaceId={workspace.id}
				workspaceSlug={workspace.slug}
				workspaceName={workspace.name}
				verifiedLabel={verificationLabel}
				hideBranding={Boolean(workspace.hide_oxom_branding)}
				publicUrl={resolvedPublicUrl}
				initialLinkInBioDomain={customLinkInBioDomain}
				initialProfile={initialProfile}
			/>
		</main>
	);
}
