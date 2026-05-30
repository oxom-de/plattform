"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SignInCredentialsHintProps {
	username: string;
	tempPassword: string;
}

export function SignInCredentialsHint({
	username,
	tempPassword,
}: SignInCredentialsHintProps) {
	const [showPassword, setShowPassword] = useState(false);

	if (!username && !tempPassword) return null;

	return (
		<div className="flex w-full flex-col gap-3 rounded-xl border bg-muted/50 p-4 text-sm">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Deine Zugangsdaten
			</p>

			{username ? (
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs text-muted-foreground">Username</span>
					<code className="select-all rounded-md border bg-background px-2 py-1 font-mono text-xs">
						@{username}
					</code>
				</div>
			) : null}

			{tempPassword ? (
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs text-muted-foreground">Passwort</span>
					<div className="flex items-center gap-1.5">
						<code className="select-all rounded-md border bg-background px-2 py-1 font-mono text-xs">
							{showPassword ? tempPassword : "•".repeat(tempPassword.length)}
						</code>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							className="h-6 rounded-md px-2 text-[10px]"
							onClick={() => setShowPassword((value) => !value)}
						>
							{showPassword ? "Hide" : "Show"}
						</Button>
					</div>
				</div>
			) : null}

			<p className="text-xs leading-relaxed text-muted-foreground">
				Nach dem Login solltest du dein Passwort direkt ändern.
			</p>
		</div>
	);
}
