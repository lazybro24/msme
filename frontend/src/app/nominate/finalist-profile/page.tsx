import { redirect } from "next/navigation";

/** Preview-only screen — hidden until finalist API exists. */
export default function FinalistProfileUnavailable() {
  redirect("/nominate/dashboard");
}
