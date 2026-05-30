import { GetObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccessBySlug } from "@/lib/authz/workspace-access";
import { getR2ForWorkspace } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
	const key = req.nextUrl.searchParams.get("key");
	if (!key) {
		return NextResponse.json({ error: "Missing key" }, { status: 400 });
	}

	const workspaceSlug = key.split("/")[0];
	if (!workspaceSlug) {
		return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
	}

	const access = await requireWorkspaceAccessBySlug(workspaceSlug);
	if (access instanceof NextResponse) return access;

	if (!key.startsWith(`${access.workspaceSlug}/`)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	try {
		const r2 = await getR2ForWorkspace(access.workspaceId);
		const command = new GetObjectCommand({ Bucket: r2.bucketName, Key: key });
		const object = await r2.client.send(command);

		if (!object.Body) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const headers = new Headers();
		if (object.ContentType) headers.set("Content-Type", object.ContentType);
		if (object.ContentLength) headers.set("Content-Length", String(object.ContentLength));
		headers.set("Cache-Control", "private, max-age=3600");

		return new Response(object.Body.transformToWebStream(), { status: 200, headers });
	} catch (err: any) {
		if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		console.error("[drive/proxy] R2 error", err);
		return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
	}
}
