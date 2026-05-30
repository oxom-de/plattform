"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	CommandIcon,
	GlobeIcon,
	KeyboardIcon,
	LanguageCircleIcon,
	Settings01Icon,
	SparklesIcon,
	ZapIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

export default function CommandInfo() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					className="group relative overflow-hidden bg-gradient-to-br from-card/80 via-card to-accent/10 border-border/50 hover:border-accent/30 transition-all duration-500 backdrop-blur-sm shadow-lg hover:shadow-xl"
				>
					<div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
					<div className="relative flex items-center gap-2">
						<HugeiconsIcon
							icon={SparklesIcon}
							size={16}
							className="text-accent-foreground group-hover:text-primary transition-colors duration-300"
						/>
						<span className="font-medium tracking-tight">Schnellzugriff</span>
					</div>
				</Button>
			</DialogTrigger>

			<DialogContent className="max-w-2xl border-0 bg-gradient-to-br from-popover/95 via-popover to-accent/5 backdrop-blur-xl shadow-2xl">
				<div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
				<div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/3" />

				<DialogHeader className="relative">
					<DialogTitle className="flex items-center gap-4 text-2xl font-bold tracking-tight">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-border/30">
							<HugeiconsIcon
								icon={ZapIcon}
								size={24}
								className="text-primary"
							/>
						</div>
						<div>
							<h2 className="text-foreground">OXOM Schnellzugriff</h2>
							<p className="text-sm text-muted-foreground font-normal mt-1">
								Exklusive Tastenkombinationen & Funktionen
							</p>
						</div>
					</DialogTitle>
				</DialogHeader>

				<div className="relative space-y-8 mt-6">
					<div className="space-y-4">
						<div className="flex items-center gap-3 mb-6">
							<div className="h-1 w-8 bg-gradient-to-r from-primary to-accent rounded-full" />
							<h3 className="text-lg font-semibold text-foreground tracking-tight">
								Tastenkombinationen
							</h3>
						</div>

						<div className="grid gap-3">
							<div className="group flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-muted/20 via-muted/30 to-muted/20 hover:from-muted/30 hover:via-muted/40 hover:to-muted/30 transition-all duration-500 border border-border/30 hover:border-accent/40 backdrop-blur-sm">
								<div className="flex items-center gap-5">
									<Badge
										variant="outline"
										className="font-mono text-sm px-4 py-2 bg-background/90 backdrop-blur-sm border-border/60 hover:border-primary/40 transition-colors duration-300 shadow-sm"
									>
										<HugeiconsIcon
											icon={KeyboardIcon}
											size={16}
											className="mr-2 text-primary"
										/>
										⌘ + K
									</Badge>
									<span className="text-base font-medium text-foreground">
										Befehlspalette öffnen
									</span>
								</div>
								<HugeiconsIcon
									icon={CommandIcon}
									size={20}
									className="text-muted-foreground group-hover:text-primary transition-colors duration-300"
								/>
							</div>

							<div className="group flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-muted/20 via-muted/30 to-muted/20 hover:from-muted/30 hover:via-muted/40 hover:to-muted/30 transition-all duration-500 border border-border/30 hover:border-accent/40 backdrop-blur-sm">
								<div className="flex items-center gap-5">
									<Badge
										variant="outline"
										className="font-mono text-sm px-4 py-2 bg-background/90 backdrop-blur-sm border-border/60 hover:border-primary/40 transition-colors duration-300 shadow-sm"
									>
										<HugeiconsIcon
											icon={KeyboardIcon}
											size={16}
											className="mr-2 text-primary"
										/>
										⌘ + S
									</Badge>
									<span className="text-base font-medium text-foreground">
										Sidebar ein- / ausklappen
									</span>
								</div>
								<HugeiconsIcon
									icon={Settings01Icon}
									size={20}
									className="text-muted-foreground group-hover:text-primary transition-colors duration-300"
								/>
							</div>
						</div>
					</div>

					<div className="pt-8 border-t border-gradient-to-r from-transparent via-border/50 to-transparent">
						<div className="flex items-center gap-4 mb-6">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 backdrop-blur-sm border border-border/20">
								<HugeiconsIcon
									icon={GlobeIcon}
									size={20}
									className="text-accent-foreground"
								/>
							</div>
							<div>
								<h3 className="text-lg font-semibold text-foreground tracking-tight">
									Globale Verfügbarkeit
								</h3>
								<p className="text-sm text-muted-foreground">
									Mehrsprachige Unterstützung & Lokalisierung
								</p>
							</div>
						</div>

						<div className="flex items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-accent/5 via-accent/10 to-primary/5 border border-accent/20 backdrop-blur-sm shadow-inner">
							<Badge
								variant="secondary"
								className="bg-gradient-to-r from-accent/30 to-primary/20 text-accent-foreground border-accent/40 px-4 py-2 text-sm font-medium shadow-sm"
							>
								<HugeiconsIcon
									icon={LanguageCircleIcon}
									size={16}
									className="mr-2"
								/>
								Mehrsprachig
							</Badge>
							<div className="flex flex-row items-center justify-content gap-2">
								<p className="text-sm text-muted-foreground font-medium">
									Fortschritt:
								</p>
								<a
									title="Crowdin Lokalisierung"
									target="_blank"
									href="https://crowdin.com/project/oxom"
									className="hover:scale-105 transition-all duration-300 hover:shadow-lg"
									rel="noreferrer"
								>
									<Image
										src="https://badges.crowdin.net/oxom/localized.svg"
										alt="Crowdin Localization Badge"
										width={100}
										height={28}
										className="opacity-90 hover:opacity-100 transition-opacity duration-300 shadow-sm"
									/>
								</a>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
