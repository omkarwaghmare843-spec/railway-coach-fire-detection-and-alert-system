/*
 * ESP32-Based Railway Coach Fire Detection System
 * -------------------------------------------------
 * Sensors:
 *   - MQ-2 Smoke Sensor   -> GPIO 34 (analog)
 *   - Flame Sensor        -> GPIO 35 (analog)
 *   - DS18B20 Temp Sensor -> GPIO 23 (OneWire, digital)
 *   - 16x2 I2C LCD        -> SDA GPIO 21, SCL GPIO 22
 *
 * Logic (three-tier decision):
 *   FIRE DETECTED if:
 *     flameDetected == true
 *     OR (smokeValue > SMOKE_THRESHOLD AND tempValue > TEMP_THRESHOLD)
 *   SMOKE WARNING if (and FIRE not already true):
 *     smokeValue > SMOKE_WARNING_THRESHOLD
 *   otherwise NORMAL.
 *
 * A smoke-only reading (no elevated temp, no flame) does NOT escalate to full
 * FIRE — it raises a separate SMOKE WARNING tier instead, so dust/steam alone
 * doesn't trip a critical alert, but the condition is still surfaced to
 * railway authorities rather than silently ignored.
 *
 * Data is pushed to Firebase Realtime Database over WiFi using the REST API.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <time.h>

// ---------------- WiFi Credentials ----------------
const char* WIFI_SSID     = "Admin";
const char* WIFI_PASSWORD = "Admin@123";

// ---------------- Firebase Config ----------------
// Realtime Database base URL (no trailing slash), e.g.
// https://railway-safty-default-rtdb.firebaseio.com
const char* FIREBASE_HOST = "https://railway-safty-default-rtdb.firebaseio.com";
// Firebase RTDB secret / database auth token (legacy secret) used as ?auth= param.
// Generate from Firebase Console > Project Settings > Service Accounts > Database Secrets.
const char* FIREBASE_AUTH = "xtDRwr3Szl76Fc2O6MoWtWuBU96ejymCUEHQbPvW";

// Unique identifier for this coach/device — must match a node under /coaches in the DB.
const char* COACH_ID = "coach_01";

// ---------------- Pin Definitions ----------------
#define MQ2_PIN        34   // Smoke sensor (analog)
#define FLAME_PIN      35   // Flame sensor (analog)
#define ONE_WIRE_BUS   23   // DS18B20 data pin
#define I2C_SDA        21
#define I2C_SCL        22

// ---------------- Thresholds ----------------
const int   SMOKE_WARNING_THRESHOLD = 2200; // ADC 0-4095; smoke-only -> SMOKE WARNING tier
const int   SMOKE_THRESHOLD = 3200;   // ADC 0-4095, tune to MQ-2 sensitivity/env
const float TEMP_THRESHOLD  = 55.0;   // degrees Celsius
const int   FLAME_THRESHOLD = 2000;   // lower ADC reading usually means flame detected
                                       // (flame sensors are typically active-low / inverted)

// ---------------- Timing ----------------
const unsigned long SENSOR_INTERVAL_MS = 2000; // read + push every 2s
unsigned long lastReadTime = 0;

// ---------------- Objects ----------------
LiquidCrystal_I2C lcd(0x27, 16, 2); // common address 0x27; try 0x3F if blank
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

enum CoachState { STATE_NORMAL, STATE_SMOKE_WARNING, STATE_FIRE };
CoachState lastState = STATE_NORMAL; // tracks last pushed state to avoid redundant alert writes

unsigned long long epochMillisNow() {
  time_t now;
  time(&now);
  if (now < 1700000000) {
    // NTP not yet synced; fall back to device uptime (not wall-clock accurate).
    return (unsigned long long)millis();
  }
  return (unsigned long long)now * 1000ULL;
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(250);
    attempts++;
  }
  lcd.clear();
  if (WiFi.status() == WL_CONNECTED) {
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    delay(1000);
  } else {
    lcd.setCursor(0, 0);
    lcd.print("WiFi FAILED");
    delay(1000);
  }
  lcd.clear();

  if (WiFi.status() == WL_CONNECTED) {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  }
}

void setup() {
  Serial.begin(115200);

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.begin();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Fire Detection");
  lcd.setCursor(0, 1);
  lcd.print("System Booting");
  delay(1500);
  lcd.clear();

  pinMode(MQ2_PIN, INPUT);
  pinMode(FLAME_PIN, INPUT);
  ds18b20.begin();

  connectWiFi();
}

void loop() {
  unsigned long now = millis();
  if (now - lastReadTime >= SENSOR_INTERVAL_MS) {
    lastReadTime = now;

    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    }

    // ---- Read sensors ----
    int smokeValue = analogRead(MQ2_PIN);
    int flameRaw   = analogRead(FLAME_PIN);
    bool flameDetected = (flameRaw < (4095 - FLAME_THRESHOLD)); // active-low style threshold

    ds18b20.requestTemperatures();
    float tempValue = ds18b20.getTempCByIndex(0);
    if (tempValue == DEVICE_DISCONNECTED_C) {
      tempValue = -127.0; // sentinel for sensor error
    }

    // ---- Fire Detection & Threshold Comparison (three-tier) ----
    bool smokeHigh        = smokeValue > SMOKE_THRESHOLD;
    bool smokeWarningHigh = smokeValue > SMOKE_WARNING_THRESHOLD;
    bool tempHigh         = tempValue > TEMP_THRESHOLD;

    bool fireDetected = flameDetected || (smokeHigh && tempHigh);
    CoachState state = fireDetected
                         ? STATE_FIRE
                         : (smokeWarningHigh ? STATE_SMOKE_WARNING : STATE_NORMAL);

    // ---- Decision Unit -> LCD ----
    updateLCD(state, smokeValue, tempValue);

    // ---- Push to Firebase ----
    pushSensorData(smokeValue, tempValue, flameDetected, state);

    if (state != lastState && state != STATE_NORMAL) {
      pushAlert(smokeValue, tempValue, flameDetected, state);
    }
    lastState = state;

    const char* stateLabel = state == STATE_FIRE ? "FIRE DETECTED"
                            : state == STATE_SMOKE_WARNING ? "SMOKE WARNING"
                            : "NORMAL";
    Serial.printf("Smoke:%d Flame:%d(%d) Temp:%.2f -> %s\n",
                  smokeValue, flameDetected, flameRaw, tempValue, stateLabel);
  }
}

void updateLCD(CoachState state, int smokeValue, float tempValue) {
  lcd.setCursor(0, 0);
  switch (state) {
    case STATE_FIRE:
      lcd.print("!! FIRE ALERT !!");
      break;
    case STATE_SMOKE_WARNING:
      lcd.print("SMOKE WARNING   ");
      break;
    default:
      lcd.print("Status: NORMAL  ");
      break;
  }
  lcd.setCursor(0, 1);
  char line2[17];
  snprintf(line2, sizeof(line2), "S:%4d T:%5.1fC", smokeValue, tempValue);
  lcd.print(line2);
}

const char* stateToString(CoachState state) {
  switch (state) {
    case STATE_FIRE: return "FIRE";
    case STATE_SMOKE_WARNING: return "SMOKE_WARNING";
    default: return "NORMAL";
  }
}

void pushSensorData(int smokeValue, float tempValue, bool flameDetected, CoachState state) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/coaches/" + COACH_ID + ".json?auth=" + FIREBASE_AUTH;

  String payload = "{";
  payload += "\"sensors\":{";
  payload += "\"smoke\":" + String(smokeValue) + ",";
  payload += "\"temperature\":" + String(tempValue, 2) + ",";
  payload += "\"flame\":" + String(flameDetected ? "true" : "false") + ",";
  payload += "\"timestamp\":" + String(epochMillisNow());
  payload += "},";
  payload += "\"status\":{";
  payload += "\"state\":\"" + String(stateToString(state)) + "\",";
  payload += "\"lastUpdated\":" + String(epochMillisNow());
  payload += "}";
  payload += "}";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PATCH(payload);
  if (httpCode <= 0) {
    Serial.printf("Firebase PATCH failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

void pushAlert(int smokeValue, float tempValue, bool flameDetected, CoachState state) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/alerts.json?auth=" + FIREBASE_AUTH;

  String payload = "{";
  payload += "\"coachId\":\"" + String(COACH_ID) + "\",";
  payload += "\"type\":\"" + String(stateToString(state)) + "\",";
  payload += "\"smoke\":" + String(smokeValue) + ",";
  payload += "\"temperature\":" + String(tempValue, 2) + ",";
  payload += "\"flame\":" + String(flameDetected ? "true" : "false") + ",";
  payload += "\"timestamp\":" + String(epochMillisNow()) + ",";
  payload += "\"acknowledged\":false";
  payload += "}";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(payload);
  if (httpCode <= 0) {
    Serial.printf("Firebase alert POST failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}
