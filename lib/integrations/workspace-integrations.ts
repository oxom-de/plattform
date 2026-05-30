import "server-only";

import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { encrypt, decrypt, deriveSecretHint } from "@/lib/security/encryption";
import type {
	WorkspaceIntegration,
	WorkspaceIntegrationPublic,
	IntegrationStatus,
	IntegrationAuthType,
} from "@/lib/db/types";

function toPublic(row: WorkspaceIntegration): WorkspaceIntegrationPublic {
	const { encrypted_secret: _, ...rest } = row;
	return rest;
}

export async function getWorkspaceIntegrationSecret(
	workspaceId: string,
	provider: string,
): Promise<string | null> {
	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspace_integrations")
		.select("encrypted_secret, status")
		.eq("workspace_id", workspaceId)
		.eq("provider", provider.toLowerCase())
		.eq("status", "active")
		.maybeSingle<Pick<WorkspaceIntegration, "encrypted_secret" | "status">>();

	if (error || !data) return null;
	return decrypt(data.encrypted_secret);
}

export async function listWorkspaceIntegrations(
	workspaceId: string,
): Promise<WorkspaceIntegrationPublic[]> {
	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspace_integrations")
		.select("*")
		.eq("workspace_id", workspaceId)
		.order("provider", { ascending: true })
		.returns<WorkspaceIntegration[]>();

	if (error) return [];
	return (data ?? []).map(toPublic);
}

export async function getWorkspaceIntegrationRecord(
	workspaceId: string,
	provider: string,
): Promise<WorkspaceIntegrationPublic | null> {
	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspace_integrations")
		.select("*")
		.eq("workspace_id", workspaceId)
		.eq("provider", provider.toLowerCase())
		.eq("status", "active")
		.maybeSingle<WorkspaceIntegration>();

	if (error || !data) return null;
	return toPublic(data);
}

export type UpsertIntegrationInput = {
	workspaceId: string;
	provider: string;
	secret: string;
	secretHint?: string;
	authType?: IntegrationAuthType;
	metadata?: Record<string, unknown> | null;
	actorId: string;
};

export async function upsertWorkspaceIntegration(
	input: UpsertIntegrationInput,
): Promise<WorkspaceIntegrationPublic> {
	const supabase = createServerSupabaseAdminClient();
	const provider = input.provider.toLowerCase();
	const encryptedSecret = encrypt(input.secret);
	const secretHint = input.secretHint ?? deriveSecretHint(input.secret);

	const { data, error } = await supabase
		.from("workspace_integrations")
		.upsert(
			{
				workspace_id: input.workspaceId,
				provider,
				status: "active" as IntegrationStatus,
				auth_type: input.authType ?? "api_key",
				encrypted_secret: encryptedSecret,
				secret_hint: secretHint,
				metadata: input.metadata ?? {},
				created_by: input.actorId,
			},
			{ onConflict: "workspace_id,provider" },
		)
		.select("*")
		.single<WorkspaceIntegration>();

	if (error || !data) {
		throw new Error(
			`Failed to upsert integration: ${error?.message ?? "unknown"}`,
		);
	}

	await logAudit({
		workspaceId: input.workspaceId,
		integrationId: data.id,
		provider,
		action: "integration.connected",
		actorId: input.actorId,
	});

	return toPublic(data);
}

export async function disableWorkspaceIntegration(
	workspaceId: string,
	provider: string,
	actorId: string,
): Promise<void> {
	const supabase = createServerSupabaseAdminClient();
	const normalizedProvider = provider.toLowerCase();

	const { data, error } = await supabase
		.from("workspace_integrations")
		.update({ status: "disabled" as IntegrationStatus })
		.eq("workspace_id", workspaceId)
		.eq("provider", normalizedProvider)
		.select("id")
		.maybeSingle<{ id: string }>();

	if (error) {
		throw new Error(`Failed to disable integration: ${error.message}`);
	}

	await logAudit({
		workspaceId,
		integrationId: data?.id ?? null,
		provider: normalizedProvider,
		action: "integration.disabled",
		actorId,
	});
}

export async function updateWorkspaceIntegrationMetadata(
	workspaceId: string,
	provider: string,
	patch: Record<string, unknown>,
	actorId: string,
): Promise<void> {
	const supabase = createServerSupabaseAdminClient();
	const normalizedProvider = provider.toLowerCase();

	// Fetch current metadata first so we can merge
	const { data: existing } = await supabase
		.from("workspace_integrations")
		.select("id, metadata")
		.eq("workspace_id", workspaceId)
		.eq("provider", normalizedProvider)
		.eq("status", "active")
		.maybeSingle<{ id: string; metadata: Record<string, unknown> | null }>();

	if (!existing) {
		throw new Error("Integration not found");
	}

	const merged = { ...(existing.metadata ?? {}), ...patch };

	const { error } = await supabase
		.from("workspace_integrations")
		.update({ metadata: merged })
		.eq("id", existing.id);

	if (error) {
		throw new Error(`Failed to update metadata: ${error.message}`);
	}

	await logAudit({
		workspaceId,
		integrationId: existing.id,
		provider: normalizedProvider,
		action: "integration.metadata_updated",
		actorId,
	});
}

async function logAudit(input: {
	workspaceId: string;
	integrationId: string | null;
	provider: string;
	action: string;
	actorId: string;
}): Promise<void> {
	const supabase = createServerSupabaseAdminClient();
	await supabase.from("workspace_integration_audit_logs").insert({
		workspace_id: input.workspaceId,
		integration_id: input.integrationId,
		provider: input.provider,
		action: input.action,
		actor_id: input.actorId,
		metadata: null,
	});
}
