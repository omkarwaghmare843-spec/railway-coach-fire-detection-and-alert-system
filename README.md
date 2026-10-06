# Railway Coach Fire Detection & Monitoring System

ESP32-based fire detection for railway coaches, with a Firebase-backed web dashboard
for railway authorities to monitor live status and respond to alerts.

## Architecture

```
MQ-2 Smoke + Flame Sensor + DS18B20 Temp  -->  ESP32  -->  Fire Detection Logic  -->  16x2 LCD
                                                  |
                                                  v
                                     Firebase Realtime Database
                                                  |
                                                  v
                                   Next.js Web Dashboard (role-based login)
```

See `firmware/README.md` for wiring and fire-detection logic details, and
`web/README.md` for the dashboard setup and Realtime Database schema.

## Repository layout

```
firmware/   ESP32 Arduino sketch (sensors -> Firebase RTDB)
web/        Next.js dashboard (Firebase Auth + Realtime Database)
database.rules.json   Firebase Realtime Database security rules
```

## Quick start

1. **Firmware**: open `firmware/firmware.ino` in Arduino IDE, fill in WiFi + Firebase
   credentials, flash to each ESP32 (one per coach, each with a unique `COACH_ID`).
   Wiring: MQ-2 → GPIO34, Flame sensor → GPIO35, DS18B20 → GPIO23, LCD (I2C) → SDA
   GPIO21 / SCL GPIO22.

2. **Web dashboard**: see `web/README.md` for local setup, seeding the first admin
   account, and deploying Realtime Database security rules.

3. **Deploy to Vercel**: import this repo into Vercel with the project root set to
   `web/`, and add the environment variables documented in `web/.env.local.example`.

## Firebase project

This system uses the `railway-safty` Firebase project (Realtime Database +
Authentication). See `web/README.md` for the full schema and role model.
