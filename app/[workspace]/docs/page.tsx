import { notFound } from "next/navigation";
import { getWorkspaceFromHeaders, getWorkspaceBasePathFromHeaders } from "@/lib/tenant/get-workspace";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { WorkspaceDocsClient } from "@/components/workspace/workspace-docs-client";
import { listDocs } from "@/lib/docs/actions";

export default async function WorkspaceDocsPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	const basePath = await getWorkspaceBasePathFromHeaders(workspace.slug);
	const docs = await listDocs(workspace.id);

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-6">
			<WorkspacePageHeader label="Docs" clerkOrgId={workspace.clerk_org_id} />
			<WorkspaceDocsClient
				docs={docs}
				workspaceId={workspace.id}
				basePath={basePath}
			/>
		</main>
	);
}
