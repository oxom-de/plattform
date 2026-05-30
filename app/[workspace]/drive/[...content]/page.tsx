import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DrivePreview } from "@/components/drive/drive-preview";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
	title: "Drive — Asset-Vorschau",
	description: "Dateivorschau im oxom Drive.",
};

interface DrivePreviewPageProps {
	params: Promise<{ content: string[] }>;
}

export default async function DrivePreviewPage({
	params,
}: DrivePreviewPageProps) {
	const { content: contentSegments } = await params;
	const content = Array.isArray(contentSegments)
		? contentSegments.join("/")
		: "";
	if (!content) {
		notFound();
	}

	return (
		<div className="flex min-h-screen flex-col">
			<SiteHeader />
			<main className="flex-1">
				<DrivePreview contentKey={content} />
			</main>
			<SiteFooter />
		</div>
	);
}
