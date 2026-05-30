"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons-pro/core-twotone-rounded";
import { Command as CommandPrimitive } from "cmdk";
import type * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function Command({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			data-slot="command"
			className={cn("flex h-full w-full overflow-hidden", className)}
			{...props}
		/>
	);
}

function CommandDialog({
	title = "Command Palette",
	description = "Search for a command to run...",
	children,
	className,
	showCloseButton = true,
	...props
}: React.ComponentPropsWithoutRef<typeof Dialog> & {
	title?: string;
	description?: string;
	className?: string;
	showCloseButton?: boolean;
}) {
	return (
		<Dialog {...props}>
			<DialogHeader className="sr-only">
				<DialogTitle>{title}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</DialogHeader>

			<DialogContent
				className={cn("overflow-hidden p-0 rounded-lg", className)}
				showCloseButton={showCloseButton}
			>
				<Command className="[&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4 flex-col-reverse">
					{children}
				</Command>
			</DialogContent>
		</Dialog>
	);
}

function CommandInput({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) {
	return (
		<div
			data-slot="command-input-wrapper"
			className="flex h-12 items-center gap-3 px-4 pb-4 pt-3 bg-zinc-900/30 backdrop-blur-sm rounded-sm"
		>
			<HugeiconsIcon
				icon={Search01Icon}
				size={16}
				className="size-4 shrink-0 opacity-50"
			/>
			<CommandPrimitive.Input
				data-slot="command-input"
				className={cn(
					"placeholder:text-zinc-500 flex h-12 w-full rounded-md bg-transparent py-3 text-sm text-zinc-100 outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function CommandList({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			data-slot="command-list"
			className={cn(
				"max-h-[360px] scroll-py-1 overflow-x-hidden overflow-y-auto scroll-smooth pt-2 pb-2 bg-zinc-900/30 backdrop-blur-sm rounded-lg",
				className,
			)}
			{...props}
		/>
	);
}

function CommandEmpty({
	...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			data-slot="command-empty"
			className="py-8 text-center text-sm text-zinc-500"
			{...props}
		/>
	);
}

function CommandGroup({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot="command-group"
			className={cn(
				"text-zinc-100 [&_[cmdk-group-heading]]:text-zinc-400 overflow-hidden p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider",
				className,
			)}
			{...props}
		/>
	);
}

function CommandSeparator({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			data-slot="command-separator"
			className={cn("bg-zinc-800/40 -mx-1 h-px my-2", className)}
			{...props}
		/>
	);
}

function CommandItem({
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			data-slot="command-item"
			className={cn(
				"data-[selected=true]:bg-zinc-800/60 data-[selected=true]:text-zinc-50 data-[selected=true]:backdrop-blur-sm data-[selected=true]:shadow-lg data-[selected=true]:shadow-zinc-900/30 [&_svg:not([class*='text-'])]:text-zinc-400 relative flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 outline-hidden select-none transition-all duration-200 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-zinc-800/40 hover:backdrop-blur-sm",
				className,
			)}
			{...props}
		/>
	);
}

function CommandShortcut({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="command-shortcut"
			className={cn(
				"text-zinc-500 ml-auto text-xs tracking-wider font-mono",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
};
