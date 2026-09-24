import { redirect } from "next/navigation";

/** Legacy URL — send people to applicant login, not a credential catalog. */
export default function PortalsRedirect() {
  redirect("/nominate/login");
}
