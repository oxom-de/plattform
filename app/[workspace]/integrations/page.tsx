import { notFound, redirect } from "next/navigation";
import { getWorkspaceBasePathFromHeaders, getWorkspaceFromHeaders } from "@/lib/tenant/get-workspace";

// Standalone tools page — redirect to settings/integrations which shows Dub.
export default async function WorkspaceToolsPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	const basePath = await getWorkspaceBasePathFromHeaders(workspace.slug);
	redirect(basePath ? `${basePath}/settings/integrations` : "/settings/integrations");
}
