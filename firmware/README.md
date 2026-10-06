# Firmware — ESP32 Railway Coach Fire Detection

Arduino sketch for the ESP32 node that reads sensor data and pushes it to Firebase Realtime Database.

## Hardware Wiring

| Component              | ESP32 Pin |
|-------------------------|-----------|
| MQ-2 Smoke Sensor (AO)   | GPIO 34   |
| Flame Sensor (AO)        | GPIO 35   |
| DS18B20 Temp Sensor (DQ) | GPIO 23   |
| 16x2 LCD (I2C) SDA       | GPIO 21   |
| 16x2 LCD (I2C) SCL       | GPIO 22   |

DS18B20 needs a 4.7kΩ pull-up resistor between DQ and 3.3V.

## Required Arduino Libraries

Install via Arduino IDE Library Manager:

- `LiquidCrystal_I2C` (e.g. by Frank de Brabander / Marco Schwartz)
- `OneWire` (by Paul Stoffregen)
- `DallasTemperature` (by Miles Burton)

ESP32 board support: install via Boards Manager (`esp32` by Espressif Systems).

## Configuration

Edit the top of `firmware.ino`:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* FIREBASE_HOST = "https://railway-safty-default-rtdb.firebaseio.com";
const char* FIREBASE_AUTH = "YOUR_FIREBASE_DATABASE_SECRET";
const char* COACH_ID      = "coach_01";
```

`FIREBASE_AUTH` is a Realtime Database secret (legacy token), found at:
Firebase Console → Project Settings → Service Accounts → Database secrets.

Each physical ESP32 unit should have a unique `COACH_ID` matching a node you create under
`/coaches/{COACH_ID}` in the database (see `web/README.md` for the schema and seeding script).

## Fire Detection Logic

```
fireDetected = flameDetected OR (smokeValue > SMOKE_THRESHOLD AND tempValue > TEMP_THRESHOLD)
```

Tune `SMOKE_THRESHOLD`, `TEMP_THRESHOLD`, and `FLAME_THRESHOLD` in the sketch based on
your sensor's real-world calibration (MQ-2 needs ~24-48h burn-in for stable baseline readings).

## Data Flow

Every 2 seconds the device:

1. Reads MQ-2, flame sensor, and DS18B20.
2. Evaluates the fire decision logic.
3. Updates the 16x2 LCD (`NORMAL` or `FIRE ALERT` + live readings).
4. PATCHes `/coaches/{COACH_ID}` in Firebase RTDB with the latest sensor + status data.
5. On a NORMAL→FIRE transition, POSTs a new record to `/alerts` for the web dashboard to display.
