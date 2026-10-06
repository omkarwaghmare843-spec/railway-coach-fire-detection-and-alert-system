"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useCoaches } from "@/hooks/useCoaches";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import type { UserProfile, UserRole } from "@/lib/types";

function AdminUsersContent() {
  const { user } = useAuth();
  const { coaches } = useCoaches();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("coach-monitor");
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [allCoaches, setAllCoaches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      setUsers(Object.entries(data).map(([uid, value]) => ({ uid, ...(value as Omit<UserProfile, "uid">) })));
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          email,
          password,
          name,
          role,
          assignedCoaches: allCoaches ? "all" : selectedCoaches,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setMessage({ type: "success", text: `User ${email} created.` });
      setName("");
      setEmail("");
      setPassword("");
      setSelectedCoaches([]);
      setAllCoaches(false);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to create user" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCoach = (id: string) => {
    setSelectedCoaches((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
        Manage Users
      </h1>

      <form onSubmit={handleSubmit} className="card mt-6 flex flex-col gap-4 p-5">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Create new account
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            placeholder="Full name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          />
          <input
            type="password"
            placeholder="Temporary password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          >
            <option value="admin">Admin</option>
            <option value="station-master">Station Master</option>
            <option value="coach-monitor">Coach Monitor</option>
          </select>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            <input type="checkbox" checked={allCoaches} onChange={(e) => setAllCoaches(e.target.checked)} />
            Grant access to all coaches
          </label>
          {!allCoaches && (
            <div className="flex flex-wrap gap-2">
              {coaches.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleCoach(c.id)}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium"
                  style={{
                    borderColor: "var(--border)",
                    background: selectedCoaches.includes(c.id) ? "rgba(42,120,214,0.12)" : "var(--background)",
                    color: selectedCoaches.includes(c.id) ? "var(--series-blue)" : "var(--text-secondary)",
                  }}
                >
                  {c.meta?.name ?? c.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {message && (
          <p className="text-sm" style={{ color: message.type === "success" ? "var(--status-good)" : "var(--status-critical)" }}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--series-blue)" }}
        >
          {submitting ? "Creating..." : "Create account"}
        </button>
      </form>

      <h2 className="mt-8 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Existing users
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.uid} className="card flex items-center justify-between p-3 text-sm">
            <div>
              <div style={{ color: "var(--text-primary)" }}>{u.name}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {u.email}
              </div>
            </div>
            <div className="text-right text-xs">
              <div style={{ color: "var(--text-secondary)" }}>{u.role}</div>
              <div style={{ color: "var(--text-muted)" }}>
                {u.assignedCoaches === "all" ? "All coaches" : `${u.assignedCoaches?.length ?? 0} coach(es)`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requireRole="admin">
      <Navbar />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <AdminUsersContent />
      </main>
    </ProtectedRoute>
  );
}
