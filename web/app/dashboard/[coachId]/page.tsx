"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { StatusBadge } from "@/components/StatusBadge";
import { SensorCard } from "@/components/SensorCard";
import type { Coach } from "@/lib/types";

export default function CoachDetailPage({ params }: { params: Promise<{ coachId: string }> }) {
  const { coachId } = use(params);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const coachRef = ref(db, `coaches/${coachId}`);
    const unsubscribe = onValue(coachRef, (snapshot) => {
      const data = snapshot.val();
      setCoach(data ? { id: coachId, ...data } : null);
      setLoading(false);
    });
    return unsubscribe;
  }, [coachId]);

  if (loading) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Loading coach data...
      </p>
    );
  }

  if (!coach) {
    return (
      <div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Coach not found.
        </p>
        <Link href="/dashboard" className="mt-2 inline-block text-sm" style={{ color: "var(--series-blue)" }}>
          Back to overview
        </Link>
      </div>
    );
  }

  const isFire = coach.status?.state === "FIRE";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm" style={{ color: "var(--series-blue)" }}>
        ← Back to overview
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {coach.meta?.name ?? coach.id}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Train {coach.meta?.train ?? "—"} &middot; {coach.meta?.location ?? "—"}
          </p>
        </div>
        <StatusBadge state={coach.status?.state} />
      </div>

      {isFire && (
        <div
          className="mt-4 rounded-lg px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: "rgba(208,59,59,0.12)", color: "var(--status-critical)" }}
        >
          Fire condition detected on this coach. Dispatch response per protocol.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SensorCard label="Smoke (MQ-2)" value={coach.sensors?.smoke ?? "—"} flagged={isFire} />
        <SensorCard
          label="Temperature"
          value={coach.sensors?.temperature ?? "—"}
          unit="°C"
          flagged={isFire}
        />
        <SensorCard label="Flame Sensor" value={coach.sensors?.flame ? "Detected" : "Clear"} flagged={coach.sensors?.flame} />
      </div>

      <p className="mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
        Last updated: {coach.status?.lastUpdated ? new Date(coach.status.lastUpdated).toLocaleString() : "—"}
      </p>
    </div>
  );
}
