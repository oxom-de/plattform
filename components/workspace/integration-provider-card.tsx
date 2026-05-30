"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { WorkspaceIntegrationPublic } from "@/lib/db/types";

// ─── Brand Logo ───────────────────────────────────────────────────────────────

const BRANDFETCH_CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID ?? "";

function BrandLogo({ domain, name }: { domain: string; name: string }) {
	const src = `https://cdn.brandfetch.io/${domain}/icon?c=${BRANDFETCH_CLIENT_ID}`;
	return (
		<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30">
			<Image
				src={src}
				alt={`${name} logo`}
				width={40}
				height={40}
				className="h-10 w-10 object-contain"
				unoptimized
			/>
		</div>
	);
}

// ─── Connect Banner ───────────────────────────────────────────────────────────

export function DubConnectBanner() {
	const params = useSearchParams();
	const connected = params.get("dub_connected");
	const error = params.get("dub_error");

	if (!connected && !error) return null;

	if (error) {
		return (
			<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
				Dub-Verbindung fehlgeschlagen:{" "}
				<span className="font-mono">{decodeURIComponent(error)}</span>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
			Dub.co erfolgreich verbunden.
		</div>
	);
}

export function FigmaConnectBanner() {
	const params = useSearchParams();
	const connected = params.get("figma_connected");
	const error = params.get("figma_error");

	if (!connected && !error) return null;

	if (error) {
		return (
			<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
				Figma-Verbindung fehlgeschlagen:{" "}
				<span className="font-mono">{decodeURIComponent(error)}</span>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
			Figma erfolgreich verbunden.
		</div>
	);
}

export function DiscordAnnouncementsConnectBanner() {
	const params = useSearchParams();
	const connected = params.get("discord_announcements_connected");
	const error = params.get("discord_announcements_error");

	if (!connected && !error) return null;

	if (error) {
		return (
			<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
				Discord-Verbindung fehlgeschlagen:{" "}
				<span className="font-mono">{decodeURIComponent(error)}</span>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
			Discord-Server für Announcements erfolgreich verbunden.
		</div>
	);
}

// ─── Provider Card ────────────────────────────────────────────────────────────

type ProviderCardProps = {
	workspaceId: string;
	integration: WorkspaceIntegrationPublic | null;
};

export function DubProviderCard({ workspaceId, integration }: ProviderCardProps) {
	const router = useRouter();
	const [loading, setLoading] = React.useState(false);
	const [webhookSecret, setWebhookSecret] = React.useState("");
	const [secretSaving, setSecretSaving] = React.useState(false);
	const [secretError, setSecretError] = React.useState<string | null>(null);
	const [secretSaved, setSecretSaved] = React.useState(false);
	const [copied, setCopied] = React.useState(false);
	const connected = integration !== null;
	const hasWebhookSecret = Boolean(integration?.metadata?.webhook_secret);

	const webhookUrl = typeof window !== "undefined"
		? `${window.location.origin}/api/webhooks/dub?workspaceId=${workspaceId}`
		: `/api/webhooks/dub?workspaceId=${workspaceId}`;

	async function handleCopy() {
		await navigator.clipboard.writeText(webhookUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	async function handleSaveSecret(e: React.FormEvent) {
		e.preventDefault();
		if (!webhookSecret.trim()) return;
		setSecretSaving(true);
		setSecretError(null);
		setSecretSaved(false);
		try {
			const res = await fetch("/api/integrations", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspaceId,
					provider: "dub",
					metadata: { webhook_secret: webhookSecret.trim() },
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				setSecretError(data.error ?? "Fehler beim Speichern.");
				return;
			}
			setWebhookSecret("");
			setSecretSaved(true);
			router.refresh();
		} catch {
			setSecretError("Netzwerkfehler.");
		} finally {
			setSecretSaving(false);
		}
	}

	async function handleDisconnect() {
		setLoading(true);
		try {
			await fetch("/api/integrations", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, provider: "dub" }),
			});
			router.refresh();
		} finally {
			setLoading(false);
		}
	}

	return (
		<ProviderCardShell
			logo={<BrandLogo domain="dub.co" name="Dub.co" />}
			name="Dub.co"
			category="Link Management"
			description="Kurzlinks, QR-Codes, Klick-Analytics und Domain-Verwaltung. Webhooks für Link-Events."
			connected={connected}
			hint={integration?.secret_hint ?? null}
			authType={integration?.auth_type ?? null}
		>
			{!connected ? (
				<Button size="sm" variant="outline" asChild>
					<a href={`/api/integrations/dub/connect?workspaceId=${workspaceId}`}>
						Mit Dub verbinden
					</a>
				</Button>
			) : (
				<div className="flex flex-col gap-3">
					{/* Webhook URL */}
					<div className="space-y-1.5">
						<p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
							Webhook URL
						</p>
						<div className="flex items-center gap-2">
							<code className="min-w-0 flex-1 truncate rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 font-mono text-xs">
								{webhookUrl}
							</code>
							<Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
								{copied ? "Kopiert" : "Kopieren"}
							</Button>
						</div>
					</div>

					{/* Webhook Secret */}
					<form onSubmit={handleSaveSecret} className="space-y-1.5">
						<p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
							Webhook Secret{hasWebhookSecret && " ✓"}
						</p>
						<div className="flex gap-2">
							<Input
								className="border-border bg-muted/30 font-mono text-xs"
								placeholder="whsec_..."
								value={webhookSecret}
								onChange={(e) => setWebhookSecret(e.target.value)}
								disabled={secretSaving}
							/>
							<Button
								type="submit"
								size="sm"
								variant="outline"
								disabled={secretSaving || !webhookSecret.trim()}
								className="shrink-0"
							>
								{secretSaving ? "…" : "Speichern"}
							</Button>
						</div>
						{secretError && <p className="text-xs text-destructive">{secretError}</p>}
						{secretSaved && <p className="text-xs text-green-600 dark:text-green-400">Secret gespeichert.</p>}
					</form>

					{/* Actions */}
					<div className="flex gap-2">
						<Button size="sm" variant="outline" asChild>
							<a href={`/api/integrations/dub/connect?workspaceId=${workspaceId}`}>
								Neu verbinden
							</a>
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="text-destructive hover:text-destructive"
							disabled={loading}
							onClick={handleDisconnect}
						>
							{loading ? "…" : "Trennen"}
						</Button>
					</div>
				</div>
			)}
		</ProviderCardShell>
	);
}

export function BufferProviderCard({ workspaceId, integration }: ProviderCardProps) {
	const router = useRouter();
	const [secret, setSecret] = React.useState("");
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const connected = integration !== null;

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		if (!secret.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/integrations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, provider: "buffer", secret: secret.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error ?? "Fehler beim Speichern.");
				return;
			}
			setSecret("");
			router.refresh();
		} catch {
			setError("Netzwerkfehler.");
		} finally {
			setLoading(false);
		}
	}

	async function handleDisconnect() {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/integrations", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, provider: "buffer" }),
			});
			if (!res.ok) {
				const data = await res.json();
				setError(data.error ?? "Fehler beim Trennen.");
				return;
			}
			router.refresh();
		} catch {
			setError("Netzwerkfehler.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<ProviderCardShell
			logo={<BrandLogo domain="buffer.com" name="Buffer" />}
			name="Buffer"
			category="Social Media"
			description="Social-Media-Planung und Scheduling. Posts direkt aus dem Workspace queuen."
			connected={connected}
			hint={integration?.secret_hint ?? null}
			authType={integration?.auth_type ?? null}
		>
			<form onSubmit={handleSave} className="flex flex-col gap-2">
				<div className="flex gap-2">
					<Input
						className="border-border bg-muted/30 font-mono text-xs"
						placeholder={connected ? "Neuen Token eingeben…" : "Access token…"}
						value={secret}
						onChange={(e) => setSecret(e.target.value)}
						disabled={loading}
					/>
					<Button
						type="submit"
						size="sm"
						variant="outline"
						disabled={loading || !secret.trim()}
					>
						{loading ? "…" : connected ? "Ersetzen" : "Speichern"}
					</Button>
					{connected && (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="text-destructive hover:text-destructive"
							disabled={loading}
							onClick={handleDisconnect}
						>
							Trennen
						</Button>
					)}
				</div>
				{error && <p className="text-xs text-destructive">{error}</p>}
			</form>
		</ProviderCardShell>
	);
}

