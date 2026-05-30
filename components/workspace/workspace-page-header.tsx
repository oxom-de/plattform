"use client";

import { OrganizationSwitcher } from "@clerk/nextjs";
import Link from "next/link";
import { Fragment } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbEntry {
	label: string;
	href?: string;
}

interface WorkspacePageHeaderProps {
	label: string;
	clerkOrgId?: string | null;
	/** Optional parent crumbs shown before the current page label */
	breadcrumbs?: BreadcrumbEntry[];
}

export function WorkspacePageHeader({ label, clerkOrgId, breadcrumbs }: WorkspacePageHeaderProps) {
	return (
		<div className="z-20 overflow-hidden rounded-xl border border-border/40 bg-background/75 backdrop-blur-xl md:sticky md:top-3">
			<div className="flex h-11 md:h-12 items-center justify-between gap-3 px-3 md:px-4">
				<div className="flex min-w-0 items-center gap-2">
					<SidebarTrigger className="size-7 md:size-8 shrink-0 rounded-md border border-border/60 hover:bg-muted/70" />
					<Breadcrumb>
						<BreadcrumbList>
							{breadcrumbs?.map((crumb, i) => (
								<Fragment key={`${crumb.label}-${i}`}>
									<BreadcrumbItem>
										{crumb.href ? (
											<BreadcrumbLink asChild>
												<Link href={crumb.href} className="text-sm">{crumb.label}</Link>
											</BreadcrumbLink>
										) : (
											<span className="text-sm text-muted-foreground">{crumb.label}</span>
										)}
									</BreadcrumbItem>
									<BreadcrumbSeparator />
								</Fragment>
							))}
							<BreadcrumbItem>
								<BreadcrumbPage className="text-sm">{label}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
				{clerkOrgId && (
					<div className="hidden shrink-0 sm:block">
						<OrganizationSwitcher
							hidePersonal
							afterSelectOrganizationUrl="/:slug"
							afterCreateOrganizationUrl="/:slug"
							appearance={{
								elements: {
									rootBox: "flex items-center",
									organizationSwitcherTrigger:
										"rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors text-sm",
								},
							}}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
