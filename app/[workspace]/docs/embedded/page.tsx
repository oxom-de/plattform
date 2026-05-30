import { notFound } from "next/navigation";
import { getWorkspaceFromHeaders } from "@/lib/tenant/get-workspace";
import { listDocs } from "@/lib/docs/actions";
import { WorkspaceDocsEmbeddedClient } from "@/components/workspace/workspace-docs-embedded-client";

export default async function WorkspaceDocsEmbeddedPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	const docs = await listDocs(workspace.id);

	return (
		<main className="flex min-h-screen flex-col bg-background">
			<WorkspaceDocsEmbeddedClient
				docs={docs}
				workspaceId={workspace.id}
				workspaceSlug={workspace.slug}
			/>
		</main>
	);
}
