"use client";

import { useState, useRef } from "react";
import type { Editor } from "@tiptap/react";
import TurndownService from "turndown";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	TextBoldIcon,
	TextItalicIcon,
	TextUnderlineIcon,
	TextStrikethroughIcon,
	ListViewIcon,
	LeftToRightListNumberIcon,
	LeftToRightBlockQuoteIcon,
	CodeIcon,
	CodeSquareIcon,
	MinusSignIcon,
	ImageAdd02Icon,
	Pdf01Icon,
	UndoIcon,
	RedoIcon,
	Maximize01Icon,
	Minimize01Icon,
	Download04Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { cn } from "@/lib/utils";

function exportMarkdown(editor: Editor, title: string) {
	const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
	const md = title ? `# ${title}\n\n${td.turndown(editor.getHTML())}` : td.turndown(editor.getHTML());
	const blob = new Blob([md], { type: "text/markdown" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${title || "dokument"}.md`;
	a.click();
	URL.revokeObjectURL(url);
}

function exportPrint(editor: Editor, title: string) {
	const html = editor.getHTML();
	const win = window.open("", "_blank", "width=900,height=700");
	if (!win) return;
	win.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${title || "Dokument"}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:2cm;color:#111;line-height:1.7;font-size:14px}
    h1{font-size:1.75rem;font-weight:700;margin:1.25rem 0 .5rem;letter-spacing:-.02em}
    h2{font-size:1.35rem;font-weight:700;margin:1.1rem 0 .4rem}
    h3{font-size:1.1rem;font-weight:600;margin:1rem 0 .35rem}
    p{margin:.5rem 0}
    ul,ol{padding-left:1.5rem;margin:.5rem 0}
    li{margin:.2rem 0}
    blockquote{border-left:3px solid #ddd;padding-left:1rem;color:#555;font-style:italic;margin:.75rem 0}
    pre{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:4px;padding:.75rem 1rem;margin:.75rem 0;overflow-x:auto;font-size:.8rem;line-height:1.6}
    code{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:3px;padding:.1em .3em;font-size:.85em;font-family:monospace}
    pre code{background:none;border:none;padding:0}
    img{max-width:100%;height:auto;border-radius:4px;margin:.75rem 0;display:block}
    hr{border:none;border-top:1px solid #ddd;margin:1.25rem 0}
    .doc-title{font-size:2rem;font-weight:700;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:2px solid #111}
    @media print{body{padding:0}}
  </style>
</head>
<body>
  ${title ? `<div class="doc-title">${title}</div>` : ""}
  ${html}
</body>
</html>`);
	win.document.close();
	win.focus();
	setTimeout(() => { win.print(); win.close(); }, 400);
}

const DRIVE_HOSTS = ["drive.oxom.co", "drive.oxom.de"];

function toDriveProxyUrl(raw: string): string {
	try {
		const u = new URL(raw);
		if (DRIVE_HOSTS.includes(u.hostname)) {
			const key = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
			if (key) return `/api/drive/proxy?key=${encodeURIComponent(key)}`;
		}
	} catch {
		// not a valid URL, use as-is
	}
	return raw;
}

function ExportDropdown({ editor, docTitle }: { editor: Editor; docTitle: string }) {
	const [open, setOpen] = useState(false);

	return (
		<div className="relative">
			{open && (
				<div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
			)}
			<button
				type="button"
				title="Exportieren"
				onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
				className={cn(
					"flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
					open && "bg-muted text-foreground",
				)}
			>
				<HugeiconsIcon icon={Download04Icon} size={13} />
			</button>

			{open && (
				<div className="absolute right-0 top-9 z-50 min-w-[160px] overflow-hidden rounded-lg border border-border bg-popover shadow-md">
					<button
						type="button"
						onMouseDown={(e) => { e.preventDefault(); exportMarkdown(editor, docTitle); setOpen(false); }}
						className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
					>
						<span className="font-mono text-[11px] font-medium text-muted-foreground">.md</span>
						<span>Markdown</span>
					</button>
					<button
						type="button"
						onMouseDown={(e) => { e.preventDefault(); exportPrint(editor, docTitle); setOpen(false); }}
						className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
					>
						<span className="font-mono text-[11px] font-medium text-muted-foreground">.pdf</span>
						<span>Als PDF drucken</span>
					</button>
				</div>
			)}
		</div>
	);
}

interface DocToolbarProps {
	editor: Editor | null;
	fullscreen?: boolean;
	onToggleFullscreen?: () => void;
	docTitle?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyChain = any;

function cmd(editor: Editor) {
	return editor.chain().focus() as AnyChain;
}

function ToolbarButton({
	active,
	onClick,
	children,
	title,
}: {
	active?: boolean;
	onClick: () => void;
	children: React.ReactNode;
	title?: string;
}) {
	return (
		<button
			type="button"
			title={title}
			onMouseDown={(e) => {
				e.preventDefault();
				onClick();
			}}
			className={cn(
				"flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
				active && "bg-muted text-foreground",
			)}
		>
			{children}
		</button>
	);
}

function Divider() {
	return <div className="mx-0.5 h-4 w-px bg-border/60" />;
}

function UrlInsertButton({
	editor,
	icon,
	title,
	placeholder,
	onInsert,
}: {
	editor: Editor;
	icon: React.ReactNode;
	title: string;
	placeholder: string;
	onInsert: (url: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [url, setUrl] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	function handleOpen(e: React.MouseEvent) {
		e.preventDefault();
		setOpen((v) => !v);
		setTimeout(() => inputRef.current?.focus(), 0);
	}

	function handleInsert() {
		const trimmed = url.trim();
		if (!trimmed) return;
		onInsert(trimmed);
		setUrl("");
		setOpen(false);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") handleInsert();
		if (e.key === "Escape") { setOpen(false); setUrl(""); }
	}

	return (
		<div className="relative">
			<button
				type="button"
				title={title}
				onMouseDown={handleOpen}
				className={cn(
					"flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
					open && "bg-muted text-foreground",
				)}
			>
				{icon}
			</button>

			{open && (
				<div className="absolute left-0 top-9 z-50 flex items-center gap-1.5 rounded-lg border border-border bg-popover px-2 py-1.5 shadow-md">
					<input
						ref={inputRef}
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						className="h-6 w-56 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
					/>
					<button
						type="button"
						onMouseDown={(e) => { e.preventDefault(); handleInsert(); }}
						className="shrink-0 rounded px-2 py-0.5 text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
					>
						Einfügen
					</button>
					<button
						type="button"
						onMouseDown={(e) => { e.preventDefault(); setOpen(false); setUrl(""); }}
						className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
					>
						✕
					</button>
				</div>
			)}
		</div>
	);
}

export function DocToolbar({ editor, fullscreen, onToggleFullscreen, docTitle = "" }: DocToolbarProps) {
	if (!editor) return null;

	return (
		<div className="flex flex-wrap items-center gap-0.5 border border-border/60 bg-muted/30 px-2 py-1.5">
			{/* Headings */}
			{([1, 2, 3] as const).map((level) => (
				<ToolbarButton
					key={level}
					title={`Heading ${level}`}
					active={editor.isActive("heading", { level })}
					onClick={() => cmd(editor).toggleHeading({ level }).run()}
				>
					<span className="text-[11px] font-semibold font-mono">H{level}</span>
				</ToolbarButton>
			))}

			<Divider />

			{/* Marks */}
			<ToolbarButton
				title="Fett"
				active={editor.isActive("bold")}
				onClick={() => cmd(editor).toggleBold().run()}
			>
				<HugeiconsIcon icon={TextBoldIcon} size={13} />
			</ToolbarButton>
			<ToolbarButton
				title="Kursiv"
				active={editor.isActive("italic")}
				onClick={() => cmd(editor).toggleItalic().run()}
			>
				<HugeiconsIcon icon={TextItalicIcon} size={13} />
			</ToolbarButton>
			<ToolbarButton
				title="Unterstrichen"
				active={editor.isActive("underline")}
				onClick={() => cmd(editor).toggleUnderline().run()}
			>
				<HugeiconsIcon icon={TextUnderlineIcon} size={13} />
			</ToolbarButton>
			<ToolbarButton
				title="Durchgestrichen"
				active={editor.isActive("strike")}
				onClick={() => cmd(editor).toggleStrike().run()}
			>
				<HugeiconsIcon icon={TextStrikethroughIcon} size={13} />
			</ToolbarButton>
			<ToolbarButton
				title="Inline Code"
				active={editor.isActive("code")}
				onClick={() => cmd(editor).toggleCode().run()}
			>
				<HugeiconsIcon icon={CodeIcon} size={13} />
			</ToolbarButton>

			<Divider />

			{/* Blocks */}
			<ToolbarButton
				title="Stichpunkte"
				active={editor.isActive("bulletList")}
				onClick={() => cmd(editor).toggleBulletList().run()}
			>
				<HugeiconsIcon icon={ListViewIcon} size={13} />
			</ToolbarButton>
			<ToolbarButton
				title="Nummerierte Liste"
				active={editor.isActive("orderedList")}
				onClick={() => cmd(editor).toggleOrderedList().run()}
			>
				<HugeiconsIcon icon={LeftToRightListNumberIcon} size={13} />
			</ToolbarButton>
			<ToolbarButton
				title="Zitat"
				active={editor.isActive("blockquote")}
				onClick={() => cmd(editor).toggleBlockquote().run()}
			>
				<HugeiconsIcon icon={LeftToRightBlockQuoteIcon} size={13} />
			</ToolbarButton>
			<ToolbarButton
				title="Code Block"
				active={editor.isActive("codeBlock")}
				onClick={() => cmd(editor).toggleCodeBlock().run()}
			>
				<HugeiconsIcon icon={CodeSquareIcon} size={13} />
			</ToolbarButton>
			<ToolbarButton
				title="Trennlinie"
				onClick={() => cmd(editor).setHorizontalRule().run()}
			>
				<HugeiconsIcon icon={MinusSignIcon} size={13} />
			</ToolbarButton>

			<Divider />

			{/* Image via URL */}
			<UrlInsertButton
				editor={editor}
				icon={<HugeiconsIcon icon={ImageAdd02Icon} size={13} />}
				title="Bild via URL einfügen"
				placeholder="https://… (jpg, png, gif, webp)"
				onInsert={(url) => (editor.chain().focus() as AnyChain).setImage({ src: toDriveProxyUrl(url) }).run()}
			/>

			{/* PDF via URL */}
			<UrlInsertButton
				editor={editor}
				icon={<HugeiconsIcon icon={Pdf01Icon} size={13} />}
				title="PDF via URL einbetten"
				placeholder="https://….pdf"
				onInsert={(url) => (editor.chain().focus() as AnyChain).insertContent({ type: "pdfEmbed", attrs: { src: toDriveProxyUrl(url) } }).run()}
			/>

			{/* Undo / Redo / Export / Fullscreen */}
			<div className="ml-auto flex items-center gap-0.5">
				<ToolbarButton
					title="Rückgängig"
					onClick={() => cmd(editor).undo().run()}
				>
					<HugeiconsIcon icon={UndoIcon} size={13} />
				</ToolbarButton>
				<ToolbarButton
					title="Wiederholen"
					onClick={() => cmd(editor).redo().run()}
				>
					<HugeiconsIcon icon={RedoIcon} size={13} />
				</ToolbarButton>
				<Divider />
				<ExportDropdown editor={editor} docTitle={docTitle} />
				{onToggleFullscreen && (
					<>
						<Divider />
						<ToolbarButton
							title={fullscreen ? "Vollbild beenden" : "Vollbild"}
							onClick={onToggleFullscreen}
						>
							<HugeiconsIcon icon={fullscreen ? Minimize01Icon : Maximize01Icon} size={13} />
						</ToolbarButton>
					</>
				)}
			</div>
		</div>
	);
}
