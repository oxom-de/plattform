"use client";

import type { ReactNode } from "react";
import {
	RoomProvider,
	ClientSideSuspense,
} from "@/lib/liveblocks/doc-client";

export function DocLiveblocksProvider({
	docId,
	workspaceId,
	children,
}: {
	docId: string;
	workspaceId: string;
	children: ReactNode;
}) {
	const roomId = `${workspaceId}:doc:${docId}`;

	return (
		<RoomProvider id={roomId}>
			<ClientSideSuspense fallback={null}>
				{children}
			</ClientSideSuspense>
		</RoomProvider>
	);
}
