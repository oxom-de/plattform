import { auth, currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
	normalizeInternalRedirectPath,
	shouldForcePasswordChange,
} from "@/lib/auth/password-reset";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { PasswordResetForm } from "./password-reset-form";

type SearchParamValue = string | string[] | undefined;

interface PasswordOnboardingPageProps {
	searchParams?: Promise<Record<string, SearchParamValue>>;
}

export const metadata: Metadata = {
	title: "Passwort aktualisieren | oxom",
	robots: NO_INDEX_ROBOTS,
};

function getFirstValue(value: SearchParamValue): string {
	if (Array.isArray(value)) return value[0] || "";
	return typeof value === "string" ? value : "";
}

export default async function PasswordOnboardingPage({
	searchParams,
}: PasswordOnboardingPageProps) {
	const { userId } = await auth();
	const resolvedSearchParams = (await searchParams) || {};
	const redirectPath = normalizeInternalRedirectPath(
		getFirstValue(resolvedSearchParams.redirect_url),
		"/switcher",
	);

	if (!userId) {
		redirect(
			`/sign-in?redirect_url=${encodeURIComponent(`/onboarding/password?redirect_url=${redirectPath}`)}`,
		);
	}

	const user = await currentUser();
	if (!shouldForcePasswordChange(user)) {
		redirect(redirectPath);
	}

	const username =
		user?.username?.trim() || user?.primaryEmailAddress?.emailAddress || "";

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-12">
			<PasswordResetForm username={username} redirectPath={redirectPath} />
		</main>
	);
}
