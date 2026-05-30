import { redirect } from "next/navigation";

// Accessed without workspace context — send to workspace switcher.
// Normal entry point is /{workspace}/account (via shell link or subdomain rewrite).
export default function AccountFallback() {
	redirect("/switcher");
}
