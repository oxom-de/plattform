"use client";

import { createClient } from "@liveblocks/client";
import { ClientSideSuspense, createRoomContext } from "@liveblocks/react";

export const docClient = createClient({
	authEndpoint: async (roomId) => {
		// Read workspace slug from the room ID: "{workspaceId}:doc:{docId}"
		// We pass it as a query param; the server reads it from the request body
		const workspaceSlug = (typeof window !== "undefined"
			? window.location.pathname.split("/").filter(Boolean)[0]
			: "") || "";

		const res = await fetch("/api/liveblocks-auth/doc", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ roomId, workspaceSlug }),
		});
		return res.json();
	},
});

const ctx = createRoomContext(docClient);

export const { RoomProvider } = ctx;
export { ClientSideSuspense };
