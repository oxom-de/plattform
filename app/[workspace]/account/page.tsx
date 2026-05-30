import { UserProfile } from "@clerk/nextjs";
import type { Metadata } from "next";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
	title: "Account",
	robots: NO_INDEX_ROBOTS,
};

export default function AccountPage() {
	return (
		<main className="flex min-h-0 flex-1 items-center justify-center">
			<UserProfile routing="hash" />
		</main>
	);
}
