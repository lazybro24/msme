import { notFound } from "next/navigation";

/** Old /secretariat URL — removed. Admin lives at an obscure path. */
export default function LegacySecretariatRemoved() {
  notFound();
}
