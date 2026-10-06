"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import type { Coach } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export function useCoaches() {
  const { profile } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const coachesRef = ref(db, "coaches");
    const unsubscribe = onValue(coachesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Coach[] = Object.entries(data).map(([id, value]) => ({
        id,
        ...(value as Omit<Coach, "id">),
      }));
      setCoaches(list);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const visibleCoaches =
    !profile || profile.assignedCoaches === "all"
      ? coaches
      : coaches.filter((c) => (profile.assignedCoaches as string[]).includes(c.id));

  return { coaches: visibleCoaches, loading };
}
