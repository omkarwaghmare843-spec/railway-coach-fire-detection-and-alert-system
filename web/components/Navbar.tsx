"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Coaches" },
    { href: "/dashboard/alerts", label: "Alerts" },
    ...(profile?.role === "admin" ? [{ href: "/admin/users", label: "Users" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <nav className="card mx-4 mt-4 flex items-center justify-between px-4 py-3 sm:mx-6">
      <div className="flex items-center gap-6">
        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Railway Fire Monitor
        </span>
        <div className="flex gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  color: active ? "var(--series-blue)" : "var(--text-secondary)",
                  backgroundColor: active ? "rgba(42,120,214,0.1)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {profile && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {profile.name} &middot; {profile.role}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="rounded-md px-3 py-1.5 text-sm font-medium"
          style={{ color: "var(--status-critical)" }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
