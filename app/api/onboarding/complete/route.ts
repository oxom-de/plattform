import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({
	workspaceId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json().catch(() => ({}));
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
	}

	const supabase = createServerSupabaseAdminClient();
	const { workspaceId } = parsed.data;

	const { error } = await supabase
		.from("workspace_memberships")
		.update({ onboarding_completed: true })
		.eq("workspace_id", workspaceId)
		.eq("user_id", userId);

	if (error) {
		return NextResponse.json(
			{
				error: "Status konnte nicht gesetzt werden.",
				code: error.code || null,
			},
			{ status: 500 },
		);
	}

	return NextResponse.json({ success: true }, { status: 200 });
}
