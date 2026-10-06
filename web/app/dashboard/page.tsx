"use client";

import Link from "next/link";
import { useCoaches } from "@/hooks/useCoaches";
import { StatusBadge } from "@/components/StatusBadge";

function timeAgo(ts?: number) {
  if (!ts) return "never";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function DashboardPage() {
  const { coaches, loading } = useCoaches();
  const fireCount = coaches.filter((c) => c.status?.state === "FIRE").length;
  const smokeWarningCount = coaches.filter((c) => c.status?.state === "SMOKE_WARNING").length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          Coach Overview
        </h1>
        <div className="flex gap-2">
          {smokeWarningCount > 0 && (
            <span
              className="rounded-full px-3 py-1 text-sm font-semibold"
              style={{ color: "var(--status-warning)", backgroundColor: "rgba(250,178,25,0.16)" }}
            >
              {smokeWarningCount} coach{smokeWarningCount > 1 ? "es" : ""} with smoke warning
            </span>
          )}
          {fireCount > 0 && (
            <span
              className="rounded-full px-3 py-1 text-sm font-semibold"
              style={{ color: "var(--status-critical)", backgroundColor: "rgba(208,59,59,0.12)" }}
            >
              {fireCount} coach{fireCount > 1 ? "es" : ""} on fire alert
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
          Loading coaches...
        </p>
      ) : coaches.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
          No coaches assigned to your account yet.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => (
            <Link key={coach.id} href={`/dashboard/${coach.id}`} className="card block p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {coach.meta?.name ?? coach.id}
                </span>
                <StatusBadge state={coach.status?.state} />
              </div>
              <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                Train {coach.meta?.train ?? "—"} &middot; {coach.meta?.location ?? "—"}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div style={{ color: "var(--text-muted)" }}>Smoke</div>
                  <div
                    className="tabular-nums font-medium"
                    style={{
                      color:
                        coach.status?.state === "SMOKE_WARNING" || coach.status?.state === "FIRE"
                          ? "var(--status-warning)"
                          : "var(--text-primary)",
                    }}
                  >
                    {coach.sensors?.smoke ?? "—"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--text-muted)" }}>Temp</div>
                  <div className="tabular-nums font-medium" style={{ color: "var(--text-primary)" }}>
                    {coach.sensors?.temperature != null ? `${coach.sensors.temperature}°C` : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--text-muted)" }}>Flame</div>
                  <div className="font-medium" style={{ color: coach.sensors?.flame ? "var(--status-critical)" : "var(--text-primary)" }}>
                    {coach.sensors?.flame ? "YES" : "No"}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                Updated {timeAgo(coach.status?.lastUpdated)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
