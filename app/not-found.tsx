import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<SiteHeader />

			<main className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-5 py-32 text-center md:px-8 md:py-48">
				<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
					Fehler
				</p>
				<h1 className="mt-4 font-mono text-8xl font-semibold tracking-tight text-foreground/10 md:text-[10rem]">
					404
				</h1>
				<p className="mt-4 text-xl font-semibold tracking-tight">
					Seite nicht gefunden.
				</p>
				<p className="mt-2 max-w-sm text-sm text-muted-foreground">
					Die Seite, die du suchst, existiert nicht oder wurde verschoben.
				</p>
				<div className="mt-8 flex flex-wrap justify-center gap-3">
					<Button asChild className="rounded-sm">
						<Link href="/">Zurück zur Startseite</Link>
					</Button>
					<Button asChild variant="outline" className="rounded-sm">
						<a href="mailto:support@oxom.de">Support kontaktieren</a>
					</Button>
				</div>
			</main>

			<SiteFooter />
		</div>
	);
}
