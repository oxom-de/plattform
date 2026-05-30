"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	Alert02Icon,
	CheckmarkCircle02Icon,
	Delete02Icon,
	GlobeIcon,
	Loading03Icon,
	PlusSignIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type WorkspaceDomain = {
	id: string;
	hostname: string;
	workspace_id: string;
	verified: boolean;
	primary: boolean;
	type: "CUSTOM" | "SUBDOMAIN" | "PATH";
	purpose:
		| "PLATFORM_SUBDOMAIN"
		| "CUSTOM_DASHBOARD"
		| "ROOT_PREVIEW"
		| "LINK_IN_BIO";
	vercel_domain_id: string | null;
	verification_status: string | null;
	last_verification_at: string | null;
	created_at: string;
	updated_at: string;
};

interface WorkspaceDomainsSettingsClientProps {
	workspaceId: string;
	workspaceSlug: string;
	currentHostname: string;
	initialDomains: WorkspaceDomain[];
}

function prettyStatus(domain: WorkspaceDomain | null): string {
	if (!domain) return "not_set";
	if (domain.verified) return "verified";
	if (domain.verification_status) return domain.verification_status;
	return "pending";
}

export function WorkspaceDomainsSettingsClient({
	workspaceId,
	workspaceSlug,
	currentHostname,
	initialDomains,
}: WorkspaceDomainsSettingsClientProps) {
	const [domains, setDomains] = useState<WorkspaceDomain[]>(initialDomains);
	const [rootDomainInput, setRootDomainInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [isRemoving, setIsRemoving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const platformDomain = `${workspaceSlug}.oxom.de`;

	const rootPreview = useMemo(
		() => domains.find((domain) => domain.purpose === "ROOT_PREVIEW") || null,
		[domains],
	);

	const customDashboard = useMemo(() => {
		const customDomains = domains.filter(
			(domain) => domain.purpose === "CUSTOM_DASHBOARD",
		);
		return (
			customDomains.find((domain) => domain.primary) || customDomains[0] || null
		);
	}, [domains]);

	const suggestedRootDomain = rootPreview?.hostname || rootDomainInput;

	async function refreshDomains() {
		setIsLoading(true);
		try {
			const response = await fetch(`/api/workspaces/${workspaceId}/domains`, {
				method: "GET",
			});
			const payload = (await response.json().catch(() => ({}))) as {
				domains?: WorkspaceDomain[];
				error?: string;
			};

			if (!response.ok) {
				throw new Error(
					payload.error || "Domains konnten nicht geladen werden.",
				);
			}

			setDomains(Array.isArray(payload.domains) ? payload.domains : []);
		} catch (refreshError) {
			setError(
				refreshError instanceof Error
					? refreshError.message
					: "Domains konnten nicht geladen werden.",
			);
		} finally {
			setIsLoading(false);
		}
	}

	async function setupDashboardDomain() {
		const rootDomain = (rootDomainInput || rootPreview?.hostname || "").trim();
		if (!rootDomain) {
			setError("Bitte Root Domain eingeben (z. B. simon-cabe.com).");
			return;
		}

		setIsSubmitting(true);
		setError(null);
		setMessage(null);

		try {
			const response = await fetch(
				`/api/workspaces/${workspaceId}/domains/dashboard`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ rootDomain }),
				},
			);

			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				domain?: WorkspaceDomain;
				dnsInstructions?: Array<{
					type: string;
					domain: string;
					value: string;
				}>;
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(
					payload.error || "Custom Domain konnte nicht eingerichtet werden.",
				);
			}

			const instructionHint = payload.dnsInstructions?.length
				? ` (${payload.dnsInstructions.length} DNS-Record(s) prüfen)`
				: "";
			setMessage(
				`Domain hinzugefügt: ${payload.domain?.hostname || `dashboard.${rootDomain}`}${instructionHint}`,
			);
			await refreshDomains();
		} catch (setupError) {
			setError(
				setupError instanceof Error
					? setupError.message
					: "Custom Domain konnte nicht eingerichtet werden.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function verifyDashboardDomain() {
		if (!customDashboard) {
			setError("Keine Custom Dashboard Domain vorhanden.");
			return;
		}

		setIsVerifying(true);
		setError(null);
		setMessage(null);

		try {
			const response = await fetch(
				`/api/workspaces/${workspaceId}/domains/verify`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ hostname: customDashboard.hostname }),
				},
			);

			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				verified?: boolean;
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(payload.error || "Verifizierung fehlgeschlagen.");
			}

			setMessage(
				payload.verified
					? "Domain ist verifiziert."
					: "Verifizierung läuft noch. DNS prüfen.",
			);
			await refreshDomains();
		} catch (verifyError) {
			setError(
				verifyError instanceof Error
					? verifyError.message
					: "Verifizierung fehlgeschlagen.",
			);
		} finally {
			setIsVerifying(false);
		}
	}

	async function removeDashboardDomain() {
		if (!customDashboard) {
			setError("Keine Custom Dashboard Domain vorhanden.");
			return;
		}

		setIsRemoving(true);
		setError(null);
		setMessage(null);

		try {
			const response = await fetch(`/api/workspaces/${workspaceId}/domains`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hostname: customDashboard.hostname }),
			});

			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(
					payload.error || "Domain konnte nicht entfernt werden.",
				);
			}

			setMessage(`Domain entfernt: ${customDashboard.hostname}`);
			await refreshDomains();
		} catch (removeError) {
			setError(
				removeError instanceof Error
					? removeError.message
					: "Domain konnte nicht entfernt werden.",
			);
		} finally {
			setIsRemoving(false);
		}
	}

	return (
		<div className="space-y-6">
			<Card className="overflow-hidden rounded-lg border border-border bg-card/50 shadow-sm">
				<CardHeader className="border-b border-border/60 bg-muted/30 pb-3">
					<CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
						<HugeiconsIcon icon={GlobeIcon} size={20} />
						Standard Domain (CORE)
					</CardTitle>
					<CardDescription>
						Automatisch aktiv über die Plattform-Wildcard-Domain.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 pt-6">
					<div className="rounded-sm border border-border/80 bg-muted/20 px-3 py-2">
						<p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
							Workspace Domain
						</p>
						<p className="mt-1 text-sm font-medium">{platformDomain}</p>
					</div>
					<Badge variant="secondary" className="rounded-sm">
						aktiv
					</Badge>
				</CardContent>
			</Card>

			<Card className="overflow-hidden rounded-lg border border-border bg-card/50 shadow-sm">
				<CardHeader className="border-b border-border/60 bg-muted/30 pb-3">
					<CardTitle className="text-xl font-semibold tracking-tight">
						Preview Root Domain (UI only)
					</CardTitle>
					<CardDescription>
						Nur für Vorschau/Copy. Diese Domain wird nicht für Tenant-Routing
						verwendet.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 pt-6">
					<div className="rounded-sm border border-border/80 bg-muted/20 px-3 py-2">
						<p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
							Root Preview
						</p>
						<p className="mt-1 text-sm font-medium">
							{rootPreview?.hostname || "nicht gesetzt"}
						</p>
					</div>
					<p className="text-sm text-muted-foreground">
						Nutze deine eigene Domain wie z. B.{" "}
						<code className="text-xs">
							dashboard.{rootPreview?.hostname || "example.com"}
						</code>
					</p>
				</CardContent>
			</Card>

			<Card className="overflow-hidden rounded-lg border border-border bg-card/50 shadow-sm">
				<CardHeader className="border-b border-border/60 bg-muted/30 pb-3">
					<CardTitle className="text-xl font-semibold tracking-tight">
						Custom Domain (ELITE)
					</CardTitle>
					<CardDescription>
						Hängt eine Dashboard-Domain an das Vercel-Projekt und verifiziert
						DNS/SSL.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					<div className="flex flex-col gap-3 md:flex-row">
						<Input
							value={rootDomainInput}
							onChange={(event) => setRootDomainInput(event.target.value)}
							placeholder={suggestedRootDomain || "simon-cabe.com"}
							aria-label="Root Domain eingeben"
						/>
						<Button onClick={setupDashboardDomain} disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<HugeiconsIcon
										icon={Loading03Icon}
										size={16}
										className="mr-2 animate-spin"
									/>
									Einrichten...
								</>
							) : (
								<>
									<HugeiconsIcon
										icon={PlusSignIcon}
										size={16}
										className="mr-2"
									/>
									Jetzt einrichten
								</>
							)}
						</Button>
					</div>

					<div className="rounded-sm border border-border/80 bg-muted/20 px-3 py-2">
						<p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
							Current Hostname
						</p>
						<p className="mt-1 text-sm font-medium">{currentHostname}</p>
					</div>

					<div className="space-y-2 rounded-sm border border-border/80 bg-muted/20 p-3">
						<div className="flex items-center justify-between gap-2">
							<p className="text-sm font-medium">
								Aktueller Dashboard-Domain Status
							</p>
							<div className="flex items-center gap-2">
								{isLoading ? (
									<HugeiconsIcon
										icon={Loading03Icon}
										size={16}
										className="animate-spin text-muted-foreground"
									/>
								) : null}
								<Button
									variant="outline"
									size="sm"
									onClick={() => void refreshDomains()}
									disabled={isLoading}
								>
									Aktualisieren
								</Button>
							</div>
						</div>

						{!customDashboard ? (
							<p className="text-sm text-muted-foreground">
								Noch keine Custom Dashboard Domain eingerichtet.
							</p>
						) : (
							<div className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<Link
										href={`https://${customDashboard.hostname}`}
										target="_blank"
										rel="noopener noreferrer"
										className="break-all text-sm font-medium underline-offset-2 hover:underline"
									>
										{customDashboard.hostname}
									</Link>
									<div className="flex items-center gap-2">
										<Badge
											variant={
												customDashboard.verified ? "secondary" : "outline"
											}
											className="rounded-sm"
										>
											{prettyStatus(customDashboard)}
										</Badge>
										{customDashboard.verified ? (
											<HugeiconsIcon
												icon={CheckmarkCircle02Icon}
												size={16}
												className="text-emerald-500"
											/>
										) : null}
									</div>
								</div>

								<div className="flex flex-wrap gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={verifyDashboardDomain}
										disabled={isVerifying}
									>
										{isVerifying ? (
											<HugeiconsIcon
												icon={Loading03Icon}
												size={16}
												className="mr-2 animate-spin"
											/>
										) : (
											<HugeiconsIcon
												icon={Alert02Icon}
												size={16}
												className="mr-2"
											/>
										)}
										Verify
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={removeDashboardDomain}
										disabled={isRemoving}
									>
										{isRemoving ? (
											<HugeiconsIcon
												icon={Loading03Icon}
												size={16}
												className="mr-2 animate-spin"
											/>
										) : (
											<HugeiconsIcon
												icon={Delete02Icon}
												size={16}
												className="mr-2"
											/>
										)}
										Remove
									</Button>
								</div>
							</div>
						)}
					</div>

					<p className="text-xs text-muted-foreground">
						Hinweis: Setze optional Redirects für Apex/www auf deine
						Dashboard-Domain, damit Nutzer konsistent auf
						<code className="mx-1 text-[11px]">
							dashboard.&lt;deine-domain&gt;
						</code>
						landen.
					</p>

					{error ? <p className="text-sm text-red-500">{error}</p> : null}
					{message ? (
						<p className="text-sm text-muted-foreground">{message}</p>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
