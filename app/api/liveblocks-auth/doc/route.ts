import { type NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { requireWorkspaceAccessBySlug } from "@/lib/authz/workspace-access";

function getLiveblocksSecretKey() {
	const raw =
		process.env.LIVEBLOCKS_SECRET_KEY?.trim() ||
		process.env.LIVEBLOCKS_SECRET?.trim() ||
		"";
	return raw.replace(/^['"]|['"]$/g, "");
}

export async function POST(req: NextRequest) {
	const { workspaceSlug, roomId } = await req.json().catch(() => ({}));

	if (!workspaceSlug || !roomId) {
		return NextResponse.json({ error: "Missing workspaceSlug or roomId" }, { status: 400 });
	}

	const access = await requireWorkspaceAccessBySlug(workspaceSlug);
	if (access instanceof NextResponse) return access;

	const user = await currentUser();
	const name =
		user?.fullName?.trim() ||
		user?.username?.trim() ||
		user?.primaryEmailAddress?.emailAddress ||
		"Anonym";
	const avatar = user?.imageUrl ?? "";

	const secretKey = getLiveblocksSecretKey();
	if (!secretKey) {
		return NextResponse.json({ error: "LIVEBLOCKS_SECRET_KEY not configured" }, { status: 503 });
	}

	const response = await fetch("https://api.liveblocks.io/v2/authorize-user", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${secretKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			userId: access.userId,
			userInfo: { name, avatar },
			permissions: { [roomId]: ["room:write"] },
		}),
		cache: "no-store",
	});

	const data = await response.json().catch(() => null);
	if (!response.ok) {
		return NextResponse.json({ error: "Liveblocks auth failed", details: data }, { status: response.status });
	}

	return NextResponse.json(data);
}
