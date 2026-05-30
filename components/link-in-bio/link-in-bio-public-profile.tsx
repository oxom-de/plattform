import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LinkInBioProfile } from "@/lib/link-in-bio/types";
import { cn } from "@/lib/utils";

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkBadge01Icon } from '@hugeicons-pro/core-bulk-rounded';

interface LinkInBioPublicProfileProps {
	profile: LinkInBioProfile;
	workspaceName: string;
	workspaceSlug: string;
	verificationLabel?: string | null;
	showBranding?: boolean;
	className?: string;
}

type SocialPlatform =
	| "instagram"
	| "youtube"
	| "tiktok"
	| "x"
	| "linkedin"
	| "twitch"
	| "discord"
	| "github"
	| "mastodon"
	| "generic";

const SOCIAL_PLATFORM_ORDER: SocialPlatform[] = [
	"instagram",
	"youtube",
	"tiktok",
	"x",
	"linkedin",
	"twitch",
	"discord",
	"github",
	"mastodon",
	"generic",
];

const BRANDFETCH_CLIENT_ID =
	process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID ?? "1idhoohmpyTDaCuIsRI";

function resolveSocialPlatform(label: string, url: string): SocialPlatform {
	const normalizedLabel = label.trim().toLowerCase();
	const normalizedUrl = url.trim().toLowerCase();
	const haystack = `${normalizedLabel} ${normalizedUrl}`;

	if (haystack.includes("instagram")) return "instagram";
	if (haystack.includes("youtube") || haystack.includes("youtu.be"))
		return "youtube";
	if (haystack.includes("tiktok")) return "tiktok";
	if (
		haystack.includes("x.com") ||
		haystack.includes("twitter.com") ||
		normalizedLabel === "x" ||
		haystack.includes("twitter")
	) {
		return "x";
	}
	if (haystack.includes("linkedin")) return "linkedin";
	if (haystack.includes("twitch")) return "twitch";
	if (haystack.includes("discord")) return "discord";
	if (haystack.includes("github")) return "github";
	if (haystack.includes("mastodon")) return "mastodon";
	return "generic";
}

function getSocialPlatformRank(platform: SocialPlatform): number {
	return SOCIAL_PLATFORM_ORDER.indexOf(platform);
}

function extractHostname(value: string): string | null {
	const input = value.trim();
	if (!input) return null;

	try {
		const parsed = new URL(input);
		const host = parsed.hostname.trim().toLowerCase().replace(/^www\./, "");
		return host.includes(".") ? host : null;
	} catch {
		try {
			const parsed = new URL(`https://${input}`);
			const host = parsed.hostname.trim().toLowerCase().replace(/^www\./, "");
			return host.includes(".") ? host : null;
		} catch {
			return null;
		}
	}
}

function resolveBrandfetchDomain(
	platform: SocialPlatform,
	url: string,
): string | null {
	switch (platform) {
		case "instagram":
			return "instagram.com";
		case "youtube":
			return "youtube.com";
		case "tiktok":
			return "tiktok.com";
		case "x":
			return "x.com";
		case "linkedin":
			return "linkedin.com";
		case "twitch":
			return "twitch.tv";
		case "discord":
			return "discord.com";
		case "github":
			return "github.com";
		case "mastodon":
			return extractHostname(url) ?? "mastodon.social";
		default:
			return extractHostname(url);
	}
}

function getBrandfetchIconUrl(domain: string): string {
	return BRANDFETCH_CLIENT_ID
		? `https://cdn.brandfetch.io/${domain}/icon?c=${BRANDFETCH_CLIENT_ID}`
		: `https://cdn.brandfetch.io/${domain}/icon`;
}

