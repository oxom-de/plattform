"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type InviteState = "pending" | "expired" | "already_used";

interface WorkspaceInfo {
	id: string;
	name: string;
	slug: string;
}

interface InviteAcceptCardProps {
	state: InviteState;
	workspace: WorkspaceInfo | null;
	role: "ADMIN" | "MODERATOR" | "EDITOR" | "MEMBER" | null;
	token: string;
	userName?: string;
}

const ROLE_LABELS: Record<string, string> = {
	ADMIN: "Admin",
	MODERATOR: "Moderator",
	EDITOR: "Editor",
	MEMBER: "Member",
};

export function InviteAcceptCard({
	state,
	workspace,
	role,
	token,
	userName,
}: InviteAcceptCardProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	async function handleAccept() {
		setIsLoading(true);
		try {
			const response = await fetch("/api/members/accept", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token }),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				toast.error(
					payload?.error || "Einladung konnte nicht angenommen werden.",
				);
				return;
			}

			const workspaceSlug =
				typeof payload?.workspaceSlug === "string"
					? payload.workspaceSlug
					: workspace?.slug;
			if (!workspaceSlug) {
				toast.success("Einladung angenommen.");
				router.push("/switcher");
				return;
			}

			toast.success(`Willkommen bei ${workspace?.name || workspaceSlug}.`);
			router.push(`/${workspaceSlug}`);
		} catch {
			toast.error("Verbindungsfehler. Bitte erneut versuchen.");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<Card className="flex w-full max-w-sm flex-col gap-5 p-6">
				<div className="flex flex-col items-center gap-1 text-center">
					<p className="text-lg font-semibold tracking-tight">oxom</p>
				</div>

				{state === "pending" && workspace && role ? (
					<>
						<div className="flex flex-col gap-1 text-center">
							<p className="text-sm font-medium">
								{userName ? `Hey ${userName}, du` : "Du"} wurdest eingeladen
							</p>
							<p className="text-xs text-muted-foreground">
								Tritt dem Workspace{" "}
								<span className="font-medium text-foreground">
									{workspace.name}
								</span>{" "}
								bei als
							</p>
							<div className="mt-1 flex justify-center">
								<Badge variant="secondary" className="rounded-full text-xs">
									{ROLE_LABELS[role] || role}
								</Badge>
							</div>
						</div>

						<Button
							className="w-full rounded-md"
							onClick={() => void handleAccept()}
							disabled={isLoading}
						>
							{isLoading
								? "Wird beigetreten..."
								: `${workspace.name} beitreten`}
						</Button>

						<p className="text-center text-xs text-muted-foreground">
							Mit dem Beitreten stimmst du den Nutzungsbedingungen zu.
						</p>
					</>
				) : null}

				{state === "expired" ? (
					<div className="flex flex-col gap-3 text-center">
						<p className="text-sm font-medium">Einladung abgelaufen</p>
						<p className="text-xs text-muted-foreground">
							Dieser Einladungs-Link ist nicht mehr gültig. Bitte frage nach
							einem neuen Link.
						</p>
						<Button
							variant="outline"
							className="w-full rounded-md"
							onClick={() => router.push("/")}
						>
							Zur Startseite
						</Button>
					</div>
				) : null}

				{state === "already_used" ? (
					<div className="flex flex-col gap-3 text-center">
						<p className="text-sm font-medium">Link bereits verwendet</p>
						<p className="text-xs text-muted-foreground">
							Dieser Einladungs-Link wurde bereits eingelöst.
						</p>
						<Button
							variant="outline"
							className="w-full rounded-md"
							onClick={() => router.push("/")}
						>
							Zur Startseite
						</Button>
					</div>
				) : null}
			</Card>
		</div>
	);
}
