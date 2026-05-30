export type WorkspacePlan = "CORE" | "ELITE" | "CREATOR" | "AGENCY";

export type Workspace = {
	id: string;
	slug: string;
	name: string;
	plan: WorkspacePlan;
	root_domain: string | null;
	logo_url: string | null;
	brand_color: string | null;
	hide_oxom_branding: boolean | null;
	clerk_org_id: string | null;
};

export type DomainType = "CUSTOM" | "SUBDOMAIN" | "PATH";
export type DomainPurpose =
	| "PLATFORM_SUBDOMAIN"
	| "CUSTOM_DASHBOARD"
	| "ROOT_PREVIEW"
	| "LINK_IN_BIO";

export type Domain = {
	id: string;
	hostname: string;
	workspace_id: string;
	verified: boolean;
	primary: boolean;
	type: DomainType;
	purpose: DomainPurpose;
	vercel_domain_id?: string | null;
	verification_status?: string | null;
	last_verification_at?: string | null;
	created_at?: string;
	updated_at?: string;
};

export type MembershipRole = "ADMIN" | "MODERATOR" | "MEMBER";

export type Membership = {
	workspace_id: string;
	user_id: string;
	role: MembershipRole;
};

export type Feature = {
	workspace_id: string;
	feature_key: string;
	enabled: boolean;
	config: Record<string, unknown> | null;
};

export type BotCommand = {
	workspace_id: string;
	command: string;
	enabled: boolean;
	config: Record<string, unknown> | null;
};

export type Subscription = {
	workspace_id: string;
	status: string | null;
	stripe_subscription_id: string | null;
	current_period_end: string | null;
	cancel_at_period_end: boolean | null;
	stripe_price_id: string | null;
};

export type IntegrationStatus = "active" | "disabled" | "error";
export type IntegrationAuthType = "api_key" | "oauth2" | "bearer_token";

export type WorkspaceIntegration = {
	id: string;
	workspace_id: string;
	provider: string;
	status: IntegrationStatus;
	auth_type: IntegrationAuthType;
	encrypted_secret: string;
	secret_hint: string | null;
	metadata: Record<string, unknown> | null;
	created_by: string;
	created_at: string;
	updated_at: string;
};

export type WorkspaceIntegrationPublic = Omit<
	WorkspaceIntegration,
	"encrypted_secret"
>;

export type WorkspaceIntegrationAuditLog = {
	id: string;
	workspace_id: string;
	integration_id: string | null;
	provider: string;
	action: string;
	actor_id: string;
	metadata: Record<string, unknown> | null;
	created_at: string;
};

export type MediaStatus = "draft" | "processing" | "ready" | "archived";

export type MediaCollection = {
	id: string;
	workspace_id: string;
	title: string;
	order: number;
	created_at: string;
	updated_at: string;
};

export type MediaItem = {
	id: string;
	workspace_id: string;
	collection_id: string | null;
	title: string;
	slug: string;
	description: string | null;
	status: MediaStatus;
	hls_manifest_path: string | null;
	created_at: string;
	updated_at: string;
};
