import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { WorkspaceNotesClient } from "@/components/workspace/workspace-notes-client";
import { getWorkspaceFromHeaders } from "@/lib/tenant/get-workspace";

export default async function WorkspaceNotesPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-6">
			<WorkspacePageHeader label="Notes" clerkOrgId={workspace.clerk_org_id} />
			<WorkspaceNotesClient
				workspaceId={workspace.id}
				workspaceSlug={workspace.slug}
			/>
		</main>
	);
}
