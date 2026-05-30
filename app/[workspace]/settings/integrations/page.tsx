import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FadeIn, StaggerContainer } from "@/components/motion/fade-in";
import {
	DubProviderCard,
	DubConnectBanner,
} from "@/components/workspace/integration-provider-card";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { listWorkspaceIntegrations } from "@/lib/integrations/workspace-integrations";
import {
	getWorkspaceBasePathFromHeaders,
	getWorkspaceFromHeaders,
} from "@/lib/tenant/get-workspace";

export default async function WorkspaceSettingsIntegrationsPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	const basePath = await getWorkspaceBasePathFromHeaders(workspace.slug);
	const settingsHref = basePath ? `${basePath}/settings` : "/settings";

	const integrations = await listWorkspaceIntegrations(workspace.id);
	const activeIntegrations = integrations.filter((i) => i.status === "active");
	const integrationMap = Object.fromEntries(activeIntegrations.map((i) => [i.provider, i]));

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-6">
			<WorkspacePageHeader
				label="Integrations"
				clerkOrgId={workspace.clerk_org_id}
				breadcrumbs={[{ label: "Settings", href: settingsHref }]}
			/>

			<Suspense><DubConnectBanner /></Suspense>

			<StaggerContainer className="flex flex-col gap-4">
				<FadeIn>
					<DubProviderCard workspaceId={workspace.id} integration={integrationMap["dub"] ?? null} />
				</FadeIn>
			</StaggerContainer>
		</main>
	);
}