export function VisitorsProviderCard({ workspaceId, integration }: ProviderCardProps) {
	const router = useRouter();
	const [secret, setSecret] = React.useState("");
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const connected = integration !== null;

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		if (!secret.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/integrations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspaceId,
					provider: "visitors",
					secret: secret.trim(),
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error ?? "Fehler beim Speichern.");
				return;
			}
			setSecret("");
			router.refresh();
		} catch {
			setError("Netzwerkfehler.");
		} finally {
			setLoading(false);
		}
	}

	async function handleDisconnect() {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/integrations", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, provider: "visitors" }),
			});
			if (!res.ok) {
				const data = await res.json();
				setError(data.error ?? "Fehler beim Trennen.");
				return;
			}
			router.refresh();
		} catch {
			setError("Netzwerkfehler.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<ProviderCardShell
			logo={<BrandLogo domain="visitors.now" name="Visitors" />}
			name="Visitors"
			category="Analytics"
			description="Realtime-Besucherzahlen, Top-Pages, Referrer, UTM- und Event-Analytics im Workspace und Agent."
			connected={connected}
			hint={integration?.secret_hint ?? null}
			authType={integration?.auth_type ?? null}
		>
			<form onSubmit={handleSave} className="flex flex-col gap-2">
				<div className="flex gap-2">
					<Input
						className="border-border bg-muted/30 font-mono text-xs"
						placeholder={connected ? "Neuen API-Key eingeben…" : "vk_..."}
						value={secret}
						onChange={(e) => setSecret(e.target.value)}
						disabled={loading}
					/>
					<Button
						type="submit"
						size="sm"
						variant="outline"
						disabled={loading || !secret.trim()}
					>
						{loading ? "…" : connected ? "Ersetzen" : "Speichern"}
					</Button>
					{connected && (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="text-destructive hover:text-destructive"
							disabled={loading}
							onClick={handleDisconnect}
						>
							Trennen
						</Button>
					)}
				</div>
				{error && <p className="text-xs text-destructive">{error}</p>}
			</form>
		</ProviderCardShell>
	);
}

