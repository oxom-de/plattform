import { redirect } from "next/navigation";

// Accessed without workspace context — send to workspace switcher.
// Normal entry point is /{workspace}/organization (via shell link or subdomain rewrite).
export default function OrganizationFallback() {
	redirect("/switcher");
}
