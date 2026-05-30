"use client";

import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function CreatorBadge() {
	return (
		<div className="flex justify-center">
			<p className="text-white/15 border-zinc-600 tracking-widest uppercase text-xl font-semibold mb-4">
				CRE
			</p>
		</div>
	);
}

export default function Page() {
	const { isSignedIn, isLoaded } = useUser();

	return (
		<div className="relative flex flex-col min-h-screen items-center justify-center gap-6 bg-transparent">
			<Image
				src="/bg/bg-berge.jpg"
				alt="Hintergrundbild Berge"
				fill
				priority
				className="object-cover -z-10"
			/>

			<div className="p-4 flex items-center justify-center z-10">
				<div className="flex flex-col gap-4 p-6 bg-white/85 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl backdrop-blur-xl items-center min-w-[320px] max-w-[95vw]">
					<div className="flex items-center gap-2">
						<Badge variant="destructive" className="uppercase tracking-wider">
							Kein Zugriff
						</Badge>
					</div>
					<h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center">
						Zugriff verweigert
					</h2>
					<p className="text-zinc-700 dark:text-zinc-300 text-base text-center">
						{!isLoaded ? (
							<>Lade Status ...</>
						) : !isSignedIn ? (
							<>
								Du bist nicht angemeldet. Bitte melde dich an, um auf diese
								Seite zuzugreifen.
							</>
						) : (
							<>Du hast keine Berechtigung, diese Seite zu sehen.</>
						)}
					</p>
					<div className="flex gap-3 pt-2">
						{!isSignedIn && (
							<Button asChild size="sm" variant="default">
								<Link href="/sign-in">Jetzt anmelden</Link>
							</Button>
						)}
						<Button
							asChild
							size="sm"
							variant="outline"
							className="border-zinc-300 dark:border-zinc-700"
						>
							<Link href="/">Zurück zur Startseite</Link>
						</Button>
					</div>
				</div>
			</div>

			<div className="z-40 text-xs border border-zinc-600 px-3 py-2 rounded-full backdrop-blur-xs text-white/80 absolute right-4 bottom-4 select-none pointer-events-none">
				Foto aus Innsbruck, AT
			</div>
		</div>
	);
}
