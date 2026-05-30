"use client";

import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { SignInCredentialsHint } from "@/components/onboarding/sign-in-credentials-hint";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";

/* ─── Scenario data ─── */

type ChatMsg = { sender: "user" | "ai"; content: ReactNode; hasQr?: boolean };

const SCENARIOS: ChatMsg[][] = [
	// 1: Kurzlinks + QR
	[
		{
			sender: "user",
			content: "Erstelle mir einen Kurzlink für potenzielle Partner.",
		},
		{
			sender: "ai",
			content: (
				<>
					Klar! Hier ist dein Link:{" "}
					<span className="font-medium text-blue-500">
						oxom.co/partner-werden
					</span>{" "}
					— Brauchst du auch einen QR-Code?
				</>
			),
		},
		{ sender: "user", content: "Gerne." },
		{
			sender: "ai",
			content: (
				<>
					Dein QR-Code für{" "}
					<span className="font-medium text-blue-500">
						oxom.co/partner-werden
					</span>
					:
				</>
			),
			hasQr: true,
		},
	],
	// 2: Domain-Abfrage
	[
		{ sender: "user", content: "Wäre die Domain leon.us noch frei?" },
		{
			sender: "ai",
			content:
				"Nein, aber sie ist über den Aftermarkt kaufbar. Willst du sie registrieren?",
		},
		{ sender: "user", content: "Ja, bitte." },
		{
			sender: "ai",
			content: (
				<>
					Du kannst sie z.{"\u2009"}B. über{" "}
					<span className="font-medium text-blue-500">spaceship.com</span>{" "}
					registrieren. Soll ich weitere Alternativen prüfen?
				</>
			),
		},
	],
	// 3: Analytics
	[
		{ sender: "user", content: "Wie performt mein Link oxom.co/partner?" },
		{
			sender: "ai",
			content: (
				<>
					Diese Woche: <span className="font-semibold">342 Klicks</span> — 18%
					mehr als letzte Woche. Top: Deutschland, Österreich und die Schweiz.
				</>
			),
		},
		{ sender: "user", content: "Erstelle mir einen Report." },
		{
			sender: "ai",
			content: (
				<>
					Fertig! Dein Report:{" "}
					<span className="font-medium text-blue-500">
						oxom.co/report?=partner
					</span>{" "}
					— alle Daten der letzten 30 Tage.
				</>
			),
		},
	],
	// 4: Content
	[
		{
			sender: "user",
			content: "Schreibe eine kurze Beschreibung für meine Landingpage.",
		},
		{
			sender: "ai",
			content:
				'„Mit oxom erreichst du dein Publikum schneller. Kurzlinks, QR-Codes und Analytics — alles in einer Plattform."',
		},
		{ sender: "user", content: "Etwas kürzer bitte." },
		{
			sender: "ai",
			content:
				"„Dein Tool-Management. That's Oxom.\" — Soll ich das direkt einbauen?",
		},
	],
];

/* ─── Chat demo component ─── */

type VisibleMsg = {
	id: string;
	sender: "user" | "ai";
	content: ReactNode;
	hasQr?: boolean;
};

