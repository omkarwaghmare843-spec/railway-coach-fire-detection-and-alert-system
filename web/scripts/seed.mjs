// One-time setup script: creates the first admin account and a sample coach node.
// Usage: node scripts/seed.mjs
//
// Requires the same FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
// admin credentials as .env.local (loaded automatically via --env-file in the npm script).

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

if (!projectId || !clientEmail || !privateKey || !databaseURL) {
  console.error(
    "Missing Firebase Admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
      "FIREBASE_PRIVATE_KEY and NEXT_PUBLIC_FIREBASE_DATABASE_URL in .env.local first."
  );
  process.exit(1);
}

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@railway.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "System Administrator";

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  databaseURL,
});

const auth = getAuth(app);
const db = getDatabase(app);

async function main() {
  let user;
  try {
    user = await auth.getUserByEmail(ADMIN_EMAIL);
    console.log(`Admin user already exists: ${ADMIN_EMAIL} (${user.uid})`);
  } catch {
    user = await auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_NAME,
    });
    console.log(`Created admin user: ${ADMIN_EMAIL} (${user.uid})`);
    console.log(`Temporary password: ${ADMIN_PASSWORD} — change this after first login.`);
  }

  await db.ref(`users/${user.uid}`).set({
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    role: "admin",
    assignedCoaches: "all",
    createdAt: Date.now(),
  });

  await db.ref("coaches/coach_01").set({
    meta: { name: "Coach A1", train: "12951 Mumbai Rajdhani", location: "Car 3" },
    sensors: { smoke: 0, temperature: 25, flame: false, timestamp: Date.now() },
    status: { state: "NORMAL", lastUpdated: Date.now() },
  });
  console.log("Seeded sample coach: coach_01");

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
