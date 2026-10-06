"use client";

import { useAlerts } from "@/hooks/useAlerts";

export default function AlertsPage() {
  const { alerts, loading, acknowledgeAlert } = useAlerts();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
        Alerts
      </h1>

      {loading ? (
        <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
          Loading alerts...
        </p>
      ) : alerts.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--text-muted)" }}>
          No alerts recorded.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="card flex items-start justify-between gap-4 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={
                      alert.type === "FIRE"
                        ? { color: "var(--status-critical)", backgroundColor: "rgba(208,59,59,0.12)" }
                        : { color: "var(--status-warning)", backgroundColor: "rgba(250,178,25,0.16)" }
                    }
                  >
                    {alert.type === "FIRE" ? "FIRE" : "SMOKE WARNING"}
                  </span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {alert.coachId}
                  </span>
                </div>
                <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  Smoke: {alert.smoke} &middot; Temp: {alert.temperature}°C &middot; Flame: {alert.flame ? "Yes" : "No"}
                </div>
                <div className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {new Date(alert.timestamp).toLocaleString()}
                  {alert.acknowledged && alert.acknowledgedBy && (
                    <> &middot; Acknowledged by {alert.acknowledgedBy}</>
                  )}
                </div>
              </div>
              {!alert.acknowledged ? (
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: "var(--series-blue)" }}
                >
                  Acknowledge
                </button>
              ) : (
                <span className="shrink-0 text-xs font-medium" style={{ color: "var(--status-good)" }}>
                  Acknowledged
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
