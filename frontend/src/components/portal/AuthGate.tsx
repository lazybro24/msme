"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getStoredUser, getToken, type AuthUser } from "@/lib/api";

export function useRequireAuth(allowedRoles?: string[]) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const u = getStoredUser();
    if (!token || !u) {
      setUser(null);
      setReady(true);
      return;
    }
    if (allowedRoles?.length && !allowedRoles.some((r) => u.roles.includes(r))) {
      setUser(null);
      setReady(true);
      return;
    }
    setUser(u);
    setReady(true);
  }, [allowedRoles?.join(",")]);

  function logout() {
    clearSession();
    setUser(null);
  }

  return { user, ready, logout, isAuthed: Boolean(user) };
}

export function AuthGate({
  roles,
  loginPath,
  children,
}: {
  roles?: string[];
  loginPath: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, ready } = useRequireAuth(roles);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(loginPath);
  }, [ready, user, router, loginPath]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#666]">
        Checking session…
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
