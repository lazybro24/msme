"use client";

import { AuthLoginForm } from "@/components/portal/AuthLoginForm";

export default function ObserverLoginPage() {
  return (
    <AuthLoginForm
      title="Process Observer"
      subtitle="Read-only process assurance"
      defaultEmail=""
      redirectTo="/observer"
      forgotHref="/nominate/forgot-password"
    />
  );
}
