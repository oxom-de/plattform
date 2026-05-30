"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	Delete02Icon,
	Loading03Icon,
	PlusSignIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useMemo, useState } from "react";
import { LinkInBioPublicProfile } from "@/components/link-in-bio/link-in-bio-public-profile";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
	LinkInBioLinkItem,
	LinkInBioProfile,
} from "@/lib/link-in-bio/types";

const MAX_SOCIAL_LINKS = 6;

function createClientId(prefix: string): string {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
	}
	return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createEmptyLink(prefix: "link" | "social"): LinkInBioLinkItem {
	return {
		id: createClientId(prefix),
		label: "",
		url: "",
		is_ad: false,
		is_cal: false,
	};
}

interface WorkspaceLinkInBioClientProps {
	workspaceId: string;
	workspaceSlug: string;
	workspaceName: string;
	verifiedLabel: string | null;
	hideBranding: boolean;
	publicUrl: string;
	initialProfile: LinkInBioProfile;
	initialLinkInBioDomain: LinkInBioDomain | null;
}

type LinkInBioDomain = {
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
	vercel_domain_id?: string | null;
	verification_status?: string | null;
	last_verification_at?: string | null;
	created_at?: string;
	updated_at?: string;
};

type DnsInstruction = {
	type: string;
	domain: string;
	value: string;
};