function SocialPlatformIcon({ platform }: { platform: SocialPlatform }) {
	const baseClassName = "size-3.5";

	switch (platform) {
		case "instagram":
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					className={baseClassName}
					aria-hidden="true"
				>
					<rect x="2.5" y="2.5" width="11" height="11" rx="3.2" />
					<circle cx="8" cy="8" r="2.7" />
					<circle cx="11.2" cy="4.8" r="0.65" fill="currentColor" stroke="none" />
				</svg>
			);
		case "youtube":
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					className={baseClassName}
					aria-hidden="true"
				>
					<rect x="2.2" y="4" width="11.6" height="8" rx="2.2" />
					<path d="M7 6.6 10.2 8 7 9.4Z" fill="currentColor" stroke="none" />
				</svg>
			);
		case "tiktok":
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.6"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={baseClassName}
					aria-hidden="true"
				>
					<path d="M9.4 3.2v6.2a2.3 2.3 0 1 1-2-2.3" />
					<path d="M9.4 4.2c1 .9 1.8 1.3 3 1.3" />
				</svg>
			);
		case "x":
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={baseClassName}
					aria-hidden="true"
				>
					<path d="m3 3 10 10" />
					<path d="m13 3-10 10" />
				</svg>
			);
		case "linkedin":
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={baseClassName}
					aria-hidden="true"
				>
					<rect x="2.5" y="2.5" width="11" height="11" rx="2.4" />
					<circle cx="5.2" cy="6" r="0.8" fill="currentColor" stroke="none" />
					<path d="M5.2 7.8v3.4" />
					<path d="M7.6 11.2V7.8M7.6 9a1.5 1.5 0 0 1 2.9 0v2.2" />
				</svg>
			);
		case "twitch":
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={baseClassName}
					aria-hidden="true"
				>
					<path d="M3 3h10v7.2l-2.5 2.5H7.4L5.2 15v-2.3H3z" />
					<path d="M6.3 6.1v2.2M9.2 6.1v2.2" />
				</svg>
			);
		case "discord":
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={baseClassName}
					aria-hidden="true"
				>
					<path d="M4.2 11.4c1.1.8 2.3 1.2 3.8 1.2s2.7-.4 3.8-1.2c.4-1 .6-2 .6-3.1 0-1.7-1.4-3.1-3.1-3.1h-2.6c-1.7 0-3.1 1.4-3.1 3.1 0 1.1.2 2.1.6 3.1Z" />
					<circle cx="6.6" cy="8.8" r="0.7" fill="currentColor" stroke="none" />
					<circle cx="9.4" cy="8.8" r="0.7" fill="currentColor" stroke="none" />
				</svg>
			);
		case "github":
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={baseClassName}
					aria-hidden="true"
				>
					<path d="M8 13.2c-2.8 0-5-2.2-5-5a5 5 0 0 1 10 0c0 2-1.1 3.8-2.7 4.6" />
					<path d="M6.2 12.8v-2.1c0-.9-.7-1.6-1.6-1.6M9.8 12.8v-2.1c0-.9.7-1.6 1.6-1.6" />
				</svg>
			);
		case "mastodon":
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={baseClassName}
					aria-hidden="true"
				>
					<path d="M3.5 12.3V5.2c0-1.1.9-2 2-2h5c1.1 0 2 .9 2 2v7.1" />
					<path d="M5.1 11V7.3L8 9.7l2.9-2.4V11" />
				</svg>
			);
		default:
			return (
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.4"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={baseClassName}
					aria-hidden="true"
				>
					<path d="M6.4 9.6 9.6 6.4" />
					<path d="M5.2 11a2.1 2.1 0 0 1 0-3l1.2-1.2a2.1 2.1 0 0 1 3 0" />
					<path d="M10.8 5a2.1 2.1 0 0 1 0 3L9.6 9.2a2.1 2.1 0 0 1-3 0" />
				</svg>
			);
	}
}

