"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Props = {
	workspaceId: string;
	existing: {
		connected: boolean;
		bucketName?: string;
		publicBaseUrl?: string;
		endpoint?: string;
	} | null;
};

export function DriveSettingsClient({ workspaceId, existing }: Props) {
	const [accountId, setAccountId] = useState("");
	const [accessKeyId, setAccessKeyId] = useState("");
	const [secretAccessKey, setSecretAccessKey] = useState("");
	const [bucketName, setBucketName] = useState(existing?.bucketName ?? "");
	const [publicBaseUrl, setPublicBaseUrl] = useState(existing?.publicBaseUrl ?? "");
	const [endpoint, setEndpoint] = useState(existing?.endpoint ?? "");

	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		setMessage(null);
		try {
			const res = await fetch("/api/integrations/r2", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspaceId,
					accountId,
					accessKeyId,
					secretAccessKey,
					bucketName,
					publicBaseUrl: publicBaseUrl || undefined,
					endpoint: endpoint || undefined,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				setMessage({ type: "error", text: data.error ?? "Fehler beim Speichern." });
			} else {
				setMessage({ type: "success", text: "Storage erfolgreich verbunden." });
				setAccountId("");
				setAccessKeyId("");
				setSecretAccessKey("");
			}
		} catch {
			setMessage({ type: "error", text: "Netzwerkfehler." });
		} finally {
			setSaving(false);
		}
	}

	async function handleRemove() {
		if (!confirm("Storage-Verbindung trennen?")) return;
		setRemoving(true);
		setMessage(null);
		try {
			const res = await fetch("/api/integrations/r2", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ workspaceId }),
			});
			const data = await res.json();
			if (!res.ok) {
				setMessage({ type: "error", text: data.error ?? "Fehler beim Trennen." });
			} else {
				setMessage({ type: "success", text: "Storage getrennt." });
			}
		} catch {
			setMessage({ type: "error", text: "Netzwerkfehler." });
		} finally {
			setRemoving(false);
		}
	}

	return (
		<div className="space-y-6 max-w-xl">
			{existing?.connected && (
				<div className="flex items-center justify-between rounded-lg border p-4">
					<div className="space-y-0.5">
						<p className="text-sm font-medium">
							Bucket: <span className="font-mono">{existing.bucketName}</span>
						</p>
						{existing.publicBaseUrl && (
							<p className="text-xs text-muted-foreground">{existing.publicBaseUrl}</p>
						)}
					</div>
					<Badge variant="outline" className="border-green-500/40 text-green-400">
						Verbunden
					</Badge>
				</div>
			)}

			<form onSubmit={handleSave} className="space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor="accountId">Account ID (R2)</Label>
					<Input
						id="accountId"
						value={accountId}
						onChange={(e) => setAccountId(e.target.value)}
						placeholder="abc123def456…"
						required
					/>
					<p className="text-xs text-muted-foreground">
						Cloudflare → R2 → Manage R2 API Tokens → Account ID
					</p>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="accessKeyId">Access Key ID</Label>
					<Input
						id="accessKeyId"
						value={accessKeyId}
						onChange={(e) => setAccessKeyId(e.target.value)}
						placeholder="Token Access Key ID"
						required
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="secretAccessKey">Secret Access Key</Label>
					<Input
						id="secretAccessKey"
						type="password"
						value={secretAccessKey}
						onChange={(e) => setSecretAccessKey(e.target.value)}
						placeholder="••••••••"
						required
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="bucketName">Bucket Name</Label>
					<Input
						id="bucketName"
						value={bucketName}
						onChange={(e) => setBucketName(e.target.value)}
						placeholder="mein-bucket"
						required
					/>
				</div>

				<Separator />

				<div className="space-y-1.5">
					<Label htmlFor="publicBaseUrl">Public Base URL <span className="text-muted-foreground">(optional)</span></Label>
					<Input
						id="publicBaseUrl"
						type="url"
						value={publicBaseUrl}
						onChange={(e) => setPublicBaseUrl(e.target.value)}
						placeholder="https://drive.example.com"
					/>
					<p className="text-xs text-muted-foreground">
						Custom Domain oder R2 Public URL — für öffentliche Download-Links.
					</p>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="endpoint">Custom Endpoint <span className="text-muted-foreground">(optional)</span></Label>
					<Input
						id="endpoint"
						type="url"
						value={endpoint}
						onChange={(e) => setEndpoint(e.target.value)}
						placeholder="https://…r2.cloudflarestorage.com"
					/>
					<p className="text-xs text-muted-foreground">
						Nur nötig bei S3-kompatiblen Anbietern (nicht Cloudflare R2).
					</p>
				</div>

				{message && (
					<p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-green-400"}`}>
						{message.text}
					</p>
				)}

				<div className="flex gap-2">
					<Button type="submit" disabled={saving}>
						{saving ? "Speichern…" : existing?.connected ? "Credentials aktualisieren" : "Storage verbinden"}
					</Button>
					{existing?.connected && (
						<Button
							type="button"
							variant="outline"
							disabled={removing}
							onClick={handleRemove}
						>
							{removing ? "Trennen…" : "Trennen"}
						</Button>
					)}
				</div>
			</form>
		</div>
	);
}
