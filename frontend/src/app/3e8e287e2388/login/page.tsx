"use client";

import { AuthLoginForm } from "@/components/portal/AuthLoginForm";

export default function AdminLoginPage() {
  return (
    <AuthLoginForm
      title="Admin"
      subtitle="Authorised awards team only."
      defaultEmail=""
      redirectTo="/3e8e287e2388"
      forgotHref="/nominate/forgot-password"
      requiredRoles={["ADMINISTRATOR", "VERIFICATION", "JURY_CHAIR", "OBSERVER"]}
    />
  );
}