export function FigmaProviderCard({ workspaceId, integration }: ProviderCardProps) {
	const router = useRouter();
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const connected = integration !== null;

	async function handleDisconnect() {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/integrations", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, provider: "figma" }),
			});
			if (!res.ok) {
				const data = await res.json();
				setError(data.error ?? "Fehler beim Trennen.");
				return;
			}
			router.refresh();
		} catch {
			setError("Netzwerkfehler.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<ProviderCardShell
			logo={<BrandLogo domain="figma.com" name="Figma" />}
			name="Figma"
			category="Design"
			description="Frames und Post-Copy im Agent lesen, Assets für Creator-Workflows vorbereiten."
			connected={connected}
			hint={integration?.secret_hint ?? null}
			authType={integration?.auth_type ?? null}
		>
			<div className="flex flex-wrap gap-2">
				<Button size="sm" variant="outline" asChild>
					<a href={`/api/integrations/figma/connect?workspaceId=${workspaceId}`}>
						{connected ? "Neu verbinden" : "Mit Figma verbinden"}
					</a>
				</Button>
				{connected && (
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="text-destructive hover:text-destructive"
						disabled={loading}
						onClick={handleDisconnect}
					>
						{loading ? "…" : "Trennen"}
					</Button>
				)}
			</div>
			{error && <p className="text-xs text-destructive">{error}</p>}
		</ProviderCardShell>
	);
}

export function StreamElementsConnectBanner() {
	return null;
}

type SeAccountRecord = {
	provider: string;
	metadata: Record<string, unknown> | null;
	secret_hint: string | null;
	auth_type: string | null;
	status: string;
};

type StreamElementsProviderCardProps = {
	workspaceId: string;
	accounts: SeAccountRecord[];
};

