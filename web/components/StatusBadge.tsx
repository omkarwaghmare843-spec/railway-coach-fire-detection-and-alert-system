import type { CoachState } from "@/lib/types";

const STATUS_CONFIG: Record<CoachState, { label: string; color: string; bg: string }> = {
  FIRE: { label: "FIRE DETECTED", color: "var(--status-critical)", bg: "rgba(208,59,59,0.12)" },
  SMOKE_WARNING: { label: "SMOKE WARNING", color: "var(--status-warning)", bg: "rgba(250,178,25,0.16)" },
  NORMAL: { label: "NORMAL", color: "var(--status-good)", bg: "rgba(12,163,12,0.12)" },
};

export function StatusBadge({ state }: { state: CoachState | undefined }) {
  const config = state ? STATUS_CONFIG[state] : null;

  if (!config) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
        style={{ color: "var(--text-muted)", backgroundColor: "var(--gridline)" }}
      >
        NO DATA
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="currentColor" />
      </svg>
      {config.label}
    </span>
  );
}
