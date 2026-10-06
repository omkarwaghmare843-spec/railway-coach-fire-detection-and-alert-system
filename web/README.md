# Web — Railway Fire Monitor Dashboard

Next.js (App Router) dashboard for railway authorities to monitor live coach fire-detection
status and respond to alerts, backed by Firebase Authentication and Realtime Database.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- Firebase Authentication (email/password)
- Firebase Realtime Database (live sensor + alert data)
- Firebase Admin SDK (server-side user provisioning via an API route)

## Roles

| Role | Access |
|---|---|
| `admin` | Full access to all coaches, alerts, and the Users management page (create accounts, assign coaches) |
| `station-master` | Read access to assigned coaches + alerts, can acknowledge alerts |
| `coach-monitor` | Read access to assigned coaches + alerts, can acknowledge alerts |

Roles and coach assignments are stored per-user at `/users/{uid}` in the Realtime Database
(not Firebase custom claims), so they can be managed entirely from the Users admin page
without redeploying anything.

## Realtime Database schema

```
/coaches/{coachId}/meta/{name, train, location}
/coaches/{coachId}/sensors/{smoke, temperature, flame, timestamp}
/coaches/{coachId}/status/{state: "NORMAL" | "FIRE", lastUpdated}

/alerts/{alertId}/{coachId, type, smoke, temperature, flame, timestamp, acknowledged, acknowledgedBy?, acknowledgedAt?}

/users/{uid}/{email, name, role, assignedCoaches: string[] | "all", createdAt}
```

All timestamps are epoch milliseconds (`Date.now()` on the web side; the firmware
NTP-syncs and sends the same epoch-ms format — see `firmware/README.md`).

## Local setup

1. Copy the env template and fill in values:
   ```
   cp .env.local.example .env.local
   ```
   The `NEXT_PUBLIC_FIREBASE_*` values are already filled in for the `railway-safty`
   project (they are public client identifiers, safe to expose). You still need to
   fill in the **Admin SDK** values (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`):
   Firebase Console → Project Settings → Service Accounts → Generate new private key.

2. Install dependencies:
   ```
   npm install
   ```

3. Enable **Email/Password** sign-in: Firebase Console → Authentication → Sign-in method.

4. Deploy the Realtime Database security rules from the repo root:
   ```
   firebase deploy --only database
   ```
   (requires `firebase-tools` and `firebase login`; rules live in `../database.rules.json`)

5. Seed the first admin account + a sample coach:
   ```
   npm run seed
   ```
   This creates `admin@railway.local` / `ChangeMe123!` (override via `SEED_ADMIN_EMAIL`,
   `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` env vars). **Change the password after first login**
   — there is no self-service password reset UI yet; use the Firebase Console if needed.

6. Run the dev server:
   ```
   npm run dev
   ```

## Deployment (Vercel)

This app is configured for manual Vercel deployment:

1. Push this repo to GitHub (see root `README.md`).
2. Import the repo in Vercel, set the **root directory** to `web/`.
3. Add the environment variables from `.env.local` to the Vercel project
   (Settings → Environment Variables) — both the `NEXT_PUBLIC_*` client config and the
   server-only Admin SDK variables.
4. Deploy.

## Adding a new coach

Add a node under `/coaches/{coachId}` in the Realtime Database (via Firebase Console or
a script) with `meta.name`, `meta.train`, `meta.location`, matching the `COACH_ID` flashed
onto that coach's ESP32. Assign it to the relevant users from the admin Users page.
