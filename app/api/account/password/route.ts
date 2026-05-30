import { auth, clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
	normalizeInternalRedirectPath,
	shouldForcePasswordChange,
	withForcePasswordChangeDisabled,
} from "@/lib/auth/password-reset";

export const runtime = "nodejs";

const schema = z.object({
	newPassword: z.string().min(12).max(72),
	redirectPath: z.string().optional(),
});

function toErrorMessage(error: unknown, fallback: string): string {
	if (!error || typeof error !== "object") return fallback;

	const maybeClerk = error as {
		errors?: Array<{ longMessage?: string; message?: string }>;
		message?: string;
	};

	const firstClerkMessage =
		maybeClerk.errors?.[0]?.longMessage || maybeClerk.errors?.[0]?.message;
	if (firstClerkMessage) return firstClerkMessage;

	if (typeof maybeClerk.message === "string" && maybeClerk.message.trim()) {
		return maybeClerk.message;
	}

	return fallback;
}

export async function POST(req: NextRequest) {
	const authState = await auth();
	if (!authState.userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json().catch(() => ({}));
	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
	}

	const redirectPath = normalizeInternalRedirectPath(
		parsed.data.redirectPath,
		"/switcher",
	);
	const clerk = await clerkClient();

	let user = null;
	try {
		user = await clerk.users.getUser(authState.userId);
	} catch {
		return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
	}

	if (!shouldForcePasswordChange(user)) {
		return NextResponse.json({ success: true, redirectPath }, { status: 200 });
	}

	try {
		await clerk.users.updateUser(authState.userId, {
			password: parsed.data.newPassword,
			skipPasswordChecks: false,
			signOutOfOtherSessions: false,
		});
	} catch (error) {
		return NextResponse.json(
			{ error: toErrorMessage(error, "Passwort konnte nicht gesetzt werden.") },
			{ status: 422 },
		);
	}

	try {
		await clerk.users.updateUserMetadata(authState.userId, {
			publicMetadata: withForcePasswordChangeDisabled(
				user.publicMetadata as Record<string, unknown> | null,
			),
		});
	} catch {
		return NextResponse.json(
			{
				error:
					"Passwort wurde gesetzt, aber der Onboarding-Status konnte nicht aktualisiert werden. Bitte erneut versuchen.",
			},
			{ status: 500 },
		);
	}

	return NextResponse.json({
		success: true,
		redirectPath,
	});
}