function ChatDemo() {
	const [messages, setMessages] = useState<VisibleMsg[]>([]);
	const [typing, setTyping] = useState(false);
	const [fading, setFading] = useState(false);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;

		function clear() {
			timers.current.forEach(clearTimeout);
			timers.current = [];
		}

		function schedule(fn: () => void, ms: number) {
			timers.current.push(
				setTimeout(() => {
					if (mounted.current) fn();
				}, ms),
			);
		}

		function run(idx: number) {
			clear();
			setMessages([]);
			setTyping(false);
			setFading(false);

			const scenario = SCENARIOS[idx];
			let delay = 600;

			scenario.forEach((msg, i) => {
				if (msg.sender === "ai") {
					const d1 = delay;
					schedule(() => setTyping(true), d1);
					delay += 1400;
					const d2 = delay;
					schedule(() => {
						setTyping(false);
						setMessages((prev) => [...prev, { ...msg, id: `${idx}-${i}` }]);
					}, d2);
					delay += 1600;
				} else {
					const d = delay;
					schedule(() => {
						setMessages((prev) => [...prev, { ...msg, id: `${idx}-${i}` }]);
					}, d);
					delay += 1200;
				}
			});

			// Fade out
			schedule(() => setFading(true), delay + 2500);

			// Next scenario
			schedule(() => run((idx + 1) % SCENARIOS.length), delay + 3500);
		}

		run(0);
		return () => {
			mounted.current = false;
			clear();
		};
	}, []);

	return (
		<>
			<style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
			<div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-neutral-50 dark:bg-neutral-950">
				{/* Header */}
				<div className="flex items-center gap-3 border-b border-border px-5 py-3">
					<div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
						O
					</div>
					<div>
						<p className="text-sm font-medium">oxom AI</p>
						<p className="text-[11px] text-emerald-500">Online</p>
					</div>
				</div>

				{/* Messages */}
				<div className="flex flex-1 flex-col gap-3 overflow-hidden p-5">
					<div
						className={`flex flex-col gap-3 transition-all duration-700 ${fading ? "-translate-y-4 opacity-0" : "opacity-100"}`}
					>
						{messages.map((msg) => (
							<div
								key={msg.id}
								className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
								style={{ animation: "slideIn 0.35s ease-out" }}
							>
								{msg.sender === "user" ? (
									<div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-foreground px-4 py-2.5 text-sm text-background">
										{msg.content}
									</div>
								) : (
									<div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border bg-background px-4 py-2.5 text-sm">
										{msg.content}
										{msg.hasQr && (
											<div className="mt-2">
												<Image
													src="/bg/partner-werden-qrcode.png"
													alt="QR-Code"
													width={80}
													height={80}
													className="rounded-md"
												/>
											</div>
										)}
									</div>
								)}
							</div>
						))}

						{typing && (
							<div
								className="flex justify-start"
								style={{ animation: "slideIn 0.25s ease-out" }}
							>
								<div className="flex gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-background px-4 py-3">
									<span
										className="h-2 w-2 rounded-full bg-muted-foreground"
										style={{ animation: "dotPulse 1.4s infinite 0s" }}
									/>
									<span
										className="h-2 w-2 rounded-full bg-muted-foreground"
										style={{ animation: "dotPulse 1.4s infinite 0.2s" }}
									/>
									<span
										className="h-2 w-2 rounded-full bg-muted-foreground"
										style={{ animation: "dotPulse 1.4s infinite 0.4s" }}
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Input bar */}
				<div className="border-t border-border px-4 py-3">
					<div className="flex items-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground">
						Nachricht eingeben...
					</div>
				</div>

				{/* Disclaimer */}
				<div className="px-4 pb-3">
					<p className="text-center text-[10px] leading-tight text-muted-foreground/60">
						Vorschau zur Veranschaulichung. Nicht alle Features sind aktuell in
						diesem Umfang verfügbar.
					</p>
				</div>
			</div>
		</>
	);
}

/* ─── Page ─── */

export default function Page() {
	const searchParams = useSearchParams();
	const usernameHint = searchParams.get("u") || "";

	return (
		<div className="min-h-screen bg-background text-foreground">
			<SiteHeader />
			<main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
				{/* Left – form */}
				<div className="flex flex-col items-center justify-center px-5 py-14 md:px-12 md:py-20">
					<FadeIn className="flex w-full max-w-md flex-col items-center gap-4">
						<Badge
							variant="outline"
							className="rounded-sm px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em]"
						>
							Anmelden
						</Badge>
						<SignIn />
						{usernameHint ? (
							<SignInCredentialsHint username={usernameHint} tempPassword="" />
						) : null}
					</FadeIn>
				</div>

				{/* Right – AI chat demo */}
				<div className="hidden items-center justify-center p-8 lg:flex">
					<ChatDemo />
				</div>
			</main>
			<SiteFooter />
		</div>
	);
}
