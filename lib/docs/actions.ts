"use server";

import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type WorkspaceDoc = {
	id: string;
	workspace_id: string;
	title: string;
	emoji: string | null;
	created_by: string;
	created_at: string;
	updated_at: string;
};

export async function listDocs(workspaceId: string): Promise<WorkspaceDoc[]> {
	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspace_docs")
		.select("*")
		.eq("workspace_id", workspaceId)
		.order("updated_at", { ascending: false });

	if (error) throw new Error(error.message);
	return data ?? [];
}

export async function getDoc(docId: string): Promise<WorkspaceDoc | null> {
	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspace_docs")
		.select("*")
		.eq("id", docId)
		.single();

	if (error) return null;
	return data;
}

export async function createDoc(workspaceId: string, basePath: string): Promise<WorkspaceDoc> {
	const { userId } = await auth();
	if (!userId) throw new Error("Nicht authentifiziert.");

	const supabase = createServerSupabaseAdminClient();
	const { data, error } = await supabase
		.from("workspace_docs")
		.insert({ workspace_id: workspaceId, created_by: userId })
		.select()
		.single();

	if (error) throw new Error(error.message);
	revalidatePath(`${basePath}/docs`);
	return data;
}

export async function updateDocTitle(
	docId: string,
	title: string,
	basePath: string,
): Promise<void> {
	const { userId } = await auth();
	if (!userId) throw new Error("Nicht authentifiziert.");

	const supabase = createServerSupabaseAdminClient();
	const { error } = await supabase
		.from("workspace_docs")
		.update({ title: title.trim() || "Unbenanntes Dokument", updated_at: new Date().toISOString() })
		.eq("id", docId);

	if (error) throw new Error(error.message);
	revalidatePath(`${basePath}/docs`);
}

export async function deleteDoc(docId: string, basePath: string): Promise<void> {
	const { userId } = await auth();
	if (!userId) throw new Error("Nicht authentifiziert.");

	const supabase = createServerSupabaseAdminClient();
	const { error } = await supabase
		.from("workspace_docs")
		.delete()
		.eq("id", docId);

	if (error) throw new Error(error.message);
	revalidatePath(`${basePath}/docs`);
}