function ProfileLink({
	label,
	href,
	featured = false,
	isAd = false,
}: {
	label: string;
	href: string;
	featured?: boolean;
	isAd?: boolean;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer noopener"
			className={cn(
				"group block rounded-xl border border-border/70 px-4 py-3 text-sm font-medium transition-colors",
				featured
					? "bg-foreground text-background hover:bg-foreground/90"
					: "bg-card/70 text-foreground hover:border-border hover:bg-card",
			)}
		>
			<span className="flex items-center justify-between gap-2">
				<span className="line-clamp-1">{label}</span>
				{isAd ? (
					<Badge
						variant="outline"
						className={cn(
							"shrink-0 px-1.5 py-0 text-[10px] uppercase tracking-[0.1em]",
							featured
								? "border-background/40 bg-background/10 text-background"
								: "border-border/70 bg-muted/40 text-foreground/80",
						)}
					>
						Werbung
					</Badge>
				) : null}
			</span>
			<span
				className={cn(
					"mt-0.5 block text-[11px]",
					featured ? "text-background/70" : "text-muted-foreground",
				)}
			>
				{href.replace(/^https?:\/\//, "")}
			</span>
		</a>
	);
}

export function LinkInBioPublicProfile({
	profile,
	workspaceName,
	workspaceSlug,
	verificationLabel = null,
	showBranding = true,
	className,
}: LinkInBioPublicProfileProps) {
	const displayName = profile.display_name?.trim() || workspaceName;
	const avatarUrl = profile.avatar_url?.trim() || null;
	const bio = profile.bio?.trim() || null;
	const regularLinks = profile.links.filter((link) => link.is_cal !== true);
	const sortedSocialLinks = profile.social_links
		.map((item, index) => ({
			item,
			index,
			platform: resolveSocialPlatform(item.label, item.url),
		}))
		.sort((a, b) => {
			const rankDiff =
				getSocialPlatformRank(a.platform) - getSocialPlatformRank(b.platform);
			if (rankDiff !== 0) return rankDiff;

			const labelDiff = a.item.label.localeCompare(b.item.label, "de", {
				sensitivity: "base",
			});
			if (labelDiff !== 0) return labelDiff;

			return a.index - b.index;
		})
		.slice(0, 6);

	return (
		<article
			className={cn(
				"mx-auto w-full max-w-lg rounded-3xl border border-border bg-background/90 p-6 backdrop-blur",
				className,
			)}
		>
			<header className="space-y-4 text-center">
				<div className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted/30">
					{avatarUrl ? (
						<img
							src={avatarUrl}
							alt={displayName}
							className="size-full object-cover"
						/>
					) : (
						<span className="text-2xl font-semibold tracking-tight text-foreground/80">
							{displayName.slice(0, 1)}
						</span>
					)}
				</div>
				<div className="space-y-1">
					<div className="flex items-center justify-center gap-1.5">
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">
							{displayName}
						</h1>
						{verificationLabel ? (
							<span className="inline-flex items-center gap-1">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<span
												className="inline-flex h-5 w-5 cursor-default items-center justify-center overflow-hidden rounded-[4px] border border-border/70 bg-card p-0"
												aria-label={verificationLabel}
											>
												<img
													src="/oxom-Icon.png"
													alt=""
													className="h-full w-full object-cover"
												/>
											</span>
										</TooltipTrigger>
										<TooltipContent
											side="top"
											className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em]"
										>
											{verificationLabel}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
								<HugeiconsIcon
									icon={CheckmarkBadge01Icon}
									size={16}
									className="text-sky-500"
								/>
							</span>
						) : null}
					</div>
					<p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
						@{workspaceSlug}
					</p>
				</div>
				{bio ? (
					<p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
						{bio}
					</p>
				) : null}

				{sortedSocialLinks.length > 0 ? (
					<div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2 pt-1">
						<p className="w-full text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/90">
							Connect
						</p>
						{sortedSocialLinks.map(({ item, platform }) => {
							const brandfetchDomain = resolveBrandfetchDomain(
								platform,
								item.url,
							);
							const brandfetchIconUrl = brandfetchDomain
								? getBrandfetchIconUrl(brandfetchDomain)
								: null;

							return (
								<a
									key={item.id}
									href={item.url}
									target="_blank"
									rel="noreferrer noopener"
									className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
								>
									<span className="inline-flex size-4 items-center justify-center overflow-hidden rounded-[4px] border border-border/60 bg-background/70 text-foreground/80">
										{brandfetchIconUrl ? (
											<img
												src={brandfetchIconUrl}
												alt=""
												loading="lazy"
												decoding="async"
												className="size-full object-contain"
											/>
										) : (
											<SocialPlatformIcon platform={platform} />
										)}
									</span>
									{item.label}
								</a>
							);
						})}
					</div>
				) : null}
			</header>

			<section className="mt-6 space-y-3">
				{profile.featured_link ? (
					<div className="space-y-2">
						<Badge
							variant="outline"
							className="border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
						>
							Featured
						</Badge>
						<ProfileLink
							label={profile.featured_link.label}
							href={profile.featured_link.url}
							featured
						/>
					</div>
				) : null}

				{regularLinks.map((link) => (
					<ProfileLink
						key={link.id}
						label={link.label}
						href={link.url}
						isAd={link.is_ad}
					/>
				))}
			</section>

			{showBranding ? (
				<p className="mt-6 text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground/90">
					<a
						href="https://oxom.de"
						target="_blank"
						rel="noopener noreferrer"
						className="no-underline hover:underline"
					>
						powered by oxom
					</a>
				</p>
			) : null}
		</article>
	);
}
