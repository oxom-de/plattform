import { notFound } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import {
	getWorkspaceBasePathFromHeaders,
	getWorkspaceFromHeaders,
} from "@/lib/tenant/get-workspace";
import { getWorkspaceIntegrationRecord } from "@/lib/integrations/workspace-integrations";
import { DriveSettingsClient } from "./drive-settings-client";

export default async function DriveSettingsPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	const basePath = await getWorkspaceBasePathFromHeaders(workspace.slug);
	const settingsHref = basePath ? `${basePath}/settings` : "/settings";

	const integration = await getWorkspaceIntegrationRecord(workspace.id, "r2");
	const meta = integration?.metadata as Record<string, string> | null | undefined;

	const existing = integration
		? {
				connected: true,
				bucketName: meta?.bucketName ?? "",
				publicBaseUrl: meta?.publicBaseUrl ?? "",
				endpoint: meta?.endpoint ?? "",
			}
		: null;

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-6">
			<WorkspacePageHeader
				label="Drive Storage"
				clerkOrgId={workspace.clerk_org_id}
				breadcrumbs={[{ label: "Settings", href: settingsHref }]}
			/>
			<FadeIn>
				<div className="space-y-2 max-w-xl">
					<p className="text-sm text-muted-foreground">
						Verbinde deinen eigenen Cloudflare R2 Bucket (oder einen S3-kompatiblen
						Anbieter). Credentials werden AES-256-GCM verschlüsselt gespeichert.
					</p>
				</div>
				<div className="mt-6">
					<DriveSettingsClient workspaceId={workspace.id} existing={existing} />
				</div>
			</FadeIn>
		</main>
	);
}
