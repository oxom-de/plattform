"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { Workspace } from "@/lib/tenant/resolve-workspace";

type WorkspaceContextValue = {
	workspace: Workspace;
	basePath: string;
	flags: {
		linkInBio: boolean;
		media: boolean;
	};
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
	workspace: Workspace;
	basePath: string;
	flags: {
		linkInBio: boolean;
		media: boolean;
	};
	children: ReactNode;
}

export function WorkspaceProvider({
	workspace,
	basePath,
	flags,
	children,
}: WorkspaceProviderProps) {
	return (
		<WorkspaceContext.Provider value={{ workspace, basePath, flags }}>
			{children}
		</WorkspaceContext.Provider>
	);
}

export function useWorkspaceContext(): WorkspaceContextValue {
	const value = useContext(WorkspaceContext);
	if (!value) {
		throw new Error(
			"useWorkspaceContext must be used inside WorkspaceProvider",
		);
	}
	return value;
}

export function useWorkspace(): Workspace {
	return useWorkspaceContext().workspace;
}
