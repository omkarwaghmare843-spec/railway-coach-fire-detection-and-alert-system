import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { UserRole } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const callerToken = await adminAuth.verifyIdToken(idToken);

    const adminDb = getAdminDb();
    const callerProfileSnap = await adminDb.ref(`users/${callerToken.uid}`).get();
    const callerProfile = callerProfileSnap.val();
    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, name, role, assignedCoaches } = body as {
      email: string;
      password: string;
      name: string;
      role: UserRole;
      assignedCoaches: string[] | "all";
    };

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newUser = await adminAuth.createUser({ email, password, displayName: name });

    await adminDb.ref(`users/${newUser.uid}`).set({
      email,
      name,
      role,
      assignedCoaches: assignedCoaches ?? [],
      createdAt: Date.now(),
    });

    return NextResponse.json({ uid: newUser.uid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
