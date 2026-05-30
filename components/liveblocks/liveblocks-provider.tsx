"use client";

import { LiveList, LiveObject } from "@liveblocks/client";
import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { ClientSideSuspense, RoomProvider } from "@/lib/liveblocks/client";
import type { NoteData } from "@/lib/liveblocks/client";

type OxomLiveblocksContextValue = {
	roomId: string;
	workspaceId: string;
};

const OxomLiveblocksContext = createContext<OxomLiveblocksContextValue | null>(
	null,
);

const INITIAL_NOTE: NoteData = { id: "note-1", title: "Notiz 1", content: "" };

export function OxomLiveblocksProvider({
	roomId,
	workspaceId,
	children,
}: {
	roomId: string;
	workspaceId: string;
	children: ReactNode;
}) {
	const value = useMemo(() => ({ roomId, workspaceId }), [roomId, workspaceId]);

	return (
		<OxomLiveblocksContext.Provider value={value}>
			<RoomProvider
				id={roomId}
				initialStorage={{
					notes: new LiveList([new LiveObject(INITIAL_NOTE)]),
				}}
			>
				<ClientSideSuspense fallback={null}>
					{children}
				</ClientSideSuspense>
			</RoomProvider>
		</OxomLiveblocksContext.Provider>
	);
}

export function useOxomLiveblocksRoom() {
	const value = useContext(OxomLiveblocksContext);
	if (!value) {
		throw new Error(
			"useOxomLiveblocksRoom must be used inside OxomLiveblocksProvider",
		);
	}
	return value;
}
