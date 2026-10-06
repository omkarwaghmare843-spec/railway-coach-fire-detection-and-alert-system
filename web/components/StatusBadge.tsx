import type { CoachState } from "@/lib/types";

export function StatusBadge({ state }: { state: CoachState | undefined }) {
  const isFire = state === "FIRE";
  const label = state ?? "UNKNOWN";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
      style={{
        color: isFire ? "var(--status-critical)" : "var(--status-good)",
        backgroundColor: isFire ? "rgba(208,59,59,0.12)" : "rgba(12,163,12,0.12)",
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="currentColor" />
      </svg>
      {isFire ? "FIRE DETECTED" : label === "NORMAL" ? "NORMAL" : "NO DATA"}
    </span>
  );
}
