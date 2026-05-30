import { NextResponse } from "next/server";

export async function GET() {
	const checks: Record<string, string> = {};

	// 1. Check Chat API
	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/chat`, {
			method: "GET",
		});
		checks.chat = res.ok ? "ok" : `error: ${res.status}`;
	} catch (err) {
		checks.chat = `error: ${(err as Error).message}`;
	}

	// 2. Check Upload API
	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/upload`, {
			method: "GET",
		});
		checks.upload = res.ok ? "ok" : `error: ${res.status}`;
	} catch (err) {
		checks.upload = `error: ${(err as Error).message}`;
	}

	// 3. Check DB (falls du eine hast, z. B. Postgres/Prisma)
	try {
		// hier ggf. prisma.$queryRaw`SELECT 1` oder ähnliches
		checks.database = "ok";
	} catch (err) {
		checks.database = `error: ${(err as Error).message}`;
	}

	return NextResponse.json({
		status: "ok",
		service: "oxom",
		timestamp: new Date().toISOString(),
		checks,
	});
}
