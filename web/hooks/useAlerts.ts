"use client";

import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import type { FireAlert } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export function useAlerts() {
  const { profile, user } = useAuth();
  const [alerts, setAlerts] = useState<FireAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const alertsRef = ref(db, "alerts");
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: FireAlert[] = Object.entries(data)
        .map(([id, value]) => ({ id, ...(value as Omit<FireAlert, "id">) }))
        .sort((a, b) => b.timestamp - a.timestamp);
      setAlerts(list);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const visibleAlerts =
    !profile || profile.assignedCoaches === "all"
      ? alerts
      : alerts.filter((a) => (profile.assignedCoaches as string[]).includes(a.coachId));

  const acknowledgeAlert = async (alertId: string) => {
    if (!user) return;
    await update(ref(db, `alerts/${alertId}`), {
      acknowledged: true,
      acknowledgedBy: user.email,
      acknowledgedAt: Date.now(),
    });
  };

  return { alerts: visibleAlerts, loading, acknowledgeAlert };
}
