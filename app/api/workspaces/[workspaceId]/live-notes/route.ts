import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccessById } from "@/lib/authz/workspace-access";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

const saveLiveNoteSchema = z.object({
	roomId: z.string().min(1),
	noteId: z.string().min(1).max(120),
	content: z.string().max(20_000),
});

interface RouteContext {
	params: Promise<{ workspaceId: string }>;
}

function isMissingSchemaError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const code = (error as { code?: string }).code;
	const message = ((error as { message?: string }).message || "").toLowerCase();
	return (
		code === "42P01" ||
		code === "42703" ||
		code === "PGRST205" ||
		message.includes("could not find the table")
	);
}

function isOnConflictTargetError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const code = (error as { code?: string }).code;
	const message = ((error as { message?: string }).message || "").toLowerCase();
	return code === "42P10" || message.includes("on conflict");
}

function isDuplicateKeyError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const code = (error as { code?: string }).code;
	return code === "23505";
}

async function persistLiveNote(
	supabase: ReturnType<typeof createServerSupabaseAdminClient>,
	tableName: string,
	key: { workspace_id: string; room_id: string; note_id: string },
	row: {
		workspace_id: string;
		room_id: string;
		note_id: string;
		content: string;
		updated_by: string;
		updated_at: string;
	},
) {
	const upsert = await supabase.from(tableName).upsert(row, {
		onConflict: "workspace_id,room_id,note_id",
		ignoreDuplicates: false,
	});

	if (!upsert.error) return { ok: true as const, error: null };

	// Legacy schemas sometimes miss the expected ON CONFLICT constraint.
	if (!isOnConflictTargetError(upsert.error)) {
		return { ok: false as const, error: upsert.error };
	}

	const insert = await supabase.from(tableName).insert(row);
	if (!insert.error) return { ok: true as const, error: null };

	if (!isDuplicateKeyError(insert.error)) {
		return { ok: false as const, error: insert.error };
	}

	const update = await supabase
		.from(tableName)
		.update({
			content: row.content,
			updated_by: row.updated_by,
			updated_at: row.updated_at,
		})
		.match(key);

	if (update.error) {
		return { ok: false as const, error: update.error };
	}

	return { ok: true as const, error: null };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessById(workspaceId);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/live-notes",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = await req.json().catch(() => ({}));
	const parsed = saveLiveNoteSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid payload", details: parsed.error.issues },
			{ status: 400 },
		);
	}

	if (!parsed.data.roomId.startsWith(`${access.workspaceId}:`)) {
		return NextResponse.json(
			{ error: "Room does not belong to workspace" },
			{ status: 403 },
		);
	}

	const supabase = createServerSupabaseAdminClient();
	const row = {
		workspace_id: access.workspaceId,
		room_id: parsed.data.roomId,
		note_id: parsed.data.noteId,
		content: parsed.data.content,
		updated_by: access.userId,
		updated_at: new Date().toISOString(),
	};
	const key = {
		workspace_id: access.workspaceId,
		room_id: parsed.data.roomId,
		note_id: parsed.data.noteId,
	};

	const candidateTables = ["workspace_live_notes", "workspace_notes"];
	let lastError: unknown = null;

	for (const tableName of candidateTables) {
		const result = await persistLiveNote(supabase, tableName, key, row);

		if (result.ok) {
			return NextResponse.json({ success: true, table: tableName });
		}

		lastError = result.error;
		if (!isMissingSchemaError(result.error)) {
			const typed = result.error as { message?: string; code?: string } | null;
			return NextResponse.json(
				{
					error: typed?.message || "Failed to persist note",
					code: typed?.code || null,
					table: tableName,
				},
				{ status: 500 },
			);
		}
	}

	return NextResponse.json(
		{
			error:
				"Live note persistence table is missing. Apply schema for workspace_live_notes.",
			details: lastError,
		},
		{ status: 501 },
	);
}
