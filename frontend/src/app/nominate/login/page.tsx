"use client";

import { AuthLoginForm } from "@/components/portal/AuthLoginForm";

export default function NominateLoginPage() {
  return (
    <AuthLoginForm
      title="Applicant Login"
      subtitle="Sign in to continue your nomination."
      defaultEmail=""
      redirectTo="/nominate/dashboard"
      forgotHref="/nominate/forgot-password"
    />
  );
}
