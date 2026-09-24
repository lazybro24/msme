"use client";

import { AuthLoginForm } from "@/components/portal/AuthLoginForm";

export default function JuryLoginPage() {
  return (
    <AuthLoginForm
      title="Evaluate Applications"
      subtitle="Jury Portal · Independent evaluation"
      defaultEmail=""
      redirectTo="/jury-portal"
      forgotHref="/nominate/forgot-password"
    />
  );
}
