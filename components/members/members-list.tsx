"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface MemberItem {
	membershipId: string;
	userId: string;
	username: string;
	email: string;
	avatarUrl: string | null;
	role: "ADMIN" | "MODERATOR" | "EDITOR" | "MEMBER";
	joinedAt: string;
	isSelf: boolean;
}

interface MembersListProps {
	members: MemberItem[];
	isAdmin: boolean;
	workspaceId: string;
}

const ROLES = ["ADMIN", "MODERATOR", "EDITOR", "MEMBER"] as const;

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("de-DE");
}

export function MembersList({
	members,
	isAdmin,
	workspaceId,
}: MembersListProps) {
	const router = useRouter();
	const [loadingId, setLoadingId] = useState<string | null>(null);

	async function handleRoleChange(
		membershipId: string,
		nextRole: MemberItem["role"],
	) {
		setLoadingId(membershipId);
		try {
			const response = await fetch("/api/members/role", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ membershipId, workspaceId, role: nextRole }),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				toast.error(payload?.error || "Rolle konnte nicht geändert werden.");
				return;
			}

			toast.success("Rolle aktualisiert.");
			router.refresh();
		} catch {
			toast.error("Verbindungsfehler.");
		} finally {
			setLoadingId(null);
		}
	}

	async function handleRemove(membershipId: string, username: string) {
		setLoadingId(membershipId);
		try {
			const response = await fetch("/api/members/remove", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ membershipId, workspaceId }),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				toast.error(payload?.error || "Member konnte nicht entfernt werden.");
				return;
			}

			toast.success(`@${username} wurde entfernt.`);
			router.refresh();
		} catch {
			toast.error("Verbindungsfehler.");
		} finally {
			setLoadingId(null);
		}
	}

	return (
		<div className="overflow-hidden rounded-xl border border-border bg-background/60">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Member</TableHead>
						<TableHead>Rolle</TableHead>
						<TableHead>Seit</TableHead>
						{isAdmin ? (
							<TableHead className="text-right">Aktion</TableHead>
						) : null}
					</TableRow>
				</TableHeader>
				<TableBody>
					{members.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={isAdmin ? 4 : 3}
								className="py-6 text-center text-sm text-muted-foreground"
							>
								Keine Members gefunden.
							</TableCell>
						</TableRow>
					) : (
						members.map((member) => (
							<TableRow key={member.membershipId}>
								<TableCell>
									<div className="flex items-center gap-2.5">
										<Avatar className="h-7 w-7">
											<AvatarImage src={member.avatarUrl || undefined} />
											<AvatarFallback className="text-[10px]">
												{(member.username === "—"
													? member.userId
													: member.username
												)
													.slice(0, 2)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="flex min-w-0 flex-col">
											<span className="truncate text-sm font-medium leading-none">
												@{member.username}
												{member.isSelf ? (
													<span className="ml-1.5 text-xs font-normal text-muted-foreground">
														(du)
													</span>
												) : null}
											</span>
											<span className="truncate text-xs text-muted-foreground">
												{member.email}
											</span>
										</div>
									</div>
								</TableCell>

								<TableCell>
									{isAdmin && !member.isSelf ? (
										<Select
											value={member.role}
											onValueChange={(value) => {
												if (value === member.role) return;
												void handleRoleChange(
													member.membershipId,
													value as MemberItem["role"],
												);
											}}
											disabled={loadingId === member.membershipId}
										>
											<SelectTrigger className="h-7 w-36 rounded-full text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{ROLES.map((role) => (
													<SelectItem
														key={role}
														value={role}
														className="text-xs"
													>
														{role}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									) : (
										<Badge
											variant={
												member.role === "ADMIN" ? "default" : "secondary"
											}
											className="rounded-full text-xs"
										>
											{member.role}
										</Badge>
									)}
								</TableCell>

								<TableCell className="text-xs text-muted-foreground">
									{formatDate(member.joinedAt)}
								</TableCell>

								{isAdmin ? (
									<TableCell className="text-right">
										{!member.isSelf ? (
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														className="h-7 rounded-full text-xs text-muted-foreground hover:text-destructive"
														disabled={loadingId === member.membershipId}
													>
														Entfernen
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															@{member.username} entfernen?
														</AlertDialogTitle>
														<AlertDialogDescription>
															Der User verliert sofort den Zugang zum Workspace.
															Der Clerk-Account bleibt bestehen.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Abbrechen</AlertDialogCancel>
														<AlertDialogAction
															className={cn(
																"bg-destructive text-white hover:bg-destructive/90",
															)}
															onClick={() => {
																void handleRemove(
																	member.membershipId,
																	member.username,
																);
															}}
														>
															Entfernen
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										) : null}
									</TableCell>
								) : null}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
