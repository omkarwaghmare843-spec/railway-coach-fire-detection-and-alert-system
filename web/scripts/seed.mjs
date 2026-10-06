// One-time setup script: creates login accounts for each role + a sample coach node.
// Usage: npm run seed
//
// Requires FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
// admin credentials in .env.local.
//
// Override the default accounts/passwords via env vars before running, e.g.
//   SEED_ADMIN_EMAIL=you@org.com SEED_ADMIN_PASSWORD=... npm run seed

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

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  databaseURL,
});

const auth = getAuth(app);
const db = getDatabase(app);

function randomPassword() {
  return `RailFire@${Math.random().toString(36).slice(2, 10)}`;
}

const ACCOUNTS = [
  {
    email: process.env.SEED_ADMIN_EMAIL || "admin@railway.local",
    password: process.env.SEED_ADMIN_PASSWORD || randomPassword(),
    name: "System Administrator",
    role: "admin",
    assignedCoaches: "all",
  },
  {
    email: process.env.SEED_STATION_MASTER_EMAIL || "stationmaster@railway.local",
    password: process.env.SEED_STATION_MASTER_PASSWORD || randomPassword(),
    name: "Station Master",
    role: "station-master",
    assignedCoaches: ["coach_01"],
  },
  {
    email: process.env.SEED_COACH_MONITOR_EMAIL || "coachmonitor@railway.local",
    password: process.env.SEED_COACH_MONITOR_PASSWORD || randomPassword(),
    name: "Coach Monitor",
    role: "coach-monitor",
    assignedCoaches: ["coach_01"],
  },
];

async function ensureUser({ email, password, name, role, assignedCoaches }) {
  let user;
  let created = false;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Already exists: ${email} (${user.uid}) — updating role record only.`);
  } catch {
    user = await auth.createUser({ email, password, displayName: name });
    created = true;
    console.log(`Created user: ${email} (${user.uid})`);
  }

  await db.ref(`users/${user.uid}`).set({
    email,
    name,
    role,
    assignedCoaches,
    createdAt: Date.now(),
  });

  return created;
}

async function main() {
  const createdPasswords = [];
  for (const account of ACCOUNTS) {
    const created = await ensureUser(account);
    if (created) createdPasswords.push(account);
  }

  await db.ref("coaches/coach_01").set({
    meta: { name: "Coach A1", train: "12951 Mumbai Rajdhani", location: "Car 3" },
    sensors: { smoke: 0, temperature: 25, flame: false, timestamp: Date.now() },
    status: { state: "NORMAL", lastUpdated: Date.now() },
  });
  console.log("Seeded sample coach: coach_01");

  if (createdPasswords.length) {
    console.log("\nNewly created accounts — save these passwords now, they are not stored anywhere:");
    for (const { email, password, role } of createdPasswords) {
      console.log(`  ${role.padEnd(16)} ${email}  /  ${password}`);
    }
  }
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
