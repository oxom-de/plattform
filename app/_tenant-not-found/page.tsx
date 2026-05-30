export default function TenantNotFoundPage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
			<p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
				404
			</p>
			<h1 className="text-2xl font-semibold tracking-tight">
				Workspace nicht gefunden
			</h1>
			<p className="max-w-sm text-sm text-muted-foreground">
				Diese Domain ist keinem Workspace zugeordnet.
			</p>
		</main>
	);
}
