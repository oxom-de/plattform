"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InvitationItem {
	id: string;
	role: "ADMIN" | "MODERATOR" | "EDITOR" | "MEMBER";
	token: string;
	expires_at: string;
	created_at: string;
}

interface PendingInvitationsProps {
	invitations: InvitationItem[];
	workspaceId: string;
}

function getInviteBaseUrl() {
	const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
	if (explicit) {
		return explicit.replace(/\/+$/, "");
	}
	if (typeof window !== "undefined") {
		return window.location.origin;
	}
	return "";
}

export function PendingInvitations({
	invitations,
	workspaceId,
}: PendingInvitationsProps) {
	const router = useRouter();
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const inviteBaseUrl = useMemo(() => getInviteBaseUrl(), []);

	async function handleRevoke(invitationId: string) {
		setLoadingId(invitationId);
		try {
			const response = await fetch("/api/members/invite", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ invitationId, workspaceId }),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				toast.error(
					payload?.error || "Einladung konnte nicht widerrufen werden.",
				);
				return;
			}

			toast.success("Einladung widerrufen.");
			router.refresh();
		} catch {
			toast.error("Verbindungsfehler.");
		} finally {
			setLoadingId(null);
		}
	}

	async function handleCopy(token: string) {
		if (!inviteBaseUrl) {
			toast.error("Basis-URL fehlt. Setze NEXT_PUBLIC_APP_URL.");
			return;
		}
		const url = `${inviteBaseUrl}/invite/${token}`;
		await navigator.clipboard.writeText(url);
		toast.success("Einladungs-Link kopiert.");
	}

	return (
		<div className="flex flex-col gap-2">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Offene Einladungen
			</p>
			<div className="divide-y overflow-hidden rounded-xl border border-border">
				{invitations.length === 0 ? (
					<div className="px-4 py-4 text-sm text-muted-foreground">
						Keine offenen Einladungen.
					</div>
				) : (
					invitations.map((invitation) => {
						const expiresAt = new Date(invitation.expires_at);
						const createdAt = new Date(invitation.created_at);
						const daysLeft = Math.max(
							0,
							Math.ceil(
								(expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
							),
						);

						return (
							<div
								key={invitation.id}
								className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
							>
								<div className="flex min-w-0 flex-col gap-0.5">
									<div className="flex items-center gap-2">
										<Badge variant="secondary" className="rounded-full text-xs">
											{invitation.role}
										</Badge>
										<span className="text-xs text-muted-foreground">
											Erstellt {createdAt.toLocaleDateString("de-DE")}
										</span>
									</div>
									<span className="text-xs text-muted-foreground">
										Läuft ab in {daysLeft} Tag{daysLeft !== 1 ? "en" : ""}
									</span>
								</div>

								<div className="flex items-center gap-1.5">
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-7 rounded-full text-xs"
										onClick={() => {
											void handleCopy(invitation.token);
										}}
									>
										Link kopieren
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 rounded-full text-xs text-muted-foreground hover:text-destructive"
										disabled={loadingId === invitation.id}
										onClick={() => {
											void handleRevoke(invitation.id);
										}}
									>
										Widerrufen
									</Button>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
