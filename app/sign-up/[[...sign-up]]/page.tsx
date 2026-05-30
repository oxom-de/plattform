"use client";

import { SignUp } from "@clerk/nextjs";
import { FadeIn } from "@/components/motion/fade-in";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";

export default function Page() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<SiteHeader />
			<main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
				{/* Left – form */}
				<div className="flex flex-col items-center justify-center px-5 py-14 md:px-12 md:py-20">
					<FadeIn className="flex w-full max-w-md flex-col items-center gap-6">
						<Badge
							variant="outline"
							className="rounded-sm px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em]"
						>
							Registrieren
						</Badge>
						<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
							Konto erstellen
						</h1>
						<p className="text-sm text-muted-foreground">
							Erstelle dein Konto und starte mit oxom.
						</p>
						<SignUp />
					</FadeIn>
				</div>

				{/* Right – code snippet */}
				<div className="hidden items-center justify-center p-8 lg:flex">
					<div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-neutral-950 text-neutral-300">
						{/* Window chrome */}
						<div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
							<div className="h-3 w-3 rounded-full bg-neutral-700" />
							<div className="h-3 w-3 rounded-full bg-neutral-700" />
							<div className="h-3 w-3 rounded-full bg-neutral-700" />
							<span className="ml-3 font-mono text-xs text-neutral-500">
								oxom.ts
							</span>
						</div>
						{/* Code */}
						<div className="flex-1 overflow-hidden p-6">
							<pre className="font-mono text-sm leading-relaxed">
								<code>
									<span className="text-neutral-500">
										{"// Willkommen bei oxom\n"}
									</span>
									<span className="text-violet-400">{"import"}</span>
									{" { oxom } "}
									<span className="text-violet-400">{"from"}</span>{" "}
									<span className="text-emerald-400">{'"@oxom/sdk"'}</span>
									{"\n\n"}
									<span className="text-violet-400">{"const"}</span>
									{" client = "}
									<span className="text-amber-300">{"oxom"}</span>
									{"."}
									<span className="text-blue-400">{"create"}</span>
									{"({\n"}
									{"  "}
									<span className="text-neutral-100">{"name"}</span>
									{": "}
									<span className="text-emerald-400">{'"EasyStretcher"'}</span>
									{",\n"}
									{"  "}
									<span className="text-neutral-100">{"site"}</span>
									{": "}
									<span className="text-emerald-400">
										{'"EasyStretcher.com"'}
									</span>
									{",\n"}
									{"  "}
									<span className="text-neutral-100">{"streaming"}</span>
									{": "}
									<span className="text-emerald-400">{'"hls"'}</span>
									{",\n"}
									{"  "}
									<span className="text-neutral-100">{"auth"}</span>
									{": "}
									<span className="text-emerald-400">{'"clerk"'}</span>
									{",\n"}
									{"  "}
									<span className="text-neutral-100">{"billing"}</span>
									{": "}
									<span className="text-emerald-400">{'"stripe"'}</span>
									{",\n"}
									{"})\n\n"}
									<span className="text-violet-400">{"await"}</span>
									{" client."}
									<span className="text-blue-400">{"deploy"}</span>
									{"()\n\n"}
									<span className="text-neutral-500">
										{"// ✓ Live in 2.4s\n"}
									</span>
									<span className="text-neutral-500">
										{"// ✓ 22 Episodes synced\n"}
									</span>
									<span className="text-neutral-500">
										{"// ✓ HLS Mediathek ready"}
									</span>
								</code>
							</pre>
						</div>
					</div>
				</div>
			</main>
			<SiteFooter />
		</div>
	);
}
