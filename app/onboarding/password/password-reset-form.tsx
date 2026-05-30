"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const passwordResetSchema = z
	.object({
		password: z
			.string()
			.min(12, "Mindestens 12 Zeichen")
			.max(72, "Maximal 72 Zeichen"),
		confirmPassword: z.string().min(1, "Bitte wiederholen"),
	})
	.superRefine((value, ctx) => {
		if (value.password !== value.confirmPassword) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Passwörter stimmen nicht überein.",
				path: ["confirmPassword"],
			});
		}
	});

export function PasswordResetForm({
	username,
	redirectPath,
}: {
	username: string;
	redirectPath: string;
}) {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		const parsed = passwordResetSchema.safeParse({ password, confirmPassword });
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message || "Ungültige Eingabe.");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch("/api/account/password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					newPassword: parsed.data.password,
					redirectPath,
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(
					typeof payload?.error === "string" && payload.error.trim()
						? payload.error
						: `Passwort konnte nicht aktualisiert werden (${response.status}).`,
				);
				return;
			}

			const nextPath =
				typeof payload?.redirectPath === "string" && payload.redirectPath.trim()
					? payload.redirectPath
					: redirectPath;

			router.push(nextPath);
			router.refresh();
		} catch {
			setError("Verbindungsfehler. Bitte erneut versuchen.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Card className="w-full border-border/70 bg-card/70">
			<CardHeader>
				<CardTitle>Passwort ändern</CardTitle>
				<CardDescription>
					{username ? `Hi ${username}, ` : ""}
					bevor du weiterarbeiten kannst, musst du jetzt ein neues Passwort
					setzen.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form onSubmit={onSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="new-password">Neues Passwort</Label>
						<Input
							id="new-password"
							type="password"
							autoComplete="new-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirm-password">Passwort wiederholen</Label>
						<Input
							id="confirm-password"
							type="password"
							autoComplete="new-password"
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					{error ? (
						<p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
							{error}
						</p>
					) : null}

					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting ? "Wird gespeichert..." : "Passwort aktualisieren"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
