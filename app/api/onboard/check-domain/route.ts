import dns from "node:dns/promises";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
	domain: z
		.string()
		.trim()
		.min(3)
		.max(253)
		.regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
});

const TXT_PREFIX = "oxom-verify=";

function expectedRecord(domain: string): string {
	return `${TXT_PREFIX}${domain}`;
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const parsed = schema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ verified: false, error: "invalid_domain" },
				{ status: 400 },
			);
		}

		const domain = parsed.data.domain.toLowerCase();
		const expected = expectedRecord(domain);

		try {
			const records = await dns.resolveTxt(domain);
			const flat = records.flat();
			const verified = flat.some((r) => r === expected);

			return NextResponse.json({
				verified,
				expectedRecord: verified ? undefined : expected,
			});
		} catch {
			return NextResponse.json({
				verified: false,
				expectedRecord: expected,
			});
		}
	} catch {
		return NextResponse.json(
			{ verified: false, error: "server_error" },
			{ status: 500 },
		);
	}
}
