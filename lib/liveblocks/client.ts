"use client";

import { createClient, type LiveList, type LiveObject } from "@liveblocks/client";
import { ClientSideSuspense, createRoomContext } from "@liveblocks/react";

export const client = createClient({
	publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

export type NoteData = {
	id: string;
	title: string;
	content: string;
};

type Storage = {
	notes: LiveList<LiveObject<NoteData>>;
};

const ctx = createRoomContext<Record<string, never>, Storage>(client);

const { RoomProvider, useMutation, useStatus } = ctx;
// Suspense variants — these throw while storage is loading, which is
// required when used inside <ClientSideSuspense>.
const { useStorage } = ctx.suspense;

export { RoomProvider, useStorage, useMutation, useStatus, ClientSideSuspense };
