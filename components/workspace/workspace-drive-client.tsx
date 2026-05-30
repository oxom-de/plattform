"use client";

import { useState } from "react";
import CreatorFilesList from "@/components/drive/files-list";
import FileUpload from "@/components/file-upload";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface WorkspaceDriveClientProps {
	workspace: string;
}

export function WorkspaceDriveClient({ workspace }: WorkspaceDriveClientProps) {
	const [refreshToken, setRefreshToken] = useState(0);

	return (
		<div className="space-y-6">
			<Card className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-sm">
				<CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
					<CardTitle className="text-lg font-semibold tracking-tight">
						Upload
					</CardTitle>
					<CardDescription className="text-sm text-muted-foreground">
						Dateien landen im Workspace-Ordner{" "}
						<code className="rounded bg-muted/60 px-1.5 py-0.5 text-xs font-mono">
							{workspace}
						</code>
						.
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-5">
					<FileUpload
						creatorSlug={workspace}
						visibility="private"
						assetKind="file"
						onUploadSuccess={() => setRefreshToken((v) => v + 1)}
						className="min-w-0 flex-1 sm:min-w-[320px]"
					/>
				</CardContent>
			</Card>

			<Card className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 shadow-sm">
				<CardContent className="p-6">
					<CreatorFilesList
						creatorSlug={workspace}
						refreshToken={refreshToken}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