export function StreamElementsProviderCard({ workspaceId, accounts }: StreamElementsProviderCardProps) {
	const router = useRouter();
	const [label, setLabel] = React.useState("");
	const [jwt, setJwt] = React.useState("");
	const [adding, setAdding] = React.useState(false);
	const [addError, setAddError] = React.useState<string | null>(null);
	const [removingSlug, setRemovingSlug] = React.useState<string | null>(null);
	const [showForm, setShowForm] = React.useState(false);

	async function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		if (!label.trim() || !jwt.trim()) return;
		setAdding(true);
		setAddError(null);
		try {
			const res = await fetch("/api/integrations/streamelements", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, label: label.trim(), jwt: jwt.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				setAddError(data.error ?? "Fehler beim Hinzufügen.");
				return;
			}
			setLabel("");
			setJwt("");
			setShowForm(false);
			router.refresh();
		} catch {
			setAddError("Netzwerkfehler.");
		} finally {
			setAdding(false);
		}
	}

	async function handleRemove(slug: string) {
		setRemovingSlug(slug);
		try {
			await fetch("/api/integrations", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, provider: `streamelements:${slug}` }),
			});
			router.refresh();
		} finally {
			setRemovingSlug(null);
		}
	}

	return (
		<Card className="border-border/80 bg-card/70">
			<CardContent className="pt-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
					<div className="shrink-0">
						<BrandLogo domain="streamelements.com" name="StreamElements" />
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-semibold leading-none">StreamElements</span>
							<Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
								Streaming Bot
							</Badge>
							{accounts.length > 0 ? (
								<Badge variant="secondary" className="text-[10px]">
									{accounts.length} {accounts.length === 1 ? "Account" : "Accounts"}
								</Badge>
							) : (
								<Badge variant="outline" className="text-[10px] text-muted-foreground">
									Kein Account
								</Badge>
							)}
						</div>

						<p className="text-sm text-muted-foreground">
							Bot-Commands direkt aus dem Workspace verwalten — pro Account einzeln verbindbar.
						</p>

						{/* Account List */}
						{accounts.length > 0 && (
							<div className="flex flex-col gap-1.5">
								{accounts.map((account) => {
									const meta = account.metadata ?? {};
									const slug = account.provider.replace("streamelements:", "");
									const username = meta.channel_username as string | undefined;
									const accountLabel = meta.label as string | undefined;
									return (
										<div
											key={account.provider}
											className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
										>
											<div className="flex flex-col">
												<span className="text-sm font-medium leading-none">
													{accountLabel ?? slug}
												</span>
												{username && (
													<span className="mt-0.5 font-mono text-xs text-muted-foreground">
														{username}
													</span>
												)}
											</div>
											<Button
												size="sm"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												disabled={removingSlug === slug}
												onClick={() => handleRemove(slug)}
											>
												{removingSlug === slug ? "…" : "Entfernen"}
											</Button>
										</div>
									);
								})}
							</div>
						)}

						{/* Add Account */}
						{showForm ? (
							<form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/10 p-3">
								<p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
									Account hinzufügen
								</p>
								<Input
									className="border-border bg-muted/30 text-sm"
									placeholder="Label (z. B. julex, easystretcher)"
									value={label}
									onChange={(e) => setLabel(e.target.value)}
									disabled={adding}
									pattern="[a-zA-Z0-9_-]+"
									title="Nur Buchstaben, Zahlen, _ und -"
								/>
								<Input
									className="border-border bg-muted/30 font-mono text-xs"
									placeholder="JWT Token aus SE Dashboard → Account → Channel Token"
									value={jwt}
									onChange={(e) => setJwt(e.target.value)}
									disabled={adding}
								/>
								{addError && <p className="text-xs text-destructive">{addError}</p>}
								<div className="flex gap-2">
									<Button
										type="submit"
										size="sm"
										variant="outline"
										disabled={adding || !label.trim() || !jwt.trim()}
									>
										{adding ? "Verbinden…" : "Verbinden"}
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => { setShowForm(false); setAddError(null); }}
										disabled={adding}
									>
										Abbrechen
									</Button>
								</div>
							</form>
						) : (
							<div>
								<Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
									+ Account hinzufügen
								</Button>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

type DiscordAccountRecord = {
	provider: string;
	metadata: Record<string, unknown> | null;
	secret_hint: string | null;
};

type DiscordAnnouncementChannelOption = {
	id: string;
	name: string;
};

type DiscordProviderCardProps = {
	workspaceId: string;
	accounts: DiscordAccountRecord[];
	announcementsIntegration: WorkspaceIntegrationPublic | null;
};

export function DiscordProviderCard({
	workspaceId,
	accounts,
	announcementsIntegration,
}: DiscordProviderCardProps) {
	const router = useRouter();
	const [label, setLabel] = React.useState("");
	const [botToken, setBotToken] = React.useState("");
	const [guildId, setGuildId] = React.useState("");
	const [adding, setAdding] = React.useState(false);
	const [addError, setAddError] = React.useState<string | null>(null);
	const [removingSlug, setRemovingSlug] = React.useState<string | null>(null);
	const [showForm, setShowForm] = React.useState(false);

	const announcementMeta =
		(announcementsIntegration?.metadata as Record<string, unknown> | null) ?? {};
	const announcementGuildName = (announcementMeta.guild_name as string | undefined) ?? "";
	const [announcementGuildId, setAnnouncementGuildId] = React.useState(
		(announcementMeta.guild_id as string | undefined) ?? "",
	);
	const [announcementChannelId, setAnnouncementChannelId] = React.useState(
		(announcementMeta.channel_id as string | undefined) ?? "",
	);
	const [announcementAccountSlug, setAnnouncementAccountSlug] = React.useState(
		(announcementMeta.account_slug as string | undefined) ?? "",
	);
	const [announcementWebhookUrl, setAnnouncementWebhookUrl] = React.useState("");
	const [announcementBotOnly, setAnnouncementBotOnly] = React.useState(
		Boolean(announcementMeta.bot_only),
	);
	const [announcementSaving, setAnnouncementSaving] = React.useState(false);
	const [announcementError, setAnnouncementError] = React.useState<string | null>(null);
	const [announcementSuccess, setAnnouncementSuccess] = React.useState<string | null>(null);
	const [announcementRemoving, setAnnouncementRemoving] = React.useState(false);
	const [announcementChannels, setAnnouncementChannels] = React.useState<
		DiscordAnnouncementChannelOption[]
	>([]);
	const [announcementChannelsLoading, setAnnouncementChannelsLoading] = React.useState(false);
	const [announcementChannelsError, setAnnouncementChannelsError] = React.useState<string | null>(
		null,
	);

	const announcementConnectHref = `/api/integrations/discord/announcements/connect?workspaceId=${encodeURIComponent(
		workspaceId,
	)}`;

	React.useEffect(() => {
		const meta =
			(announcementsIntegration?.metadata as Record<string, unknown> | null) ?? {};
		setAnnouncementGuildId((meta.guild_id as string | undefined) ?? "");
		setAnnouncementChannelId((meta.channel_id as string | undefined) ?? "");
		setAnnouncementAccountSlug((meta.account_slug as string | undefined) ?? "");
		setAnnouncementBotOnly(Boolean(meta.bot_only));
		setAnnouncementWebhookUrl("");
	}, [announcementsIntegration]);

	React.useEffect(() => {
		let cancelled = false;

		async function loadAnnouncementChannels() {
			if (!announcementGuildId) {
				setAnnouncementChannels([]);
				setAnnouncementChannelsError(null);
				setAnnouncementChannelsLoading(false);
				return;
			}

			setAnnouncementChannelsLoading(true);
			setAnnouncementChannelsError(null);
			try {
				const response = await fetch(
					`/api/integrations/discord/announcements/channels?workspaceId=${encodeURIComponent(
						workspaceId,
					)}`,
				);
				const data = (await response.json().catch(() => ({}))) as {
					channels?: Array<{ id?: string; name?: string }>;
					error?: string;
				};

				if (!response.ok) {
					if (!cancelled) {
						setAnnouncementChannels([]);
						setAnnouncementChannelsError(
							data.error ?? "Channels konnten nicht geladen werden.",
						);
					}
					return;
				}

				if (cancelled) return;

				const channels = Array.isArray(data.channels)
					? data.channels
							.filter((channel) => channel?.id && channel?.name)
							.map((channel) => ({
								id: channel.id as string,
								name: channel.name as string,
							}))
					: [];
				setAnnouncementChannels(channels);
			} catch {
				if (!cancelled) {
					setAnnouncementChannels([]);
					setAnnouncementChannelsError("Channels konnten nicht geladen werden.");
				}
			} finally {
				if (!cancelled) {
					setAnnouncementChannelsLoading(false);
				}
			}
		}

		void loadAnnouncementChannels();

		return () => {
			cancelled = true;
		};
	}, [workspaceId, announcementGuildId]);

	async function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		if (!label.trim() || !botToken.trim() || !guildId.trim()) return;
		setAdding(true);
		setAddError(null);
		try {
			const res = await fetch("/api/integrations/discord", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, label: label.trim(), botToken: botToken.trim(), guildId: guildId.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				setAddError(data.error ?? "Fehler beim Hinzufügen.");
				return;
			}
			setLabel("");
			setBotToken("");
			setGuildId("");
			setShowForm(false);
			router.refresh();
		} catch {
			setAddError("Netzwerkfehler.");
		} finally {
			setAdding(false);
		}
	}

	async function handleRemove(slug: string) {
		setRemovingSlug(slug);
		try {
			await fetch("/api/integrations", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, provider: `discord:${slug}` }),
			});
			router.refresh();
		} finally {
			setRemovingSlug(null);
		}
	}

	async function handleSaveAnnouncements(e: React.FormEvent) {
		e.preventDefault();

		const normalizedChannel = announcementChannelId.trim();
		const normalizedGuild = announcementGuildId.trim();
		const normalizedAccount = announcementAccountSlug.trim();
		const normalizedWebhook = announcementWebhookUrl.trim();

		if (!normalizedChannel && !normalizedWebhook) {
			setAnnouncementError(
				"Bitte mindestens Channel ID oder Webhook URL für Announcements setzen.",
			);
			return;
		}

		setAnnouncementSaving(true);
		setAnnouncementError(null);
		setAnnouncementSuccess(null);

		try {
			const secretPayload = JSON.stringify({
				webhookUrl: normalizedWebhook || null,
			});

			const upsertResponse = await fetch("/api/integrations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspaceId,
					provider: "discord:announcements",
					secret: secretPayload,
				}),
			});
			const upsertData = await upsertResponse.json().catch(() => ({}));
			if (!upsertResponse.ok) {
				setAnnouncementError(
					upsertData.error ?? "Announcement-Config konnte nicht gespeichert werden.",
				);
				return;
			}

			const patchResponse = await fetch("/api/integrations", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspaceId,
					provider: "discord:announcements",
					metadata: {
						guild_id: normalizedGuild || null,
						channel_id: normalizedChannel || null,
						account_slug: normalizedAccount || null,
						bot_only: announcementBotOnly,
					},
				}),
			});
			const patchData = await patchResponse.json().catch(() => ({}));
			if (!patchResponse.ok) {
				setAnnouncementError(
					patchData.error ?? "Announcement-Metadaten konnten nicht gespeichert werden.",
				);
				return;
			}

			setAnnouncementSuccess("Announcement-Config gespeichert.");
			router.refresh();
		} catch {
			setAnnouncementError("Netzwerkfehler.");
		} finally {
			setAnnouncementSaving(false);
		}
	}

	async function handleDisableAnnouncements() {
		setAnnouncementRemoving(true);
		setAnnouncementError(null);
		setAnnouncementSuccess(null);
		try {
			const response = await fetch("/api/integrations", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspaceId,
					provider: "discord:announcements",
				}),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				setAnnouncementError(
					data.error ?? "Announcement-Config konnte nicht entfernt werden.",
				);
				return;
			}
			setAnnouncementSuccess("Announcement-Config entfernt.");
			router.refresh();
		} catch {
			setAnnouncementError("Netzwerkfehler.");
		} finally {
			setAnnouncementRemoving(false);
		}
	}

	return (
		<Card className="border-border/80 bg-card/70">
			<CardContent className="pt-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
					<div className="shrink-0">
						<BrandLogo domain="discord.com" name="Discord" />
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-semibold leading-none">Discord</span>
							<Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
								Community
							</Badge>
							{accounts.length > 0 ? (
								<Badge variant="secondary" className="text-[10px]">
									{accounts.length} {accounts.length === 1 ? "Server" : "Server"}
								</Badge>
							) : (
								<Badge variant="outline" className="text-[10px] text-muted-foreground">
									Kein Server
								</Badge>
							)}
						</div>

						<p className="text-sm text-muted-foreground">
							Ankündigungen und Community-Updates direkt aus dem Agent in Discord-Channels veröffentlichen.
						</p>

						{accounts.length > 0 && (
							<div className="flex flex-col gap-1.5">
								{accounts.map((account) => {
									const meta = account.metadata ?? {};
									const slug = account.provider.replace("discord:", "");
									const guildName = meta.guild_name as string | undefined;
									const accountLabel = meta.label as string | undefined;
									return (
										<div
											key={account.provider}
											className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
										>
											<div className="flex flex-col">
												<span className="text-sm font-medium leading-none">
													{accountLabel ?? slug}
												</span>
												{guildName && (
													<span className="mt-0.5 font-mono text-xs text-muted-foreground">
														{guildName}
													</span>
												)}
											</div>
											<Button
												size="sm"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												disabled={removingSlug === slug}
												onClick={() => handleRemove(slug)}
											>
												{removingSlug === slug ? "…" : "Entfernen"}
											</Button>
										</div>
									);
								})}
							</div>
						)}

						{showForm ? (
							<form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/10 p-3">
								<p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
									Server hinzufügen
								</p>
								<Input
									className="border-border bg-muted/30 text-sm"
									placeholder="Label (z. B. oxom, community)"
									value={label}
									onChange={(e) => setLabel(e.target.value)}
									disabled={adding}
									pattern="[a-zA-Z0-9_-]+"
									title="Nur Buchstaben, Zahlen, _ und -"
								/>
								<Input
									className="border-border bg-muted/30 font-mono text-xs"
									placeholder="Bot Token (Discord Developer Portal → Bot)"
									value={botToken}
									onChange={(e) => setBotToken(e.target.value)}
									disabled={adding}
								/>
								<Input
									className="border-border bg-muted/30 font-mono text-xs"
									placeholder="Server ID (Rechtsklick auf Server → ID kopieren)"
									value={guildId}
									onChange={(e) => setGuildId(e.target.value)}
									disabled={adding}
								/>
								{addError && <p className="text-xs text-destructive">{addError}</p>}
								<div className="flex gap-2">
									<Button
										type="submit"
										size="sm"
										variant="outline"
										disabled={adding || !label.trim() || !botToken.trim() || !guildId.trim()}
									>
										{adding ? "Verbinden…" : "Verbinden"}
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => { setShowForm(false); setAddError(null); }}
										disabled={adding}
									>
										Abbrechen
									</Button>
								</div>
							</form>
						) : (
							<div>
								<Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
									+ Server hinzufügen
								</Button>
							</div>
						)}

							<div className="rounded-lg border border-border/50 bg-muted/10 p-3">
								<p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
									Announcements (DB Config)
								</p>
								<div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-2">
									<div className="min-w-0 flex-1">
										<p className="text-xs text-muted-foreground">
											{announcementGuildId
												? `Verbunden mit ${announcementGuildName || "Discord Server"}`
												: "Kein Discord-Server verbunden."}
										</p>
										{announcementGuildId ? (
											<p className="font-mono text-[11px] text-muted-foreground">
												Guild ID: {announcementGuildId}
											</p>
										) : null}
									</div>
									<Button asChild size="sm" variant="outline">
										<a href={announcementConnectHref}>
											{announcementGuildId ? "Server wechseln" : "Server verbinden"}
										</a>
									</Button>
								</div>
								<form onSubmit={handleSaveAnnouncements} className="mt-2 flex flex-col gap-2">
									{announcementGuildId ? (
										<div className="flex flex-col gap-1">
											<label className="text-[11px] text-muted-foreground">
												Announcement Channel
											</label>
											<select
												className="h-9 rounded-md border border-border bg-muted/30 px-3 text-sm outline-none"
												value={announcementChannelId}
												onChange={(e) => setAnnouncementChannelId(e.target.value)}
												disabled={announcementSaving || announcementRemoving}
											>
												<option value="">Channel auswählen…</option>
												{announcementChannels.map((channel) => (
													<option key={channel.id} value={channel.id}>
														#{channel.name}
													</option>
												))}
											</select>
											{announcementChannelsLoading ? (
												<p className="text-xs text-muted-foreground">Lade Channels…</p>
											) : null}
											{announcementChannelsError ? (
												<p className="text-xs text-destructive">
													{announcementChannelsError}
												</p>
											) : null}
										</div>
									) : null}
									<Input
										className="border-border bg-muted/30 font-mono text-xs"
										placeholder="Announcement Channel ID (manuell, optional)"
										value={announcementChannelId}
										onChange={(e) => setAnnouncementChannelId(e.target.value)}
										disabled={announcementSaving || announcementRemoving}
									/>
									<Input
										className="border-border bg-muted/30 text-xs"
										placeholder='Discord Account Slug (optional, z. B. "oxom")'
										value={announcementAccountSlug}
										onChange={(e) => setAnnouncementAccountSlug(e.target.value)}
										disabled={announcementSaving || announcementRemoving}
									/>
									<Input
										className="border-border bg-muted/30 font-mono text-xs"
										placeholder="Webhook URL (optional fallback)"
										value={announcementWebhookUrl}
										onChange={(e) => setAnnouncementWebhookUrl(e.target.value)}
										disabled={announcementSaving || announcementRemoving}
									/>
									<label className="flex items-center gap-2 text-xs text-muted-foreground">
										<input
											type="checkbox"
											checked={announcementBotOnly}
											onChange={(e) => setAnnouncementBotOnly(e.target.checked)}
											disabled={announcementSaving || announcementRemoving}
										/>
										Bot-only (kein Webhook-Fallback)
									</label>

									{announcementError ? (
										<p className="text-xs text-destructive">{announcementError}</p>
									) : null}
									{announcementSuccess ? (
										<p className="text-xs text-emerald-700 dark:text-emerald-400">
											{announcementSuccess}
										</p>
									) : null}

									<div className="flex gap-2">
										<Button
											type="submit"
											size="sm"
											variant="outline"
											disabled={announcementSaving || announcementRemoving}
										>
											{announcementSaving ? "Speichere…" : "Announcement speichern"}
										</Button>
										{announcementsIntegration ? (
											<Button
												type="button"
												size="sm"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												disabled={announcementSaving || announcementRemoving}
												onClick={handleDisableAnnouncements}
											>
												{announcementRemoving
													? "Entferne…"
													: "Announcement deaktivieren"}
											</Button>
										) : null}
									</div>
								</form>
							</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export function TwitchConnectBanner() {
	const params = useSearchParams();
	const connected = params.get("twitch_connected");
	const error = params.get("twitch_error");

	if (!connected && !error) return null;

	if (error) {
		return (
			<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
				Twitch-Verbindung fehlgeschlagen:{" "}
				<span className="font-mono">{decodeURIComponent(error)}</span>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
			Twitch erfolgreich verbunden.
		</div>
	);
}

export function TwitchProviderCard({ workspaceId, integration }: ProviderCardProps) {
	const router = useRouter();
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const connected = integration !== null;
	const meta = integration?.metadata as Record<string, unknown> | null | undefined;
	const channelName = (meta?.channel_name as string | undefined) ?? integration?.secret_hint ?? null;

	async function handleDisconnect() {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/integrations/twitch", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId }),
			});
			if (!res.ok) {
				const data = await res.json();
				setError(data.error ?? "Fehler beim Trennen.");
				return;
			}
			router.refresh();
		} catch {
			setError("Netzwerkfehler.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<ProviderCardShell
			logo={<BrandLogo domain="twitch.tv" name="Twitch" />}
			name="Twitch"
			category="Creator Platform"
			description="Live-Status, Stream-Infos und Channel-Metadaten abfragen — Titel und Kategorie direkt aus dem Workspace bearbeiten."
			connected={connected}
			hint={channelName}
			authType={integration?.auth_type ?? null}
		>
			{connected ? (
				<div className="flex flex-wrap gap-2">
					<Button size="sm" variant="outline" asChild>
						<a href={`/api/integrations/twitch/connect?workspaceId=${workspaceId}`}>
							Neu verbinden
						</a>
					</Button>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="text-destructive hover:text-destructive"
						disabled={loading}
						onClick={handleDisconnect}
					>
						{loading ? "…" : "Trennen"}
					</Button>
					{error && <p className="w-full text-xs text-destructive">{error}</p>}
				</div>
			) : (
				<Button size="sm" variant="outline" asChild>
					<a href={`/api/integrations/twitch/connect?workspaceId=${workspaceId}`}>
						Mit Twitch verbinden
					</a>
				</Button>
			)}
		</ProviderCardShell>
	);
}