export function WorkspaceLinkInBioClient({
	workspaceId,
	workspaceSlug,
	workspaceName,
	verifiedLabel,
	hideBranding,
	publicUrl,
	initialProfile,
	initialLinkInBioDomain,
}: WorkspaceLinkInBioClientProps) {
	const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url || "");
	const [displayName, setDisplayName] = useState(
		initialProfile.display_name || workspaceName,
	);
	const [bio, setBio] = useState(initialProfile.bio || "");
	const [featuredLabel, setFeaturedLabel] = useState(
		initialProfile.featured_link?.label || "",
	);
	const [featuredUrl, setFeaturedUrl] = useState(
		initialProfile.featured_link?.url || "",
	);
	const [links, setLinks] = useState<LinkInBioLinkItem[]>(
		initialProfile.links.filter((item) => item.is_cal !== true).length > 0
			? initialProfile.links.filter((item) => item.is_cal !== true)
			: [createEmptyLink("link")],
	);
	const [socialLinks, setSocialLinks] = useState<LinkInBioLinkItem[]>(
		initialProfile.social_links.slice(0, MAX_SOCIAL_LINKS),
	);
	const [isPublished, setIsPublished] = useState(initialProfile.is_published);
	const [isSaving, setIsSaving] = useState(false);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
	const [domainInput, setDomainInput] = useState(
		initialLinkInBioDomain?.hostname || "",
	);
	const [linkInBioDomain, setLinkInBioDomain] =
		useState<LinkInBioDomain | null>(initialLinkInBioDomain);
	const [dnsInstructions, setDnsInstructions] = useState<DnsInstruction[]>([]);
	const [isSavingDomain, setIsSavingDomain] = useState(false);
	const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
	const [isRemovingDomain, setIsRemovingDomain] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const resolvedPublicUrl = linkInBioDomain?.verified
		? `https://${linkInBioDomain.hostname}`
		: publicUrl;

	const previewProfile = useMemo<LinkInBioProfile>(
		() => {
			const regularLinks = links
				.map((item) => ({
					...item,
					label: item.label.trim(),
					url: item.url.trim(),
					is_ad: item.is_ad === true,
					is_cal: false,
				}))
				.filter((item) => item.label && item.url);

			return {
				workspace_id: workspaceId,
				avatar_url: avatarUrl.trim() || null,
				display_name: displayName.trim() || workspaceName,
				bio: bio.trim() || null,
				featured_link:
					featuredLabel.trim() && featuredUrl.trim()
						? { label: featuredLabel.trim(), url: featuredUrl.trim() }
						: null,
				links: regularLinks,
				social_links: socialLinks
					.map((item) => ({
						...item,
						label: item.label.trim(),
						url: item.url.trim(),
						is_ad: false,
						is_cal: false,
					}))
					.filter((item) => item.label && item.url)
					.slice(0, MAX_SOCIAL_LINKS),
				is_published: isPublished,
				published_at: initialProfile.published_at,
				created_at: initialProfile.created_at,
				updated_at: initialProfile.updated_at,
			};
		},
		[
			avatarUrl,
			bio,
			displayName,
			featuredLabel,
			featuredUrl,
			initialProfile.created_at,
			initialProfile.published_at,
			initialProfile.updated_at,
			isPublished,
			links,
			socialLinks,
			workspaceId,
			workspaceName,
		],
	);

	async function saveProfile(
		nextPublished: boolean,
		intent: "save" | "toggle" = "save",
	) {
		setIsSaving(true);
		setError(null);
		setMessage(null);

		try {
			const payload = {
				avatarUrl: avatarUrl.trim() || null,
				displayName: displayName.trim() || workspaceName,
				bio: bio.trim() || null,
				featuredLink:
					featuredLabel.trim() && featuredUrl.trim()
						? { label: featuredLabel.trim(), url: featuredUrl.trim() }
						: null,
				links: links
					.map((item) => ({
						id: item.id,
						label: item.label.trim(),
						url: item.url.trim(),
						is_ad: item.is_ad === true,
						is_cal: false,
					}))
					.filter((item) => item.label && item.url),
				socialLinks: socialLinks
					.map((item) => ({
						id: item.id,
						label: item.label.trim(),
						url: item.url.trim(),
						is_ad: false,
						is_cal: false,
					}))
					.filter((item) => item.label && item.url)
					.slice(0, MAX_SOCIAL_LINKS),
				isPublished: nextPublished,
			};

			const response = await fetch(
				`/api/workspaces/${workspaceId}/link-in-bio`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);
			const data = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				profile?: LinkInBioProfile;
				error?: string;
			};

			if (!response.ok || data.success === false) {
				throw new Error(
					data.error || "Link in Bio konnte nicht gespeichert werden.",
				);
			}

			setIsPublished(Boolean(data.profile?.is_published ?? nextPublished));
			if (intent === "save") {
				setMessage("Änderungen gespeichert.");
			} else {
				setMessage(
					nextPublished
						? "Link in Bio veröffentlicht."
						: "Veröffentlichung aufgehoben.",
				);
			}
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Link in Bio konnte nicht gespeichert werden.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	async function refreshDomain() {
		try {
			const response = await fetch(
				`/api/workspaces/${workspaceId}/link-in-bio/domains`,
				{ method: "GET" },
			);
			const payload = (await response.json().catch(() => ({}))) as {
				domain?: LinkInBioDomain | null;
				error?: string;
			};

			if (!response.ok) {
				throw new Error(
					payload.error || "Domain-Status konnte nicht geladen werden.",
				);
			}

			setLinkInBioDomain(payload.domain || null);
			if (payload.domain?.hostname) {
				setDomainInput(payload.domain.hostname);
			}
		} catch (refreshError) {
			setError(
				refreshError instanceof Error
					? refreshError.message
					: "Domain-Status konnte nicht geladen werden.",
			);
		}
	}

	async function connectDomain() {
		const normalized = domainInput.trim().toLowerCase();
		if (!normalized) {
			setError("Bitte Domain eingeben (z. B. links.creator.tld).");
			return;
		}

		setIsSavingDomain(true);
		setError(null);
		setMessage(null);

		try {
			const response = await fetch(
				`/api/workspaces/${workspaceId}/link-in-bio/domains`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ hostname: normalized }),
				},
			);
			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				domain?: LinkInBioDomain;
				dnsInstructions?: DnsInstruction[];
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(
					payload.error || "Domain konnte nicht verbunden werden.",
				);
			}

			setLinkInBioDomain(payload.domain || null);
			setDnsInstructions(
				Array.isArray(payload.dnsInstructions) ? payload.dnsInstructions : [],
			);
			setMessage(
				payload.domain?.verified
					? "Custom Link-in-Bio Domain ist aktiv."
					: "Domain hinterlegt. Bitte DNS-Records setzen und danach verifizieren.",
			);
			await refreshDomain();
		} catch (connectError) {
			setError(
				connectError instanceof Error
					? connectError.message
					: "Domain konnte nicht verbunden werden.",
			);
		} finally {
			setIsSavingDomain(false);
		}
	}

	async function verifyDomain() {
		if (!linkInBioDomain) {
			setError("Keine Link-in-Bio Domain vorhanden.");
			return;
		}

		setIsVerifyingDomain(true);
		setError(null);
		setMessage(null);

		try {
			const response = await fetch(
				`/api/workspaces/${workspaceId}/link-in-bio/domains`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ hostname: linkInBioDomain.hostname }),
				},
			);

			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				verified?: boolean;
				domain?: LinkInBioDomain;
				dnsInstructions?: DnsInstruction[];
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(payload.error || "Verifizierung fehlgeschlagen.");
			}

			setLinkInBioDomain(payload.domain || linkInBioDomain);
			setDnsInstructions(
				Array.isArray(payload.dnsInstructions) ? payload.dnsInstructions : [],
			);
			setMessage(
				payload.verified
					? "Domain ist verifiziert und live."
					: "Domain noch nicht verifiziert.",
			);
			await refreshDomain();
		} catch (verifyError) {
			setError(
				verifyError instanceof Error
					? verifyError.message
					: "Verifizierung fehlgeschlagen.",
			);
		} finally {
			setIsVerifyingDomain(false);
		}
	}

	async function removeDomain() {
		if (!linkInBioDomain) {
			setError("Keine Link-in-Bio Domain vorhanden.");
			return;
		}

		setIsRemovingDomain(true);
		setError(null);
		setMessage(null);

		try {
			const response = await fetch(
				`/api/workspaces/${workspaceId}/link-in-bio/domains`,
				{
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ hostname: linkInBioDomain.hostname }),
				},
			);
			const payload = (await response.json().catch(() => ({}))) as {
				success?: boolean;
				error?: string;
			};

			if (!response.ok || payload.success === false) {
				throw new Error(
					payload.error || "Domain konnte nicht entfernt werden.",
				);
			}

			setLinkInBioDomain(null);
			setDnsInstructions([]);
			setDomainInput("");
			setMessage("Custom Link-in-Bio Domain entfernt.");
			await refreshDomain();
		} catch (removeError) {
			setError(
				removeError instanceof Error
					? removeError.message
					: "Domain konnte nicht entfernt werden.",
			);
		} finally {
			setIsRemovingDomain(false);
		}
	}

	async function uploadAvatar(file: File) {
		setIsUploadingAvatar(true);
		setError(null);
		setMessage(null);

		try {
			const query = new URLSearchParams({
				mode: "direct",
				creatorSlug: workspaceSlug,
				desiredFilename: file.name || "link-in-bio-avatar.png",
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

			if (!response.ok || !payload.publicUrl?.trim()) {
				throw new Error(payload.error || "Avatar-Upload fehlgeschlagen.");
			}

			setAvatarUrl(payload.publicUrl.trim());
			setMessage("Avatar hochgeladen. Jetzt speichern oder veröffentlichen.");
		} catch (uploadError) {
			setError(
				uploadError instanceof Error
					? uploadError.message
					: "Avatar-Upload fehlgeschlagen.",
			);
		} finally {
			setIsUploadingAvatar(false);
		}
	}

	function updateListItem(
		list: LinkInBioLinkItem[],
		setList: (value: LinkInBioLinkItem[]) => void,
		id: string,
		field: "label" | "url",
		value: string,
	) {
		setList(
			list.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
		);
	}

	function updateLinkAdFlag(id: string, checked: boolean) {
		setLinks((prev) =>
			prev.map((item) =>
				item.id === id ? { ...item, is_ad: checked } : item,
			),
		);
	}

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
			<section className="space-y-6">
				<Card className="rounded-xl border border-border/70 bg-card/60">
					<CardHeader>
						<CardTitle className="text-xl">Profil</CardTitle>
						<CardDescription>
							Avatar, Name und kurze Beschreibung deiner öffentlichen Seite.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="link-in-bio-avatar">Avatar URL</Label>
							<Input
								id="link-in-bio-avatar"
								value={avatarUrl}
								onChange={(event) => setAvatarUrl(event.target.value)}
								placeholder="https://assets.oxom.de/avatar.jpg"
							/>
						</div>

						<div className="flex items-center gap-3">
							<label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
								{isUploadingAvatar ? "Upload läuft..." : "Avatar hochladen"}
								<input
									type="file"
									accept="image/*"
									className="hidden"
									disabled={isUploadingAvatar}
									onChange={(event) => {
										const file = event.target.files?.[0];
										if (!file) return;
										void uploadAvatar(file);
										event.currentTarget.value = "";
									}}
								/>
							</label>
							{avatarUrl.trim() ? (
								<img
									src={avatarUrl.trim()}
									alt=""
									className="size-10 rounded-lg border border-border/70 object-cover"
								/>
							) : null}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="link-in-bio-name">Titel / Name</Label>
							<Input
								id="link-in-bio-name"
								value={displayName}
								onChange={(event) => setDisplayName(event.target.value)}
								maxLength={80}
								placeholder={workspaceName}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="link-in-bio-bio">Bio</Label>
							<Textarea
								id="link-in-bio-bio"
								value={bio}
								onChange={(event) => setBio(event.target.value)}
								maxLength={280}
								rows={4}
								placeholder="Kurz und klar: Wer bist du und wofür stehst du?"
							/>
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-xl border border-border/70 bg-card/60">
					<CardHeader>
						<CardTitle className="text-xl">Social Links</CardTitle>
						<CardDescription>
							Optional: Social-Buttons, die im Profil direkt unter Bio und
							Handle angezeigt werden. Maximal {MAX_SOCIAL_LINKS}.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<p className="text-xs text-muted-foreground">
							{socialLinks.length}/{MAX_SOCIAL_LINKS} Social-Links
						</p>
						{socialLinks.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Noch keine Social-Links vorhanden.
							</p>
						) : null}
						{socialLinks.map((item) => (
							<div
								key={item.id}
								className="grid gap-2 rounded-lg border border-border/70 p-3 md:grid-cols-[1fr_1.3fr_auto]"
							>
								<Input
									value={item.label}
									onChange={(event) =>
										updateListItem(
											socialLinks,
											setSocialLinks,
											item.id,
											"label",
											event.target.value,
										)
									}
									placeholder="z. B. Instagram"
								/>
								<Input
									value={item.url}
									onChange={(event) =>
										updateListItem(
											socialLinks,
											setSocialLinks,
											item.id,
											"url",
											event.target.value,
										)
									}
									placeholder="https://..."
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={() =>
										setSocialLinks((prev) =>
											prev.filter((entry) => entry.id !== item.id),
										)
									}
									aria-label="Social-Link entfernen"
								>
									<HugeiconsIcon icon={Delete02Icon} size={16} />
								</Button>
							</div>
						))}

						<Button
							type="button"
							variant="outline"
							disabled={socialLinks.length >= MAX_SOCIAL_LINKS}
							onClick={() =>
								setSocialLinks((prev) =>
									prev.length >= MAX_SOCIAL_LINKS
										? prev
										: [...prev, createEmptyLink("social")],
								)
							}
						>
							<HugeiconsIcon icon={PlusSignIcon} size={16} className="mr-2" />
							Social-Link hinzufügen
						</Button>
					</CardContent>
				</Card>

				<Card className="rounded-xl border border-border/70 bg-card/60">
					<CardHeader>
						<CardTitle className="text-xl">Links</CardTitle>
						<CardDescription>
							Lege einen hervorgehobenen Link und deine wichtigsten
							Standard-Links an.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
							<p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
								Hervorgehobener Link
							</p>
							<Input
								value={featuredLabel}
								onChange={(event) => setFeaturedLabel(event.target.value)}
								placeholder="z. B. Mein neuester Launch"
							/>
							<Input
								value={featuredUrl}
								onChange={(event) => setFeaturedUrl(event.target.value)}
								placeholder="https://..."
							/>
						</div>

						<div className="space-y-3">
							{links.map((item, index) => (
								<div
									key={item.id}
									className="space-y-3 rounded-lg border border-border/70 p-3"
								>
									<div className="grid gap-2 md:grid-cols-[1fr_1.3fr_auto]">
										<Input
											value={item.label}
											onChange={(event) =>
												updateListItem(
													links,
													setLinks,
													item.id,
													"label",
													event.target.value,
												)
											}
											placeholder={`Link ${index + 1} Titel`}
										/>
										<Input
											value={item.url}
											onChange={(event) =>
												updateListItem(
													links,
													setLinks,
													item.id,
													"url",
													event.target.value,
												)
											}
											placeholder="https://..."
										/>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() =>
												setLinks((prev) =>
													prev.filter((entry) => entry.id !== item.id),
												)
											}
											aria-label="Link entfernen"
										>
											<HugeiconsIcon icon={Delete02Icon} size={16} />
										</Button>
									</div>
									<label className="flex items-center gap-2 text-xs text-muted-foreground">
										<Checkbox
											checked={item.is_ad === true}
											onCheckedChange={(checked) =>
												updateLinkAdFlag(item.id, checked === true)
											}
											aria-label="Als Werbelink markieren"
										/>
										Werbelink kennzeichnen
									</label>
								</div>
							))}
						</div>

						<Button
							type="button"
							variant="outline"
							onClick={() =>
								setLinks((prev) => [...prev, createEmptyLink("link")])
							}
						>
							<HugeiconsIcon icon={PlusSignIcon} size={16} className="mr-2" />
							Link hinzufügen
						</Button>
					</CardContent>
				</Card>

				<Card className="rounded-xl border border-border/70 bg-card/60">
					<CardHeader>
						<CardTitle className="text-xl">Custom Domain</CardTitle>
						<CardDescription>
							Optional: eigene Domain per CNAME auf diese Link-in-Bio-Seite
							legen.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Aktuelle URL:{" "}
							<a
								href={resolvedPublicUrl}
								target="_blank"
								rel="noreferrer noopener"
								className="underline underline-offset-2"
							>
								{resolvedPublicUrl}
							</a>
						</p>

						<div className="grid gap-2 md:grid-cols-[1fr_auto]">
							<Input
								value={domainInput}
								onChange={(event) => setDomainInput(event.target.value)}
								placeholder="z. B. links.creator.tld"
							/>
							<Button
								type="button"
								variant="outline"
								disabled={isSavingDomain}
								onClick={() => void connectDomain()}
							>
								{isSavingDomain ? (
									<HugeiconsIcon
										icon={Loading03Icon}
										size={16}
										className="mr-2 animate-spin"
									/>
								) : null}
								Domain verbinden
							</Button>
						</div>

						{linkInBioDomain ? (
							<div className="rounded-lg border border-border/70 bg-muted/20 p-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<a
										href={`https://${linkInBioDomain.hostname}`}
										target="_blank"
										rel="noreferrer noopener"
										className="text-sm font-medium underline underline-offset-2"
									>
										{linkInBioDomain.hostname}
									</a>
									<Badge
										variant={linkInBioDomain.verified ? "secondary" : "outline"}
									>
										{linkInBioDomain.verified ? "verified" : "pending"}
									</Badge>
								</div>
								<div className="mt-3 flex flex-wrap gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isVerifyingDomain}
										onClick={() => void verifyDomain()}
									>
										{isVerifyingDomain ? (
											<HugeiconsIcon
												icon={Loading03Icon}
												size={16}
												className="mr-2 animate-spin"
											/>
										) : null}
										Verify
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isRemovingDomain}
										onClick={() => void removeDomain()}
									>
										{isRemovingDomain ? (
											<HugeiconsIcon
												icon={Loading03Icon}
												size={16}
												className="mr-2 animate-spin"
											/>
										) : null}
										Remove
									</Button>
								</div>
							</div>
						) : null}

						{dnsInstructions.length > 0 ? (
							<div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
								<p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
									DNS Instructions
								</p>
								{dnsInstructions.map((entry, index) => (
									<div
										key={`${entry.type}-${entry.domain}-${index}`}
										className="rounded-md border border-border/70 bg-background/70 p-2"
									>
										<p className="font-mono text-xs">
											{entry.type} {entry.domain}
										</p>
										<p className="mt-1 break-all font-mono text-xs text-muted-foreground">
											{entry.value}
										</p>
									</div>
								))}
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card className="rounded-xl border border-border/70 bg-card/60">
					<CardHeader className="flex flex-row items-start justify-between gap-3">
						<div className="space-y-1">
							<CardTitle className="text-xl">Publishing</CardTitle>
							<CardDescription>
								Speichern als Entwurf oder direkt veröffentlichen.
							</CardDescription>
						</div>
						<Badge variant={isPublished ? "secondary" : "outline"}>
							{isPublished ? "Published" : "Draft"}
						</Badge>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Public URL:{" "}
							<a
								href={resolvedPublicUrl}
								target="_blank"
								rel="noreferrer noopener"
								className="underline underline-offset-2"
							>
								{resolvedPublicUrl}
							</a>
						</p>

						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								disabled={isSaving}
								onClick={() => void saveProfile(isPublished, "save")}
							>
								{isSaving ? (
									<HugeiconsIcon
										icon={Loading03Icon}
										size={16}
										className="mr-2 animate-spin"
									/>
								) : null}
								Speichern
							</Button>
							<Button
								type="button"
								disabled={isSaving}
								onClick={() => void saveProfile(!isPublished, "toggle")}
							>
								{isSaving ? (
									<HugeiconsIcon
										icon={Loading03Icon}
										size={16}
										className="mr-2 animate-spin"
									/>
								) : null}
								{isPublished ? "Unpublish" : "Publish"}
							</Button>
						</div>

						{error ? (
							<p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
								{error}
							</p>
						) : null}
						{message ? (
							<p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
								{message}
							</p>
						) : null}
					</CardContent>
				</Card>
			</section>

			<aside className="space-y-3 xl:sticky xl:top-6 xl:self-start">
				<div className="rounded-xl border border-border/70 bg-muted/20 p-3">
					<p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
						Preview
					</p>
				</div>
				<LinkInBioPublicProfile
					profile={previewProfile}
					workspaceName={workspaceName}
					workspaceSlug={workspaceSlug}
					verificationLabel={verifiedLabel}
					showBranding={!hideBranding}
				/>
			</aside>
		</div>
	);
}
