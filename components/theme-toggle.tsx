"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun01Icon } from "@hugeicons-pro/core-twotone-rounded";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	if (!mounted) {
		return (
			<Button
				variant="ghost"
				size="icon"
				className="size-8 rounded-md"
				aria-label="Design wechseln"
				disabled
			>
				<HugeiconsIcon icon={Sun01Icon} size={14} className="size-3.5" />
			</Button>
		);
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			className="size-8 rounded-md text-muted-foreground transition-colors hover:text-foreground"
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
			aria-label={
				resolvedTheme === "dark"
					? "Zum hellen Design wechseln"
					: "Zum dunklen Design wechseln"
			}
		>
			{resolvedTheme === "dark" ? (
				<HugeiconsIcon icon={Sun01Icon} size={14} className="size-3.5" />
			) : (
				<HugeiconsIcon icon={Moon02Icon} size={14} className="size-3.5" />
			)}
		</Button>
	);
}
