"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
	Delete02Icon,
	Loading03Icon,
	Logout01Icon,
	UserIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemSeparator,
	ItemTitle,
} from "@/components/ui/item";

const PROVIDER_LABELS: Record<string, string> = {
	oauth_google: "Google",
	oauth_github: "GitHub",
	oauth_discord: "Discord",
	oauth_twitch: "Twitch",
	oauth_dropbox: "Dropbox",
	oauth_apple: "Apple",
};

export function AccountView() {
	const { user, isLoaded } = useUser();
	const { signOut } = useClerk();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [username, setUsername] = useState("");
	const [profileSaving, setProfileSaving] = useState(false);
	const [avatarUploading, setAvatarUploading] = useState(false);
	const [disconnecting, setDisconnecting] = useState<string | null>(null);
	const [makingPrimary, setMakingPrimary] = useState<string | null>(null);
	const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

	if (!isLoaded || !user) {
		return (
			<div className="flex min-h-0 flex-1 items-center justify-center">
				<HugeiconsIcon
					icon={Loading03Icon}
					className="size-5 animate-spin text-muted-foreground"
				/>
			</div>
		);
	}

	const userInitials = (() => {
		const src = user.fullName?.trim() || user.username?.trim() || "U";
		const parts = src.split(/\s+/).filter(Boolean);
		if (parts.length >= 2)
			return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
		return (parts[0]?.slice(0, 2) || "U").toUpperCase();
	})();

	async function handleProfileSave() {
		if (!user) return;
		setProfileSaving(true);
		try {
			await user.update({
				firstName: firstName || user.firstName || undefined,
				lastName: lastName || user.lastName || undefined,
				username: username || user.username || undefined,
			});
			toast.success("Profil aktualisiert.");
			setFirstName("");
			setLastName("");
			setUsername("");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Fehler beim Speichern.";
			toast.error(msg);
		} finally {
			setProfileSaving(false);
		}
	}

	async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file || !user) return;
		setAvatarUploading(true);
		try {
			await user.setProfileImage({ file });
			toast.success("Profilbild aktualisiert.");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Upload fehlgeschlagen.";
			toast.error(msg);
		} finally {
			setAvatarUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	async function handleMakePrimary(emailId: string) {
		if (!user) return;
		setMakingPrimary(emailId);
		try {
			await user.update({ primaryEmailAddressId: emailId });
			toast.success("Primäre E-Mail-Adresse aktualisiert.");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Fehler.";
			toast.error(msg);
		} finally {
			setMakingPrimary(null);
		}
	}

	async function handleDeleteEmail(emailId: string) {
		const emailObj = user.emailAddresses.find((e) => e.id === emailId);
		if (!emailObj) return;
		setDeletingEmail(emailId);
		try {
			await emailObj.destroy();
			toast.success("E-Mail-Adresse entfernt.");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Fehler.";
			toast.error(msg);
		} finally {
			setDeletingEmail(null);
		}
	}

	async function handleDisconnect(accountId: string) {
		const account = user.externalAccounts.find((a) => a.id === accountId);
		if (!account) return;
		setDisconnecting(accountId);
		try {
			await account.destroy();
			toast.success("Verbindung getrennt.");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Fehler.";
			toast.error(msg);
		} finally {
			setDisconnecting(null);
		}
	}

	return (
		<main className="flex min-h-0 flex-1 flex-col gap-8">
			{/* Header */}
			<section className="space-y-4">
				<Badge
					variant="outline"
					className="border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
				>
					Account
				</Badge>
				<h1 className="flex items-center gap-2 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
					<HugeiconsIcon
						icon={UserIcon}
						size={28}
						className="h-7 w-7 shrink-0 text-muted-foreground"
					/>
					Mein Konto
				</h1>
				<p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
					Profil, E-Mail-Adressen und verbundene Konten verwalten.
				</p>
			</section>

			{/* Tabs */}
			<Tabs defaultValue="profile" className="flex min-h-0 flex-1 flex-col gap-4">
				<TabsList className="w-fit">
					<TabsTrigger value="profile">Profil</TabsTrigger>
					<TabsTrigger value="emails">E-Mail</TabsTrigger>
					<TabsTrigger value="connected">Verbundene Konten</TabsTrigger>
				</TabsList>

				{/* ── Profil ── */}
				<TabsContent value="profile" className="flex flex-col gap-5">
					<Card>
						<CardHeader>
							<CardTitle>Profilbild</CardTitle>
							<CardDescription>Wird in der Sidebar und bei Einladungen angezeigt.</CardDescription>
						</CardHeader>
						<CardContent className="flex items-center gap-4">
							<Avatar size="lg">
								<AvatarImage src={user.imageUrl} alt={user.fullName ?? ""} />
								<AvatarFallback>{userInitials}</AvatarFallback>
							</Avatar>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleAvatarChange}
							/>
							<Button
								variant="outline"
								size="sm"
								disabled={avatarUploading}
								onClick={() => fileInputRef.current?.click()}
							>
								{avatarUploading ? (
									<HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
								) : null}
								Bild ändern
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Name & Benutzername</CardTitle>
							<CardDescription>
								Aktuell: {user.fullName || "—"} · @{user.username || "—"}
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="grid grid-cols-2 gap-3">
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="firstName">Vorname</Label>
									<Input
										id="firstName"
										placeholder={user.firstName ?? "Vorname"}
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="lastName">Nachname</Label>
									<Input
										id="lastName"
										placeholder={user.lastName ?? "Nachname"}
										value={lastName}
										onChange={(e) => setLastName(e.target.value)}
									/>
								</div>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="username">Benutzername</Label>
								<Input
									id="username"
									placeholder={user.username ?? "benutzername"}
									value={username}
									onChange={(e) => setUsername(e.target.value)}
								/>
							</div>
							<Button
								size="sm"
								className="w-fit"
								disabled={profileSaving || (!firstName && !lastName && !username)}
								onClick={handleProfileSave}
							>
								{profileSaving ? (
									<HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
								) : null}
								Speichern
							</Button>
						</CardContent>
					</Card>

					<Separator />

					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Abmelden</p>
							<p className="text-xs text-muted-foreground">Von allen Geräten abmelden.</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() => void signOut({ redirectUrl: "/" })}
						>
							<HugeiconsIcon icon={Logout01Icon} className="size-4" />
							Abmelden
						</Button>
					</div>
				</TabsContent>

				{/* ── E-Mail ── */}
				<TabsContent value="emails" className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle>E-Mail-Adressen</CardTitle>
							<CardDescription>
								Die primäre Adresse wird für Login und Benachrichtigungen verwendet.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							<ItemGroup>
								{user.emailAddresses.map((email, i) => {
									const isPrimary = email.id === user.primaryEmailAddressId;
									return (
										<>
											{i > 0 && <ItemSeparator key={`sep-${email.id}`} />}
											<Item key={email.id} size="sm">
												<ItemContent>
													<ItemTitle>
														{email.emailAddress}
														{isPrimary && (
															<Badge variant="outline" className="text-[10px]">
																Primär
															</Badge>
														)}
													</ItemTitle>
													<ItemDescription>
														{email.verification?.status === "verified"
															? "Verifiziert"
															: "Nicht verifiziert"}
													</ItemDescription>
												</ItemContent>
												<ItemActions>
													{!isPrimary &&
														email.verification?.status === "verified" && (
															<Button
																variant="ghost"
																size="sm"
																disabled={makingPrimary === email.id}
																onClick={() => void handleMakePrimary(email.id)}
															>
																{makingPrimary === email.id ? (
																	<HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
																) : (
																	<HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-4" />
																)}
																Als primär setzen
															</Button>
														)}
													{!isPrimary && (
														<Button
															variant="ghost"
															size="sm"
															className="text-destructive hover:text-destructive"
															disabled={deletingEmail === email.id}
															onClick={() => void handleDeleteEmail(email.id)}
														>
															{deletingEmail === email.id ? (
																<HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
															) : (
																<HugeiconsIcon icon={Delete02Icon} className="size-4" />
															)}
														</Button>
													)}
												</ItemActions>
											</Item>
										</>
									);
								})}
							</ItemGroup>
						</CardContent>
					</Card>
				</TabsContent>

				{/* ── Verbundene Konten ── */}
				<TabsContent value="connected" className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Verbundene Konten</CardTitle>
							<CardDescription>
								OAuth-Verbindungen die du mit diesem Konto verknüpft hast.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							{user.externalAccounts.length === 0 ? (
								<div className="px-6 py-8 text-center text-sm text-muted-foreground">
									Keine verbundenen Konten.
								</div>
							) : (
								<ItemGroup>
									{user.externalAccounts.map((account, i) => (
										<>
											{i > 0 && <ItemSeparator key={`sep-${account.id}`} />}
											<Item key={account.id} size="sm">
												<ItemContent>
													<ItemTitle>
														{PROVIDER_LABELS[account.provider] ?? account.provider}
													</ItemTitle>
													<ItemDescription>{account.emailAddress}</ItemDescription>
												</ItemContent>
												<ItemActions>
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive hover:text-destructive"
														disabled={disconnecting === account.id}
														onClick={() => void handleDisconnect(account.id)}
													>
														{disconnecting === account.id ? (
															<HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
														) : (
															<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
														)}
														Trennen
													</Button>
												</ItemActions>
											</Item>
										</>
									))}
								</ItemGroup>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</main>
	);
}
