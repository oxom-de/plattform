"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface CommandItem {
	label: string;
	hint: string;
	href: string;
}

interface CommandSection {
	group: string;
	items: CommandItem[];
}

interface WorkspaceCommandPaletteProps {
	open: boolean;
	onClose: () => void;
	basePath: string;
}

export function WorkspaceCommandPalette({ open, onClose, basePath }: WorkspaceCommandPaletteProps) {
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) inputRef.current?.focus();
		else setQuery("");
	}, [open]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		if (open) window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const sections: CommandSection[] = [
		{
			group: "Jump to",
			items: [
				{ label: "Drive",       hint: "Assets",     href: `${basePath}/drive` },
				{ label: "Notes",       hint: "Notizen",    href: `${basePath}/notes` },
				{ label: "Docs",        hint: "Dokumente",  href: `${basePath}/docs` },
				{ label: "Link in Bio", hint: "Public hub", href: `${basePath}/links` },
				{ label: "Integrations", hint: "Dub & Co",  href: `${basePath}/settings/integrations` },
				{ label: "Settings",    hint: "Workspace",  href: `${basePath}/settings` },
			],
		},
		{
			group: "Quick actions",
			items: [
				{ label: "Neue Notiz",      hint: "Notes", href: `${basePath}/notes` },
				{ label: "Asset hochladen", hint: "Drive", href: `${basePath}/drive` },
				{ label: "Neues Dokument",  hint: "Docs",  href: `${basePath}/docs` },
			],
		},
	];

	const filtered = sections.map(sec => ({
		...sec,
		items: sec.items.filter(item =>
			(item.label + " " + item.hint).toLowerCase().includes(query.toLowerCase())
		),
	})).filter(sec => sec.items.length > 0);

	if (!open) return null;

	return (
		<div
			onClick={onClose}
			style={{
				position: "fixed", inset: 0, zIndex: 200,
				background: "rgba(0,0,0,0.55)",
				backdropFilter: "blur(4px)",
				WebkitBackdropFilter: "blur(4px)",
				display: "flex", alignItems: "flex-start", justifyContent: "center",
				paddingTop: "14vh",
				animation: "oxom-fade 140ms ease",
			}}
		>
			<style>{`
				@keyframes oxom-fade { from { opacity: 0; } to { opacity: 1; } }
				@keyframes oxom-slide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
			`}</style>
			<div
				onClick={e => e.stopPropagation()}
				style={{
					width: "min(560px, 92vw)",
					background: "#141414",
					border: "1px solid #2A2A2A",
					borderRadius: 12,
					boxShadow: "0 24px 80px rgba(0,0,0,0.65)",
					overflow: "hidden",
					animation: "oxom-slide 160ms ease",
				}}
			>
				{/* Search input */}
				<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: "1px solid #1F1F1F" }}>
					<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#6E6E6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
						<circle cx="7" cy="7" r="4.25"/><path d="m10 10 3 3"/>
					</svg>
					<input
						ref={inputRef}
						value={query}
						onChange={e => setQuery(e.target.value)}
						placeholder="Befehl oder Seite suchen…"
						style={{
							flex: 1, background: "transparent", border: 0, outline: 0,
							color: "#FAFAFA", fontSize: 13, padding: 0, fontFamily: "inherit",
						}}
					/>
					<kbd style={{
						display: "inline-flex", alignItems: "center", justifyContent: "center",
						height: 20, padding: "0 5px", fontSize: 10.5,
						color: "#6E6E6E", background: "#1A1A1A", border: "1px solid #2A2A2A",
						borderBottomWidth: 2, borderRadius: 5, fontFamily: "ui-monospace, monospace",
					}}>ESC</kbd>
				</div>

				{/* Results */}
				<div style={{ maxHeight: 400, overflowY: "auto", padding: 6 }}>
					{filtered.length === 0 ? (
						<div style={{ padding: "28px 16px", color: "#6E6E6E", fontSize: 13, textAlign: "center" }}>
							Keine Ergebnisse für „{query}"
						</div>
					) : filtered.map(sec => (
						<div key={sec.group} style={{ marginBottom: 4 }}>
							<div style={{ padding: "9px 10px 5px", fontSize: 10.5, color: "#6E6E6E", letterSpacing: "0.1em", textTransform: "uppercase" }}>
								{sec.group}
							</div>
							{sec.items.map(item => (
								<Link
									key={item.label}
									href={item.href}
									onClick={onClose}
									style={{
										display: "flex", alignItems: "center", gap: 12,
										padding: "9px 10px", borderRadius: 8,
										color: "#FAFAFA", fontSize: 13, textDecoration: "none",
									}}
									onMouseEnter={e => (e.currentTarget.style.background = "#222222")}
									onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
								>
									<span style={{ flex: 1 }}>{item.label}</span>
									<span style={{ fontSize: 11.5, color: "#6E6E6E" }}>{item.hint}</span>
									<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#4A4A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
										<path d="M3 8h10m-4-4 4 4-4 4"/>
									</svg>
								</Link>
							))}
						</div>
					))}
				</div>

				{/* Footer */}
				<div style={{
					padding: "8px 14px", borderTop: "1px solid #1F1F1F",
					display: "flex", alignItems: "center", gap: 14,
					fontSize: 11, color: "#6E6E6E",
				}}>
					<span style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<Kbd>↵</Kbd> Öffnen
					</span>
					<span style={{ display: "flex", alignItems: "center", gap: 4 }}>
						<Kbd>↑</Kbd><Kbd>↓</Kbd> Navigieren
					</span>
					<span style={{ flex: 1 }}/>
					<span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10.5 }}>oxom · ⌘K</span>
				</div>
			</div>
		</div>
	);
}

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd style={{
			display: "inline-flex", alignItems: "center", justifyContent: "center",
			minWidth: 18, height: 18, padding: "0 4px", fontSize: 10,
			color: "#6E6E6E", background: "#1A1A1A", border: "1px solid #2A2A2A",
			borderBottomWidth: 2, borderRadius: 4, fontFamily: "ui-monospace, monospace",
		}}>
			{children}
		</kbd>
	);
}
