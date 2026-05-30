import {
	AUDIT_ACTION_LABELS,
	AUDIT_ACTION_SEVERITY,
	type AuditAction,
} from "@/lib/audit/actions";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export interface AuditLogEntry {
	workspaceId: string;
	actorId: string;
	action: AuditAction;
	targetId?: string;
	targetLabel?: string;
	metadata?: Record<string, unknown>;
}

export async function auditLog(entry: AuditLogEntry): Promise<void> {
	try {
		const supabase = createServerSupabaseAdminClient();
		const { error } = await supabase.from("audit_logs").insert({
			workspace_id: entry.workspaceId,
			actor_id: entry.actorId,
			action: entry.action,
			target_id: entry.targetId ?? null,
			target_label: entry.targetLabel ?? null,
			metadata: entry.metadata ?? null,
		});

		if (error) {
			console.error("[audit] Failed to write log:", error.message, entry);
		}
	} catch (error) {
		console.error("[audit] Unexpected logger error:", error, entry);
	}
}

export { AUDIT_ACTION_LABELS, AUDIT_ACTION_SEVERITY, type AuditAction };
