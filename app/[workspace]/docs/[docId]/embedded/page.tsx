import { notFound } from "next/navigation";
import { getWorkspaceFromHeaders } from "@/lib/tenant/get-workspace";
import { getDoc } from "@/lib/docs/actions";
import { WorkspaceDocEmbeddedEditorClient } from "@/components/workspace/workspace-doc-embedded-editor-client";

export default async function WorkspaceDocEmbeddedPage({
	params,
}: {
	params: Promise<{ docId: string }>;
}) {
	const { docId } = await params;
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	const doc = await getDoc(docId);
	if (!doc || doc.workspace_id !== workspace.id) notFound();

	return (
		<main className="flex min-h-screen flex-col bg-background">
			<WorkspaceDocEmbeddedEditorClient
				doc={doc}
				workspaceId={workspace.id}
				workspaceSlug={workspace.slug}
			/>
		</main>
	);
}
