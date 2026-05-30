import Link from "next/link";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { WorkspaceSettingsClient } from "@/components/workspace/workspace-settings-client";
import {
	getWorkspaceBasePathFromHeaders,
	getWorkspaceFromHeaders,
} from "@/lib/tenant/get-workspace";
import { listDomainsForWorkspace } from "@/lib/tenant/loaders";

export default async function WorkspaceSettingsPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	const basePath = await getWorkspaceBasePathFromHeaders(workspace.slug);
	const integrationsHref = basePath ? `${basePath}/settings/integrations` : "/settings/integrations";
	const driveHref = basePath ? `${basePath}/settings/drive` : "/settings/drive";
	const domainsHref = basePath ? `${basePath}/settings/domains` : "/settings/domains";
	const membersHref = basePath ? `${basePath}/settings/members` : "/settings/members";

	let rootPreviewDomain: string | null = null;
	try {
		const domains = await listDomainsForWorkspace(workspace.id);
		const rootPreview = domains
			.filter((d) => d.purpose === "ROOT_PREVIEW")
			.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
		const raw = rootPreview?.hostname?.trim().toLowerCase() || null;
		if (raw?.length) {
			rootPreviewDomain = raw.startsWith("dashboard.") ? raw.slice("dashboard.".length) : raw;
		}
	} catch {
		rootPreviewDomain = null;
	}

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-6">
			<WorkspacePageHeader label="Settings" clerkOrgId={workspace.clerk_org_id} />

			<FadeIn>
				<div className="flex flex-wrap gap-1.5">
					<Button asChild variant="outline" size="sm"><Link href={integrationsHref}>Integrations</Link></Button>
					<Button asChild variant="outline" size="sm"><Link href={driveHref}>Drive Storage</Link></Button>
					<Button asChild variant="outline" size="sm"><Link href={domainsHref}>Domains</Link></Button>
					<Button asChild variant="outline" size="sm"><Link href={membersHref}>Members</Link></Button>
				</div>
			</FadeIn>

			<FadeIn delay={0.1}>
				<WorkspaceSettingsClient
					workspace={workspace.slug}
					workspaceId={workspace.id}
					rootPreviewDomain={rootPreviewDomain}
					initialLogoUrl={workspace.logo_url}
					initialBrandColor={workspace.brand_color}
					initialHideBranding={Boolean(workspace.hide_oxom_branding)}
				/>
			</FadeIn>
		</main>
	);
}
