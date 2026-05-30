"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PdfEmbed } from "./doc-pdf-extension";
import { DocImageView } from "./doc-image-view";
import { DocToolbar } from "./doc-toolbar";

const CollapsibleImage = Image.extend({
	addNodeView() {
		return ReactNodeViewRenderer(DocImageView);
	},
});

function TiptapEditor({ docTitle }: { docTitle: string }) {
	const [fullscreen, setFullscreen] = useState(false);
	const liveblocks = useLiveblocksExtension();

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			liveblocks,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			StarterKit.configure({
				undoRedo: false,
				heading: {
					levels: [1, 2, 3],
					HTMLAttributes: { class: "tiptap-heading" },
				},
				bulletList: { HTMLAttributes: { class: "tiptap-bullet-list" } },
				orderedList: { HTMLAttributes: { class: "tiptap-ordered-list" } },
				listItem: { HTMLAttributes: { class: "tiptap-list-item" } },
				paragraph: { HTMLAttributes: { class: "tiptap-paragraph" } },
			}) as any,
			Placeholder.configure({
				placeholder: "Schreibe hier…",
				emptyEditorClass: "tiptap-empty",
			}),
			TextAlign.configure({ types: ["heading", "paragraph"] }),
			Typography,
			CollapsibleImage.configure({ HTMLAttributes: { class: "tiptap-image" } }),
			PdfEmbed,
		],
		editorProps: {
			attributes: {
				class: "tiptap-editor focus:outline-none min-h-[60vh]",
			},
		},
	});

	if (fullscreen) {
		return (
			<div className="fixed inset-0 z-50 overflow-y-auto bg-background">
				<div className="sticky top-0 z-10 border-b border-border bg-background">
					<DocToolbar
						editor={editor}
						fullscreen={fullscreen}
						onToggleFullscreen={() => setFullscreen((v) => !v)}
						docTitle={docTitle}
					/>
				</div>
				<div className="mx-auto max-w-3xl px-6 py-10">
					<EditorContent editor={editor} />
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col">
			<div className="sticky top-0 z-10 border-b border-border bg-card">
				<DocToolbar
					editor={editor}
					fullscreen={fullscreen}
					onToggleFullscreen={() => setFullscreen((v) => !v)}
					docTitle={docTitle}
				/>
			</div>
			<div className="p-4 md:p-6">
				<EditorContent editor={editor} />
			</div>
		</div>
	);
}

export function DocEditor({ docTitle = "" }: { docTitle?: string }) {
	return <TiptapEditor docTitle={docTitle} />;
}
