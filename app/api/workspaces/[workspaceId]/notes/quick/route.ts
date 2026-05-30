import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccessByIdOrServiceToken } from "@/lib/authz/workspace-service-token";
import { checkRateLimit, rateLimitedResponse } from "@/lib/security/rate-limit";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

interface RouteContext {
	params: Promise<{ workspaceId: string }>;
}

const createQuickNoteSchema = z.object({
	content: z.string().trim().min(1).max(20_000),
	title: z.string().trim().min(1).max(160).optional(),
});

function isMissingSchemaError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const code = (error as { code?: string }).code;
	const message = ((error as { message?: string }).message || "").toLowerCase();
	return (
		code === "42P01" ||
		code === "42703" ||
		code === "PGRST204" ||
		code === "PGRST205" ||
		message.includes("could not find the table")
	);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
	const { workspaceId } = await params;
	const access = await requireWorkspaceAccessByIdOrServiceToken(req, workspaceId);
	if (access instanceof NextResponse) return access;

	const limit = await checkRateLimit({
		tier: "links",
		route: "/api/workspaces/[workspaceId]/notes/quick",
		userId: access.userId,
		workspaceId: access.workspaceId,
	});
	if (!limit.allowed) return rateLimitedResponse(limit);

	const payload = await req.json().catch(() => ({}));
	const parsed = createQuickNoteSchema.safeParse(payload);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	const id = randomUUID();
	const createdAt = new Date().toISOString();
	const title = parsed.data.title || "Quick Note";
	const content = parsed.data.content;

	const supabase = createServerSupabaseAdminClient();
	const insertCandidates: Array<{
		table: string;
		payload: Record<string, unknown>;
	}> = [
		{
			table: "workspace_quick_notes",
			payload: {
				id,
				workspace_id: access.workspaceId,
				title,
				content,
				created_by: access.userId,
				created_at: createdAt,
			},
		},
		{
			table: "workspace_notes",
			payload: {
				id,
				workspace_id: access.workspaceId,
				title,
				content,
				created_by: access.userId,
				created_at: createdAt,
			},
		},
		{
			table: "workspace_live_notes",
			payload: {
				workspace_id: access.workspaceId,
				room_id: `${access.workspaceId}:quick`,
				note_id: id,
				content,
				updated_by: access.userId,
				updated_at: createdAt,
			},
		},
	];

	let lastError: { message?: string; code?: string } | null = null;

	for (const candidate of insertCandidates) {
		const result = await supabase.from(candidate.table).insert(candidate.payload);
		if (!result.error) {
			return NextResponse.json(
				{
					data: {
						id,
						title,
						createdAt,
					},
				},
				{ status: 201 },
			);
		}

		lastError = result.error;
		if (!isMissingSchemaError(result.error)) {
			return NextResponse.json(
				{ error: result.error.message || "Failed to create quick note" },
				{ status: 500 },
			);
		}
	}

	return NextResponse.json(
		{
			error:
				lastError?.message ||
				"No quick-note table found. Expected workspace_quick_notes/workspace_notes/workspace_live_notes.",
		},
		{ status: 501 },
	);
}
