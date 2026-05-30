"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface InviteMemberButtonProps {
	workspaceId: string;
}

const ROLES = ["MEMBER", "EDITOR", "MODERATOR", "ADMIN"] as const;

export function InviteMemberButton({ workspaceId }: InviteMemberButtonProps) {
	const [open, setOpen] = useState(false);
	const [role, setRole] = useState<(typeof ROLES)[number]>("MEMBER");
	const [isLoading, setIsLoading] = useState(false);
	const [inviteLink, setInviteLink] = useState<string | null>(null);

	async function handleGenerate() {
		setIsLoading(true);
		try {
			const response = await fetch("/api/members/invite", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId, role }),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				toast.error(payload?.error || "Link konnte nicht erstellt werden.");
				return;
			}

			setInviteLink(payload.inviteUrl);
		} catch {
			toast.error("Verbindungsfehler.");
		} finally {
			setIsLoading(false);
		}
	}

	async function handleCopy() {
		if (!inviteLink) return;
		await navigator.clipboard.writeText(inviteLink);
		toast.success("Link kopiert.");
	}

	function reset() {
		setInviteLink(null);
		setRole("MEMBER");
		setOpen(false);
	}

	return (
		<>
			<Button size="sm" className="rounded-md" onClick={() => setOpen(true)}>
				+ Einladen
			</Button>

			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) {
						reset();
						return;
					}
					setOpen(true);
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Mitglied einladen</DialogTitle>
						<DialogDescription>
							Generiere einen Einladungs-Link und teile ihn manuell. Der Link
							ist 7 Tage gültig.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4 py-2">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Rolle</Label>
							<Select
								value={role}
								onValueChange={(value) =>
									setRole(value as (typeof ROLES)[number])
								}
								disabled={Boolean(inviteLink)}
							>
								<SelectTrigger className="rounded-xl">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ROLES.map((entryRole) => (
										<SelectItem
											key={entryRole}
											value={entryRole}
											className="text-sm"
										>
											{entryRole}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{inviteLink ? (
							<div className="flex flex-col gap-1.5">
								<Label className="text-xs">Einladungs-Link</Label>
								<div className="flex gap-2">
									<Input
										readOnly
										value={inviteLink}
										className="rounded-xl font-mono text-xs"
										onClick={(event) => {
											event.currentTarget.select();
										}}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="shrink-0 rounded-xl"
										onClick={handleCopy}
									>
										Kopieren
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									Link ist 7 Tage gültig und kann einmalig verwendet werden.
								</p>
							</div>
						) : null}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className="rounded-md"
							onClick={reset}
						>
							Schließen
						</Button>
						{!inviteLink ? (
							<Button
								type="button"
								className="rounded-md"
								disabled={isLoading}
								onClick={handleGenerate}
							>
								{isLoading ? "Wird erstellt..." : "Link generieren"}
							</Button>
						) : null}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
