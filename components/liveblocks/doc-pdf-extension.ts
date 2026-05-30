import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DocPdfView } from "./doc-pdf-view";

export const PdfEmbed = Node.create({
	name: "pdfEmbed",
	group: "block",
	atom: true,

	addAttributes() {
		return {
			src: { default: null },
		};
	},

	parseHTML() {
		return [{ tag: "div[data-pdf]" }];
	},

	renderHTML({ HTMLAttributes }) {
		return ["div", mergeAttributes(HTMLAttributes, { "data-pdf": "" })];
	},

	addNodeView() {
		return ReactNodeViewRenderer(DocPdfView);
	},
});