// ─── Shared Shell ─────────────────────────────────────────────────────────────

function ProviderCardShell({
	logo,
	name,
	category,
	description,
	connected,
	hint,
	authType,
	children,
}: {
	logo: React.ReactNode;
	name: string;
	category: string;
	description: string;
	connected: boolean;
	hint: string | null;
	authType: string | null;
	children: React.ReactNode;
}) {
	return (
		<Card className="border-border/80 bg-card/70">
			<CardContent className="pt-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
					{/* Logo */}
					<div className="shrink-0">{logo}</div>

					{/* Info */}
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-semibold leading-none">{name}</span>
							<Badge
								variant="outline"
								className="text-[10px] font-normal text-muted-foreground"
							>
								{category}
							</Badge>
							{connected ? (
								<Badge variant="secondary" className="text-[10px]">
									Verbunden
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="text-[10px] text-muted-foreground"
								>
									Nicht verbunden
								</Badge>
							)}
							{connected && authType === "oauth2" && (
								<Badge
									variant="outline"
									className="text-[10px] text-muted-foreground"
								>
									OAuth 2.0
								</Badge>
							)}
						</div>

						<p className="text-sm text-muted-foreground">{description}</p>

						{connected && hint && (
							<p className="font-mono text-xs text-muted-foreground">{hint}</p>
						)}

						{children}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
