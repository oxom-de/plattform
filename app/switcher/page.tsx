import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

type WorkspaceInfo = {
	slug: string;
	name: string;
};

async function getUserWorkspaces(userId: string): Promise<WorkspaceInfo[]> {
	const supabase = createServerSupabaseAdminClient();
	const { data } = await supabase
		.from("workspace_memberships")
		.select("workspace:workspaces(slug, name)")
		.eq("user_id", userId);

	if (!data) return [];

	return (data as unknown as { workspace: WorkspaceInfo | null }[])
		.map((row) => row.workspace)
		.filter((w): w is WorkspaceInfo => w !== null);
}

export default async function SwitcherPage() {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	const workspaces = await getUserWorkspaces(userId);

	if (workspaces.length === 0) redirect("/unauthorized");
	if (workspaces.length === 1) redirect(`/${workspaces[0].slug}`);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="w-full max-w-sm space-y-4 p-6">
				<h1 className="text-center text-lg font-semibold">Workspace wählen</h1>
				<div className="space-y-2">
					{workspaces.map((ws) => (
						<Link
							key={ws.slug}
							href={`/${ws.slug}`}
							className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 px-4 py-3 transition-colors hover:bg-accent"
						>
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
								{ws.name.charAt(0).toUpperCase()}
							</div>
							<div>
								<p className="text-sm font-medium">{ws.name}</p>
								<p className="text-xs text-muted-foreground">/{ws.slug}</p>
							</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
