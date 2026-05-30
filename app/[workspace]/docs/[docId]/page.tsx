import { notFound } from "next/navigation";
import { getWorkspaceFromHeaders, getWorkspaceBasePathFromHeaders } from "@/lib/tenant/get-workspace";
import { getDoc } from "@/lib/docs/actions";
import { WorkspaceDocEditorClient } from "@/components/workspace/workspace-doc-editor-client";

export default async function WorkspaceDocPage({
	params,
}: {
	params: Promise<{ docId: string }>;
}) {
	const { docId } = await params;
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	const [doc, basePath] = await Promise.all([
		getDoc(docId),
		getWorkspaceBasePathFromHeaders(workspace.slug),
	]);

	if (!doc || doc.workspace_id !== workspace.id) notFound();

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-6">
			<WorkspaceDocEditorClient
				doc={doc}
				workspaceId={workspace.id}
				basePath={basePath}
			/>
		</main>
	);
}
