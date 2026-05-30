import { notFound } from "next/navigation";
import { WorkspaceNotesClient } from "@/components/workspace/workspace-notes-client";
import { getWorkspaceFromHeaders } from "@/lib/tenant/get-workspace";

export default async function WorkspaceNotesEmbededPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) {
		notFound();
	}

	return (
		<main className="flex min-h-0 flex-1 flex-col">
			<section className="flex min-h-0 flex-1 flex-col">
				<WorkspaceNotesClient
					workspaceId={workspace.id}
					workspaceSlug={workspace.slug}
				/>
			</section>
		</main>
	);
}
