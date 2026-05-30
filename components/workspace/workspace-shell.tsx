"use client";

import { useClerk, useUser, OrganizationSwitcher } from "@clerk/nextjs";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
	DriveIcon,
	Exchange01Icon,
	FileEditIcon,
	Link02Icon,
	Settings02Icon,
	SparklesIcon,
	StarIcon,
	ZapIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkspaceCommandPalette } from "./workspace-command-palette";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useWorkspaceContext } from "./workspace-context";

interface WorkspaceShellProps {
	children: ReactNode;
}

type NavItem = {
	label: string;
	href: string;
	icon: IconSvgElement;
	exact?: boolean;
	tour?: string;
};

function toWorkspacePath(basePath: string, path?: string): string {
	const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";
	if (!basePath) return normalizedPath || "/";
	return normalizedPath ? `${basePath}${normalizedPath}` : basePath;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
	const pathname = usePathname();
	const { workspace, basePath, flags } = useWorkspaceContext();
	const { user } = useUser();
	const { signOut, setActive } = useClerk();
	const logoUrl = workspace.logo_url?.trim() || null;
	const brandColor = workspace.brand_color?.trim() || null;
	const [cmdOpen, setCmdOpen] = useState(false);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setCmdOpen(v => !v);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const openCmd = useCallback(() => setCmdOpen(true), []);

	// Sync the Clerk active org with the current workspace so OrganizationSwitcher
	// reflects the correct org when navigating between workspaces.
	useEffect(() => {
		if (!workspace.clerk_org_id) return;
		void setActive({ organization: workspace.clerk_org_id });
	}, [workspace.clerk_org_id, setActive]);

	const userName = user?.fullName?.trim() || "Konto";
	const userEmail = user?.primaryEmailAddress?.emailAddress || "";
	const userInitials = useMemo(() => {
		const src = user?.fullName?.trim() || user?.username?.trim() || "U";
		const parts = src.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
		return (parts[0]?.slice(0, 2) || "U").toUpperCase();
	}, [user?.fullName, user?.username]);

	const primaryNavItems = useMemo<NavItem[]>(() => {
		const items: NavItem[] = [
			{ label: "Drive", href: toWorkspacePath(basePath, "drive"), icon: DriveIcon, tour: "drive" },
			{ label: "Notes", href: toWorkspacePath(basePath, "notes"), icon: SparklesIcon, tour: "notes" },
			{ label: "Docs", href: toWorkspacePath(basePath, "docs"), icon: FileEditIcon },
		];
		if (flags.linkInBio) items.push({ label: "Link in Bio", href: toWorkspacePath(basePath, "links"), icon: Link02Icon });
		return items;
	}, [basePath, flags.linkInBio]);

	const utilityNavItems = useMemo<NavItem[]>(() => [
		{ label: "Integrations", href: toWorkspacePath(basePath, "integrations"), icon: ZapIcon },
		{ label: "Settings", href: toWorkspacePath(basePath, "settings"), icon: Settings02Icon },
	], [basePath]);

	const allNavItems = useMemo(() => [...primaryNavItems, ...utilityNavItems], [primaryNavItems, utilityNavItems]);

	const settingsHref = toWorkspacePath(basePath, "settings");

	const breadcrumbLabel = useMemo(() => {
		const relative = basePath && pathname.startsWith(basePath)
			? pathname.slice(basePath.length)
			: pathname;
		const firstSegment = relative.split("/").filter(Boolean)[0] ?? "";
		const match = allNavItems.find(
			(item) => item.href === toWorkspacePath(basePath, firstSegment),
		);
		return match?.label ?? (firstSegment ? firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1) : workspace.name);
	}, [pathname, basePath, allNavItems, workspace.name]);

	function isActive(item: NavItem): boolean {
		if (item.exact) return pathname === item.href;
		// Settings: match settings and all sub-pages
		if (item.href === settingsHref) return pathname === item.href || pathname.startsWith(`${item.href}/`);
		return pathname === item.href || pathname.startsWith(`${item.href}/`);
	}

	return (
		<SidebarProvider
			style={brandColor ? ({ "--brand": brandColor } as React.CSSProperties) : undefined}
		>
			<Sidebar collapsible="icon" variant="inset">
				{/* Header */}
				<SidebarHeader className="border-b border-border/80 px-2 py-3 group-data-[collapsible=icon]:px-0">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" asChild className="rounded-lg group-data-[collapsible=icon]:mx-auto">
								<Link href={toWorkspacePath(basePath)} className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
									<div
										className="flex aspect-square size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/80"
										style={!logoUrl ? { backgroundColor: brandColor ?? undefined } : undefined}
									>
										{logoUrl ? (
											<img src={logoUrl} alt="" className="h-full w-full object-cover" />
										) : (
											<span className="text-sm font-semibold text-white">
												{workspace.name.slice(0, 1)}
											</span>
										)}
									</div>
									<div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
										<span className="truncate font-semibold tracking-tight">{workspace.name}</span>
										<span className="truncate font-mono text-xs text-muted-foreground">/{workspace.slug}</span>
									</div>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>

					{/* ⌘K Command palette trigger */}
					<button
						onClick={openCmd}
						className="group-data-[collapsible=icon]:hidden mt-1 flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 h-8 text-xs text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground cursor-pointer"
					>
						<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
							<circle cx="7" cy="7" r="4.25"/><path d="m10 10 3 3"/>
						</svg>
						<span className="flex-1 text-left">Suchen oder springen…</span>
						<kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
					</button>
				</SidebarHeader>

				{/* Content */}
				<SidebarContent className="gap-0">
					{/* Primary */}
					<SidebarGroup className="pt-3">
						<SidebarGroupContent>
							<SidebarMenu className="gap-0.5">
								{primaryNavItems.map((item) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											asChild
											isActive={isActive(item)}
											className="rounded-lg group-data-[collapsible=icon]:mx-auto"
										>
											<Link
												href={item.href}
												data-tour={item.tour}
												className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
											>
												<HugeiconsIcon icon={item.icon} className="size-4 shrink-0" />
												<span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>

					{/* Utility — pushed to bottom */}
					<SidebarGroup className="mt-auto border-t border-border/60 pt-2 pb-1">
						<SidebarGroupContent>
							<SidebarMenu className="gap-0.5">
								{utilityNavItems.map((item) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											asChild
											isActive={isActive(item)}
											className="rounded-lg group-data-[collapsible=icon]:mx-auto"
										>
											<Link
												href={item.href}
												className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
											>
												<HugeiconsIcon icon={item.icon} className="size-4 shrink-0" />
												<span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				{/* Footer */}
				<SidebarFooter className="border-t border-border/80 px-2 py-2 group-data-[collapsible=icon]:px-1">
					<SidebarMenu className="gap-1">
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton
										size="lg"
										className="rounded-lg group-data-[collapsible=icon]:mx-auto"
									>
										<Avatar size="sm">
											<AvatarImage src={user?.imageUrl} alt={userName} />
											<AvatarFallback>{userInitials}</AvatarFallback>
										</Avatar>
										<div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
											<span className="truncate font-medium">{userName}</span>
											{user?.username && <span className="truncate text-xs text-muted-foreground">@{user.username}</span>}
										</div>
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" side="right" className="w-56">
									<DropdownMenuLabel className="flex items-center gap-2 py-2">
										<Avatar size="sm">
											<AvatarImage src={user?.imageUrl} alt={userName} />
											<AvatarFallback>{userInitials}</AvatarFallback>
										</Avatar>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">{userName}</p>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<Link href={toWorkspacePath(basePath, "account")}>Mein Konto</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link href={toWorkspacePath(basePath, "organization")}>Organization</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link href="/switcher">
											<HugeiconsIcon icon={Exchange01Icon} className="size-4 shrink-0" />
											Workspace wechseln
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										variant="destructive"
										onSelect={(e) => { e.preventDefault(); void signOut({ redirectUrl: "/" }); }}
									>
										Abmelden
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>

					</SidebarMenu>
				</SidebarFooter>

				<SidebarRail />
			</Sidebar>

			<SidebarInset>
				{/* Mobile top bar — only visible when sidebar is hidden */}
				<header className="flex md:hidden items-center gap-3 border-b border-border/60 px-4 py-3 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
					<SidebarTrigger className="shrink-0" />
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="flex aspect-square size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/80 bg-muted/50">
							{logoUrl ? (
								<img src={logoUrl} alt="" className="h-full w-full object-cover" />
							) : (
								<span className="text-[10px] font-semibold text-foreground/90">
									{workspace.name.slice(0, 1)}
								</span>
							)}
						</div>
						<span className="truncate text-sm font-medium">{workspace.name}</span>
					</div>
				</header>
				<div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col gap-4 overflow-x-hidden px-4 py-3 md:gap-5 md:px-8 md:py-4 lg:px-10">
					<div className="flex min-h-0 flex-1 flex-col">{children}</div>
				</div>
			</SidebarInset>

			<WorkspaceCommandPalette
				open={cmdOpen}
				onClose={() => setCmdOpen(false)}
				basePath={basePath}
			/>
		</SidebarProvider>
	);
}
