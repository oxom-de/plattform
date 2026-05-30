"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	CheckmarkCircle02Icon,
	Delete02Icon,
	GlobeIcon,
	Loading03Icon,
	PlusSignIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface WorkspaceSettingsClientProps {
	workspace: string;
	workspaceId: string;
	rootPreviewDomain?: string | null;
	initialLogoUrl?: string | null;
	initialBrandColor?: string | null;
	initialHideBranding?: boolean;
}

interface DomainVerificationRecord {
	type?: string;
	domain?: string;
	value?: string;
	reason?: string;
}

interface WorkspaceDomain {
	name: string;
	verified?: boolean;
	verification?: DomainVerificationRecord[];
}

interface DnsInstruction {
	type: string;
	domain: string;
	value: string;
}

export function WorkspaceSettingsClient({
	workspace,
	workspaceId,
	rootPreviewDomain,
	initialLogoUrl,
	initialBrandColor,
	initialHideBranding,
}: WorkspaceSettingsClientProps) {
	const [domainInput, setDomainInput] = useState("");
	const [domains, setDomains] = useState<WorkspaceDomain[]>([]);
	const [isLoadingDomains, setIsLoadingDomains] = useState(false);
	const [isSubmittingDomain, setIsSubmittingDomain] = useState(false);
	const [dnsInstructions, setDnsInstructions] = useState<DnsInstruction[]>([]);
	const [brandingMessage, setBrandingMessage] = useState<string | null>(null);
	const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
	const [brandColor, setBrandColor] = useState(initialBrandColor || "#3B82F6");
	const [hideBranding, setHideBranding] = useState(
		Boolean(initialHideBranding),
	);
	const [isSavingBranding, setIsSavingBranding] = useState(false);
	const [isUploadingLogo, setIsUploadingLogo] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const domainPlaceholder = rootPreviewDomain || `${workspace}.com`;

	async function loadDomains() {
		setIsLoadingDomains(true);
		setError(null);

		try {
			const response = await fetch(
				`/api/domains?team=${encodeURIComponent(workspace)}`,
				{ method: "GET" },
			);
			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				domains?: WorkspaceDomain[];
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(
					payload.error || "Domains konnten nicht geladen werden.",
				);
			}

			setDomains(Array.isArray(payload.domains) ? payload.domains : []);
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Domains konnten nicht geladen werden.",
			);
			setDomains([]);
		} finally {
			setIsLoadingDomains(false);
		}
	}

	useEffect(() => {
		void loadDomains();
	}, [workspace]);

	async function connectDomain() {
		const domain = domainInput.trim().toLowerCase();
		if (!domain) {
			setError("Bitte Domain eingeben.");
			return;
		}

		setIsSubmittingDomain(true);
		setError(null);
		setMessage(null);

		try {
			const response = await fetch("/api/domains", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ team: workspace, domain }),
			});

			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				dnsInstructions?: DnsInstruction[];
				status?: string;
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(
					payload.error || "Domain konnte nicht hinzugefügt werden.",
				);
			}

			setDomainInput("");
			setDnsInstructions(
				Array.isArray(payload.dnsInstructions) ? payload.dnsInstructions : [],
			);
			setMessage(
				payload.status === "connected"
					? `Domain verbunden: ${domain}`
					: `Domain hinzugefügt: ${domain}. Bitte DNS-Records setzen.`,
			);
			await loadDomains();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Domain konnte nicht hinzugefügt werden.",
			);
		} finally {
			setIsSubmittingDomain(false);
		}
	}

	async function verifyDomain(domain: string) {
		setError(null);
		setMessage(null);

		try {
			const response = await fetch("/api/domains", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ team: workspace, domain }),
			});

			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				dnsInstructions?: DnsInstruction[];
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(
					payload.error || "Domain-Verifizierung fehlgeschlagen.",
				);
			}

			setDnsInstructions(
				Array.isArray(payload.dnsInstructions) ? payload.dnsInstructions : [],
			);
			setMessage(`Verifizierung gestartet: ${domain}`);
			await loadDomains();
		} catch (verifyError) {
			setError(
				verifyError instanceof Error
					? verifyError.message
					: "Domain-Verifizierung fehlgeschlagen.",
			);
		}
	}

	async function removeDomain(domain: string) {
		setError(null);
		setMessage(null);

		try {
			const response = await fetch("/api/domains", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ team: workspace, domain }),
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

			setMessage(`Domain entfernt: ${domain}`);
			setDnsInstructions([]);
			await loadDomains();
		} catch (removeError) {
			setError(
				removeError instanceof Error
					? removeError.message
					: "Domain konnte nicht entfernt werden.",
			);
		}
	}

	async function saveBranding() {
		setIsSavingBranding(true);
		setBrandingMessage(null);
		setError(null);

		try {
			const response = await fetch(`/api/workspaces/${workspaceId}/settings`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					logo_url: logoUrl.trim() || null,
					brand_color: brandColor.trim() || null,
					hide_oxom_branding: hideBranding,
				}),
			});

			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(
					payload.error || "Branding konnte nicht gespeichert werden.",
				);
			}

			setBrandingMessage("Branding gespeichert.");
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Branding konnte nicht gespeichert werden.",
			);
		} finally {
			setIsSavingBranding(false);
		}
	}

	async function uploadLogo(file: File) {
		setIsUploadingLogo(true);
		setError(null);

		try {
			const query = new URLSearchParams({
				mode: "direct",
				creatorSlug: workspace,
				desiredFilename: file.name || "logo.png",
				visibility: "public",
				assetKind: "file",
			});

			const response = await fetch(`/api/upload?${query.toString()}`, {
				method: "POST",
				headers: {
					"Content-Type": file.type || "application/octet-stream",
				},
				body: file,
			});

			const payload = (await response.json().catch(() => ({}))) as {
				publicUrl?: string | null;
				error?: string;
			};

			if (!response.ok) {
				throw new Error(payload.error || "Logo-Upload fehlgeschlagen.");
			}

			const nextLogoUrl = payload.publicUrl?.trim();
			if (!nextLogoUrl) {
				throw new Error(
					"Upload erfolgreich, aber keine öffentliche URL erhalten.",
				);
			}

			setLogoUrl(nextLogoUrl);
			setBrandingMessage(
				"Logo hochgeladen. Speichern, um es im Workspace zu übernehmen.",
			);
		} catch (uploadError) {
			setError(
				uploadError instanceof Error
					? uploadError.message
					: "Logo-Upload fehlgeschlagen.",
			);
		} finally {
			setIsUploadingLogo(false);
		}
	}

	return (
		<div className="space-y-4">
			{/* Workspace URL */}
			<Card>
				<CardHeader>
					<CardTitle>Workspace URL</CardTitle>
					<CardDescription>
						Aktueller Slug für Routen und API-Scoping.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 px-4 py-3">
						<div>
							<p className="mb-0.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
								Slug
							</p>
							<p className="font-mono text-sm font-semibold">/{workspace}</p>
						</div>
						<Badge variant="secondary">Read only</Badge>
					</div>
				</CardContent>
			</Card>

			{/* Branding */}
			<Card>
				<CardHeader>
					<CardTitle>Workspace Branding</CardTitle>
					<CardDescription>
						Logo, Brand-Farbe und Branding-Sichtbarkeit.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="space-y-2">
						<p className="text-sm font-medium">Logo URL</p>
						<Input
							value={logoUrl}
							onChange={(event) => setLogoUrl(event.target.value)}
							placeholder="https://assets.oxom.de/workspace/logo.png"
						/>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<label className="cursor-pointer rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-muted/60">
							{isUploadingLogo ? "Uploading..." : "Logo hochladen"}
							<input
								type="file"
								accept="image/*"
								className="hidden"
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (!file) return;
									void uploadLogo(file);
									event.currentTarget.value = "";
								}}
								disabled={isUploadingLogo}
							/>
						</label>
						{logoUrl ? (
							<img
								src={logoUrl}
								alt="Workspace Logo"
								className="h-10 w-10 rounded-lg border border-border/60 object-cover"
							/>
						) : null}
					</div>

					<div className="space-y-2">
						<p className="text-sm font-medium">Brand Farbe</p>
						<div className="flex items-center gap-3">
							<input
								type="color"
								value={brandColor}
								onChange={(event) => setBrandColor(event.target.value)}
								className="h-10 w-14 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
							/>
							<Input
								value={brandColor}
								onChange={(event) => setBrandColor(event.target.value)}
							/>
						</div>
					</div>

					<label className="flex cursor-pointer items-center justify-between border-t border-border/50 pt-4">
						<div>
							<p className="text-sm font-medium">Oxom Branding ausblenden</p>
							<p className="text-sm text-muted-foreground">
								Reduziert Oxom-UI-Hinweise in Workspace-Bereichen.
							</p>
						</div>
						<Checkbox
							checked={hideBranding}
							onCheckedChange={(checked) => setHideBranding(checked === true)}
							aria-label="Branding ausblenden"
						/>
					</label>

					<div className="flex items-center gap-3 border-t border-border/50 pt-4">
						<Button onClick={saveBranding} disabled={isSavingBranding}>
							{isSavingBranding ? (
								<>
									<HugeiconsIcon icon={Loading03Icon} size={16} className="mr-2 animate-spin" />
									Speichert...
								</>
							) : (
								"Branding speichern"
							)}
						</Button>
						{brandingMessage ? (
							<p className="text-sm text-muted-foreground">{brandingMessage}</p>
						) : null}
					</div>
				</CardContent>
			</Card>

			{/* Custom Domain */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HugeiconsIcon icon={GlobeIcon} size={16} />
						Custom Domain
					</CardTitle>
					<CardDescription>
						Domain am Vercel-Projekt verbinden und verifizieren.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col gap-3 sm:flex-row">
						<Input
							value={domainInput}
							onChange={(event) => setDomainInput(event.target.value)}
							placeholder={domainPlaceholder}
							aria-label="Domain eingeben"
						/>
						<Button onClick={connectDomain} disabled={isSubmittingDomain}>
							{isSubmittingDomain ? (
								<>
									<HugeiconsIcon icon={Loading03Icon} size={16} className="mr-2 animate-spin" />
									Verbinde...
								</>
							) : (
								<>
									<HugeiconsIcon icon={PlusSignIcon} size={16} className="mr-2" />
									Domain verbinden
								</>
							)}
						</Button>
					</div>

					{error ? <p className="text-sm text-destructive">{error}</p> : null}
					{message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

					{dnsInstructions.length > 0 ? (
						<div className="space-y-1 rounded-xl border border-border/50 bg-muted/30 p-4 font-mono text-xs">
							<p className="mb-2 font-sans text-sm font-medium not-italic">Benötigte DNS-Records</p>
							{dnsInstructions.map((record) => (
								<p key={`${record.type}:${record.domain}:${record.value}`} className="break-all text-muted-foreground">
									{record.type} {record.domain} {record.value}
								</p>
							))}
						</div>
					) : null}

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium">Verbundene Domains</p>
							{isLoadingDomains ? (
								<HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin text-muted-foreground" />
							) : null}
						</div>

						{domains.length === 0 && !isLoadingDomains ? (
							<p className="text-sm text-muted-foreground">Noch keine Domains verbunden.</p>
						) : null}

						<div className="divide-y divide-border/50">
							{domains.map((domain) => (
								<div key={domain.name} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
									<Link
										href={`https://${domain.name}`}
										target="_blank"
										rel="noopener noreferrer"
										className="break-all text-sm font-medium underline-offset-2 hover:underline"
									>
										{domain.name}
									</Link>
									<div className="flex items-center gap-2">
										{domain.verified ? (
											<Badge variant="secondary">
												<HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} className="mr-1" />
												Verified
											</Badge>
										) : (
											<Badge variant="outline">Pending</Badge>
										)}
										{!domain.verified ? (
											<Button variant="outline" size="sm" onClick={() => verifyDomain(domain.name)}>
												Verify
											</Button>
										) : null}
										<Button
											variant="outline"
											size="icon"
											onClick={() => removeDomain(domain.name)}
											aria-label={`Domain ${domain.name} entfernen`}
										>
											<HugeiconsIcon icon={Delete02Icon} size={16} />
										</Button>
									</div>
									{!domain.verified && domain.verification?.length ? (
										<div className="w-full space-y-1 font-mono text-xs text-muted-foreground">
											{domain.verification.slice(0, 2).map((record, index) => (
												<p key={`${domain.name}-verify-${index}`}>
													{record.type || "record"}: {record.domain || "@"} {record.value || ""}
												</p>
											))}
										</div>
									) : null}
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
