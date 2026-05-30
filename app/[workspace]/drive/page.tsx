import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DriveView } from "@/components/drive/drive-view";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { getWorkspaceFromHeaders } from "@/lib/tenant/get-workspace";

export const metadata: Metadata = {
	title: "Drive",
	description: "Das Sharepoint zwischen Creator und Cutter. Assets ablegen, bearbeiten, teilen.",
};

export default async function DrivePage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) notFound();

	return (
		<main className="flex min-h-0 flex-1 flex-col">
			<WorkspacePageHeader label="Drive" clerkOrgId={workspace.clerk_org_id} />
			<DriveView />
		</main>
	);
}
