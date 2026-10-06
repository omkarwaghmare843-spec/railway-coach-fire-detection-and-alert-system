/*
 * ESP32-Based Railway Coach Fire Detection System
 * -------------------------------------------------
 * Sensors:
 *   - MQ-2 Smoke Sensor   -> GPIO 34 (analog)
 *   - Flame Sensor        -> GPIO 35 (analog)
 *   - DS18B20 Temp Sensor -> GPIO 23 (OneWire, digital)
 *   - 16x2 I2C LCD        -> SDA GPIO 21, SCL GPIO 22
 *
 * Logic:
 *   FIRE DETECTED if:
 *     flameDetected == true
 *     OR (smokeValue > SMOKE_THRESHOLD AND tempValue > TEMP_THRESHOLD)
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
const char* FIREBASE_AUTH = "YOUR_FIREBASE_DATABASE_SECRET";

// Unique identifier for this coach/device — must match a node under /coaches in the DB.
const char* COACH_ID = "coach_01";

// ---------------- Pin Definitions ----------------
#define MQ2_PIN        34   // Smoke sensor (analog)
#define FLAME_PIN      35   // Flame sensor (analog)
#define ONE_WIRE_BUS   23   // DS18B20 data pin
#define I2C_SDA        21
#define I2C_SCL        22

// ---------------- Thresholds ----------------
const int   SMOKE_THRESHOLD = 1800;   // ADC 0-4095, tune to MQ-2 sensitivity/env
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

bool lastFireState = false; // tracks last pushed state to avoid redundant alert writes

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

    // ---- Fire Detection & Threshold Comparison ----
    bool smokeHigh = smokeValue > SMOKE_THRESHOLD;
    bool tempHigh  = tempValue > TEMP_THRESHOLD;
    bool fireDetected = flameDetected || (smokeHigh && tempHigh);

    // ---- Decision Unit -> LCD ----
    updateLCD(fireDetected, smokeValue, tempValue);

    // ---- Push to Firebase ----
    pushSensorData(smokeValue, tempValue, flameDetected, fireDetected);

    if (fireDetected && !lastFireState) {
      pushAlert(smokeValue, tempValue, flameDetected);
    }
    lastFireState = fireDetected;

    Serial.printf("Smoke:%d Flame:%d(%d) Temp:%.2f -> %s\n",
                  smokeValue, flameDetected, flameRaw, tempValue,
                  fireDetected ? "FIRE DETECTED" : "NORMAL");
  }
}

void updateLCD(bool fireDetected, int smokeValue, float tempValue) {
  lcd.setCursor(0, 0);
  if (fireDetected) {
    lcd.print("!! FIRE ALERT !!");
  } else {
    lcd.print("Status: NORMAL  ");
  }
  lcd.setCursor(0, 1);
  char line2[17];
  snprintf(line2, sizeof(line2), "S:%4d T:%5.1fC", smokeValue, tempValue);
  lcd.print(line2);
}

void pushSensorData(int smokeValue, float tempValue, bool flameDetected, bool fireDetected) {
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
  payload += "\"state\":\"" + String(fireDetected ? "FIRE" : "NORMAL") + "\",";
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

void pushAlert(int smokeValue, float tempValue, bool flameDetected) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/alerts.json?auth=" + FIREBASE_AUTH;

  String payload = "{";
  payload += "\"coachId\":\"" + String(COACH_ID) + "\",";
  payload += "\"type\":\"FIRE\",";
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
