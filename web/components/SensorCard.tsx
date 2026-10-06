export function SensorCard({
  label,
  value,
  unit,
  flagged,
}: {
  label: string;
  value: string | number;
  unit?: string;
  flagged?: "critical" | "warning" | boolean;
}) {
  const color =
    flagged === "warning"
      ? "var(--status-warning)"
      : flagged
        ? "var(--status-critical)"
        : "var(--text-primary)";

  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={{ color }}>
        {value}
        {unit && <span className="ml-1 text-base font-normal" style={{ color: "var(--text-secondary)" }}>{unit}</span>}
      </div>
    </div>
  );
}
