export type AuditAction =
	| "member.invited"
	| "member.joined"
	| "member.removed"
	| "member.role_changed"
	| "link.created"
	| "link.updated"
	| "link.deleted"
	| "domain.added"
	| "domain.removed"
	| "user.created"
	| "workspace.deleted"
	| "workspace.settings_changed"
	| "invite.revoked"
	| "file.deleted";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
	"member.invited": "Mitglied eingeladen",
	"member.joined": "Workspace beigetreten",
	"member.removed": "Mitglied entfernt",
	"member.role_changed": "Rolle geändert",
	"link.created": "Link erstellt",
	"link.updated": "Link aktualisiert",
	"link.deleted": "Link gelöscht",
	"domain.added": "Domain hinzugefügt",
	"domain.removed": "Domain entfernt",
	"user.created": "User erstellt",
	"workspace.deleted": "Workspace gelöscht",
	"workspace.settings_changed": "Workspace-Einstellungen geändert",
	"invite.revoked": "Einladung widerrufen",
	"file.deleted": "Datei gelöscht",
};

export const AUDIT_ACTION_SEVERITY: Record<
	AuditAction,
	"info" | "warning" | "critical"
> = {
	"member.invited": "info",
	"member.joined": "info",
	"member.removed": "warning",
	"member.role_changed": "warning",
	"link.created": "info",
	"link.updated": "info",
	"link.deleted": "warning",
	"domain.added": "info",
	"domain.removed": "warning",
	"user.created": "info",
	"workspace.deleted": "critical",
	"workspace.settings_changed": "critical",
	"invite.revoked": "warning",
	"file.deleted": "warning",
};
