import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons-pro/core-twotone-rounded";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
	FadeIn,
	StaggerContainer,
	StaggerItem,
} from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isLinkInBioEnabledForWorkspace } from "@/lib/feature-flags";
import {
	getWorkspaceBasePathFromHeaders,
	getWorkspaceFromHeaders,
} from "@/lib/tenant/get-workspace";
import { resolveWorkspaceByPathSlug } from "@/lib/tenant/resolve-workspace";

function toWorkspacePath(basePath: string, path?: string): string {
	const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";
	if (!basePath) return normalizedPath || "/";
	return normalizedPath ? `${basePath}${normalizedPath}` : basePath;
}

interface WorkspaceDashboardPageProps {
	params: Promise<{ workspace: string }>;
}

export default async function WorkspaceDashboardPage({
	params,
}: WorkspaceDashboardPageProps) {
	const { workspace: requestedWorkspaceSlug } = await params;
	const normalizedSlug = requestedWorkspaceSlug.trim().toLowerCase();

	const workspace =
		(await getWorkspaceFromHeaders()) ||
		(await resolveWorkspaceByPathSlug(normalizedSlug));
	if (!workspace) notFound();

	const basePath = await getWorkspaceBasePathFromHeaders(workspace.slug);
	const linkInBioEnabled = await isLinkInBioEnabledForWorkspace(workspace.id);

	const modules = [
		{
			title: "Drive",
			description: "Dateien speichern, teilen und gemeinsam verwalten.",
			href: toWorkspacePath(basePath, "drive"),
		},
		{
			title: "Notes",
			description: "Realtime-Notizen mit Timestamps und schneller Übergabe.",
			href: toWorkspacePath(basePath, "notes"),
		},
		{
			title: "Docs",
			description: "Skripte, Briefings und Dokumentation an einem Ort.",
			href: toWorkspacePath(basePath, "docs"),
		},
		...(linkInBioEnabled
			? [
					{
						title: "Link in Bio",
						description: "Öffentlicher Link-Hub unter deiner eigenen Domain.",
						href: toWorkspacePath(basePath, "links"),
					},
				]
			: []),
	];

	const utilityLinks = [
		{ label: "Integrations", href: toWorkspacePath(basePath, "settings/integrations") },
		{ label: "Drive Storage", href: toWorkspacePath(basePath, "settings/drive") },
		{ label: "Domains", href: toWorkspacePath(basePath, "settings/domains") },
		{ label: "Members", href: toWorkspacePath(basePath, "settings/members") },
	];

	return (
		<main className="mx-auto w-full max-w-6xl space-y-8">
			<FadeIn>
				<section className="space-y-2">
					<h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
						{workspace.name}
					</h1>
					<p className="text-sm text-muted-foreground">
						Drive · Notes · Docs · Link in Bio
					</p>
				</section>
			</FadeIn>

			<StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{modules.map((mod, index) => (
					<StaggerItem key={mod.title}>
						<Card className="border-border/80 bg-card/70">
							<CardHeader className="space-y-3">
								<p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
									Modul {index + 1}
								</p>
								<CardTitle className="text-lg">{mod.title}</CardTitle>
								<CardContent className="p-0 text-sm text-muted-foreground">
									{mod.description}
								</CardContent>
							</CardHeader>
							<CardContent>
								<Button asChild variant="outline" className="w-full justify-between">
									<Link href={mod.href}>
										Öffnen
										<HugeiconsIcon icon={ArrowRight01Icon} size={16} className="h-4 w-4" />
									</Link>
								</Button>
							</CardContent>
						</Card>
					</StaggerItem>
				))}
			</StaggerContainer>

			<FadeIn delay={0.1}>
				<Card className="border-border/80 bg-card/70 shadow-none">
					<CardHeader className="space-y-1">
						<CardTitle className="text-base">Settings</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						{utilityLinks.map((item) => (
							<Button key={item.href} asChild variant="outline" size="sm">
								<Link href={item.href}>{item.label}</Link>
							</Button>
						))}
					</CardContent>
				</Card>
			</FadeIn>
		</main>
	);
}
