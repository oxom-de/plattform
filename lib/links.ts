// lib/link.ts
export interface Link {
	id: string;
	key: string;
	url: string;
	domain: string;
	archived: boolean;
	expiresAt: string | null;
	password: string | null;
	title: string | null;
	description: string | null;
	image: string | null;
	clicks: number;
	createdAt: string;
	updatedAt: string;
}

// Neue Interfaces hinzufügen:
export interface LinksResponse {
	data: Link[];
	pagination: {
		page: number;
		pageSize: number;
		total: number;
		totalPages: number;
	};
}

export interface LinkFilters {
	domain?: string;
	tagId?: string;
	search?: string;
	userId?: string;
	showArchived?: boolean;
	withTags?: boolean;
	sort?: "createdAt" | "clicks" | "lastClicked";
	page?: number;
	pageSize?: number;
}
