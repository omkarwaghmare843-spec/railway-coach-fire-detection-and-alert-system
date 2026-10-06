"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/lib/types";

export function ProtectedRoute({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: UserRole;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireRole && profile?.role !== requireRole) {
      router.replace("/dashboard");
    }
  }, [loading, user, profile, requireRole, router]);

  if (loading || !user || (requireRole && profile?.role !== requireRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span style={{ color: "var(--text-muted)" }}>Loading...</span>
      </div>
    );
  }

  return <>{children}</>;
}
