"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	LanguageCircleIcon,
	LaptopIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import Link from "next/link";
import * as React from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";

export function CommandMenu() {
	const [open, setOpen] = React.useState(false);

	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	return (
		<CommandDialog open={open} onOpenChange={setOpen} className="border-none">
			<div className="flex flex-col gap-2 border border-zinc-800/40 rounded-lg">
				<CommandInput placeholder="Suche nach Befehlen..." />
			</div>

			<CommandList className="mb-4">
				<CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
				<CommandGroup heading="Vorschläge">
					<CommandItem>
						<HugeiconsIcon icon={LaptopIcon} size={16} className="mr-2" />
						<Link href="/setup">Mein Setup</Link>
					</CommandItem>
					<CommandItem>
						<HugeiconsIcon
							icon={LanguageCircleIcon}
							size={16}
							className="mr-2"
						/>
						<Link
							href="https://crowdin.com/project/leon-us"
							target="_blank"
							rel="noopener noreferrer"
						>
							Übersetzen helfen
						</Link>
					</CommandItem>
				</CommandGroup>
				<CommandSeparator />
				<CommandGroup heading="Social Media">
					<CommandItem>
						<Link
							href="https://github.com/leondietrich/leon.us"
							target="_blank"
							rel="noopener noreferrer"
						>
							Github
						</Link>
					</CommandItem>
					<CommandItem>
						<Link
							href="https://instagram.com/leon.oxom"
							target="_blank"
							rel="noopener noreferrer"
						>
							Instagram
						</Link>
					</CommandItem>
					<CommandItem>
						<Link
							href="https://cal.com/leondietrich"
							target="_blank"
							rel="noopener noreferrer"
						>
							cal.com
						</Link>
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
