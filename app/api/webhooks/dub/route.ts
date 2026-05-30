import "server-only";

import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getWorkspaceIntegrationRecord } from "@/lib/integrations/workspace-integrations";
interface LinkWebhookEvent {
	id?: string;
	event: string;
	data: {
		id?: string;
		shortLink?: string;
		url?: string;
		domain?: string;
		key?: string;
		createdAt?: string;
		[key: string]: unknown;
	};
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	const workspaceId = req.nextUrl.searchParams.get("workspaceId");
	if (!workspaceId) {
		return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
	}

	const rawBody = await req.text();

	// Look up the webhook secret stored in integration metadata
	const integration = await getWorkspaceIntegrationRecord(workspaceId, "dub");
	const webhookSecret = integration?.metadata?.webhook_secret as string | undefined;

	if (!webhookSecret) {
		console.warn(`[dub webhook] no webhook secret for workspace ${workspaceId}`);
		return NextResponse.json({ error: "Not configured" }, { status: 400 });
	}

	const sigResult = verifySignature(req, rawBody, webhookSecret);
	if (!sigResult.ok) {
		const reason = (sigResult as { ok: false; reason: string }).reason;
		console.error("[dub webhook] signature failed", {
			reason,
			svixId: req.headers.get("svix-id"),
			svixTimestamp: req.headers.get("svix-timestamp"),
			svixSignature: req.headers.get("svix-signature"),
			bodyLength: rawBody.length,
			secretPrefix: webhookSecret.slice(0, 12) + "…",
		});
		return NextResponse.json({ error: "Invalid signature", reason }, { status: 401 });
	}

	let payload: LinkWebhookEvent;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const event = payload.event;
	if (event !== "link.created" && event !== "link.updated" && event !== "link.deleted") {
		return NextResponse.json({ ok: true });
	}

	await logLinkEvent(workspaceId, event, payload);

	return NextResponse.json({ ok: true });
}

type VerifyResult = { ok: true } | { ok: false; reason: string };

// Dub signs with HMAC-SHA256 of the raw body.
// Header: dub-signature (hex-encoded).
// Key candidates: secret as-is, or without whsec_ prefix.
function verifySignature(
	req: NextRequest,
	body: string,
	secret: string,
): VerifyResult {
	try {
		const dubSig = req.headers.get("dub-signature");
		if (!dubSig) return { ok: false, reason: "missing dub-signature header" };

		const secretStripped = secret.replace(/^whsec_/, "");

		// Try both: stripped and full secret as HMAC key
		for (const key of [secretStripped, secret]) {
			const computed = crypto
				.createHmac("sha256", key)
				.update(body)
				.digest("hex");
			if (timingSafeEqual(computed, dubSig)) return { ok: true };
		}

		const fallback = crypto.createHmac("sha256", secretStripped).update(body).digest("hex");
		return { ok: false, reason: `computed=${fallback} received=${dubSig}` };
	} catch (e) {
		return { ok: false, reason: `exception: ${e instanceof Error ? e.message : String(e)}` };
	}
}

function timingSafeEqual(a: string, b: string): boolean {
	try {
		return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
	} catch {
		return false;
	}
}

async function logLinkEvent(
	workspaceId: string,
	event: string,
	payload: LinkWebhookEvent,
): Promise<void> {
	const supabase = createServerSupabaseAdminClient();
	await supabase.from("workspace_integration_audit_logs").insert({
		workspace_id: workspaceId,
		integration_id: null,
		provider: "dub",
		action: `webhook.${event}`,
		actor_id: "dub-webhook",
		metadata: {
			event_id: payload.id,
			link_id: payload.data.id,
			short_link: payload.data.shortLink,
			url: payload.data.url,
			domain: payload.data.domain,
			key: payload.data.key,
			created_at: payload.data.createdAt,
		},
	});
}
