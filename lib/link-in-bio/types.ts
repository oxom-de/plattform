export type LinkInBioLinkItem = {
	id: string;
	label: string;
	url: string;
	is_ad: boolean;
	is_cal: boolean;
};

export type LinkInBioFeaturedLink = {
	label: string;
	url: string;
} | null;

export type LinkInBioProfile = {
	workspace_id: string;
	avatar_url: string | null;
	display_name: string;
	bio: string | null;
	featured_link: LinkInBioFeaturedLink;
	links: LinkInBioLinkItem[];
	social_links: LinkInBioLinkItem[];
	is_published: boolean;
	published_at: string | null;
	created_at: string | null;
	updated_at: string | null;
};

export type LinkInBioWorkspaceSummary = {
	id: string;
	slug: string;
	name: string;
	logo_url: string | null;
	hide_oxom_branding: boolean | null;
	verification_label: string | null;
};
