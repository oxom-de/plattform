const OXOM_API_BASE =
	process.env.OXOM_API_URL?.trim() || "http://localhost:2424";

export async function apiClient(
	path: string,
	options: RequestInit = {},
	token?: string,
): Promise<Response> {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const headers = new Headers(options.headers ?? {});

	if (!headers.has("Content-Type") && options.body) {
		headers.set("Content-Type", "application/json");
	}

	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	return fetch(`${OXOM_API_BASE}${normalizedPath}`, {
		...options,
		headers,
	});
}
