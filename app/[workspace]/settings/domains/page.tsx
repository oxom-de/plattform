import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import {
	getWorkspaceBasePathFromHeaders,
} from "@/lib/tenant/get-workspace";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Domain } from "@/lib/db/types";
import { getWorkspaceFromHeaders } from "@/lib/tenant/get-workspace";
import { listDomainsForWorkspace } from "@/lib/tenant/loaders";

const BLOCKED_HOSTNAMES = new Set([
	"oxom.be",
	"oxom.at",
	"oxom.it",
	"oxom.lu",
	"oxom.nl",
	"www.oxom.de",
]);

function isVisibleWorkspaceDomain(hostname: string, workspaceSlug: string) {
	const normalized = hostname.trim().toLowerCase();
	if (!normalized) return false;
	if (BLOCKED_HOSTNAMES.has(normalized)) return false;
	if (normalized.endsWith(".vercel.app")) return false;
	if (normalized === `${workspaceSlug}.oxom.de`) return true;
	if (normalized.endsWith(".oxom.de")) return false;
	return true;
}

function PurposeBadge({ purpose }: { purpose: Domain["purpose"] }) {
	if (purpose === "PLATFORM_SUBDOMAIN") {
		return <Badge variant="secondary">Platform</Badge>;
	}
	if (purpose === "ROOT_PREVIEW") {
		return <Badge variant="outline">Root Preview</Badge>;
	}
	if (purpose === "LINK_IN_BIO") {
		return <Badge variant="outline">Link in Bio</Badge>;
	}
	return <Badge variant="outline">Custom Dashboard</Badge>;
}

export default async function WorkspaceDomainsSettingsPage() {
	const workspace = await getWorkspaceFromHeaders();
	if (!workspace) {
		notFound();
	}

	const basePath = await getWorkspaceBasePathFromHeaders(workspace.slug);
	const settingsHref = basePath ? `${basePath}/settings` : "/settings";

	let domains: Domain[] = [];
	let loadError: string | null = null;

	try {
		domains = await listDomainsForWorkspace(workspace.id);
	} catch (error) {
		loadError =
			error instanceof Error
				? error.message
				: "Domains konnten nicht geladen werden.";
	}

	const standardDomain = `${workspace.slug}.oxom.de`;
	const rootDomain = workspace.root_domain?.trim().toLowerCase() || null;
	const rootPreview = rootDomain ? `dashboard.${rootDomain}` : null;
	const visibleDomains = domains.filter((domain) =>
		isVisibleWorkspaceDomain(domain.hostname, workspace.slug),
	);
	const customDashboardDomain = visibleDomains.find(
		(domain) => domain.purpose === "CUSTOM_DASHBOARD",
	);

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-6">
			<WorkspacePageHeader
				label="Domains"
				clerkOrgId={workspace.clerk_org_id}
				breadcrumbs={[{ label: "Settings", href: settingsHref }]}
			/>

			<section className="flex min-h-0 flex-1 flex-col space-y-4">
				<FadeIn delay={0.05}>
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Standard Domain</CardTitle>
							<CardDescription>
								Diese Workspace-Subdomain ist immer aktiv.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
								<code className="font-mono text-sm">{standardDomain}</code>
								<Badge variant="secondary">Aktiv</Badge>
							</div>
						</CardContent>
					</Card>
				</FadeIn>

				<FadeIn delay={0.1}>
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Root Domain</CardTitle>
							<CardDescription>
								UI-Referenz für die Ziel-Domain. Nicht für Tenant-Routing verwendet.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
								<p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
									Root Domain
								</p>
								<p className="font-mono text-sm font-medium">
									{rootDomain || "Nicht gesetzt"}
								</p>
							</div>
							<div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
								<p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
									Dashboard Preview
								</p>
								<p className="font-mono text-sm font-medium">
									{rootPreview || "z. B. dashboard.deinedomain.com"}
								</p>
							</div>
						</CardContent>
					</Card>
				</FadeIn>

				<FadeIn delay={0.15}>
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Custom Dashboard Domain</CardTitle>
							<CardDescription>
								Für Routing relevant: <code className="text-xs">purpose=CUSTOM_DASHBOARD</code> und{" "}
								<code className="text-xs">verified=true</code>.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{customDashboardDomain ? (
								<div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
									<code className="font-mono text-sm">
										{customDashboardDomain.hostname}
									</code>
									<Badge
										variant={customDashboardDomain.verified ? "secondary" : "outline"}
									>
										{customDashboardDomain.verified ? "verified" : "pending"}
									</Badge>
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									Keine Custom Dashboard Domain hinterlegt.
								</p>
							)}
						</CardContent>
					</Card>
				</FadeIn>

				<FadeIn delay={0.2}>
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Alle Domain-Einträge</CardTitle>
							<CardDescription>
								Rohdaten aus <code className="text-xs">public.domains</code> für diesen Workspace.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{loadError ? (
								<p className="text-sm text-destructive">{loadError}</p>
							) : visibleDomains.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Keine Domain-Einträge gefunden.
								</p>
							) : (
								<div className="overflow-x-auto rounded-xl border border-border/50">
									<Table>
										<TableHeader>
											<TableRow className="border-border/50">
												<TableHead className="font-medium">Hostname</TableHead>
												<TableHead className="font-medium">Purpose</TableHead>
												<TableHead className="font-medium">Type</TableHead>
												<TableHead className="font-medium">Verified</TableHead>
												<TableHead className="font-medium">Primary</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{visibleDomains.map((domain) => (
												<TableRow key={domain.id} className="border-border/50">
													<TableCell className="font-mono text-xs sm:text-sm">
														{domain.hostname}
													</TableCell>
													<TableCell>
														<PurposeBadge purpose={domain.purpose} />
													</TableCell>
													<TableCell className="font-mono text-xs">
														{domain.type}
													</TableCell>
													<TableCell>
														<Badge
															variant={domain.verified ? "secondary" : "outline"}
														>
															{domain.verified ? "true" : "false"}
														</Badge>
													</TableCell>
													<TableCell>
														{domain.primary ? "true" : "false"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</FadeIn>
			</section>
		</main>
	);
}
