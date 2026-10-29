/*
 * ═══════════════════════════════════════════════════════════════════
 *  Smart Lake Health Monitoring — ESP32 Firmware
 *  Eutrophication Detection System
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Sensors:
 *    - DHT11        → GPIO 13  (Air temperature + humidity)
 *    - Turbidity    → GPIO 34  (Analog, 12-bit ADC)
 *    - Sound        → GPIO 35  (Analog, 12-bit ADC)
 *    - Soil Moisture→ GPIO 32  (Analog, 12-bit ADC, runoff proxy)
 *    - Relay        → GPIO 18  (Aeration pump / alarm)
 *    - 16x2 LCD     → I2C SDA 21, SCL 22
 *
 *  Libraries required (install via Arduino Library Manager):
 *    - DHT sensor library (by Adafruit)
 *    - Adafruit Unified Sensor
 *    - LiquidCrystal_I2C
 *    - ArduinoJson (v6+)
 *    - Wire (built-in)
 *    - WiFi (built-in ESP32)
 *    - HTTPClient (built-in ESP32)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <time.h>

// ─── Pin Definitions ───────────────────────────────────────────────
#define DHT_PIN          13
#define DHT_TYPE         DHT11
#define TURBIDITY_PIN    34
#define SOUND_PIN        35
#define SOIL_PIN         32
#define RELAY_PIN        18

// ─── Configuration ─────────────────────────────────────────────────
#define SAMPLE_COUNT          10
#define SEND_INTERVAL_MS      10000   // 10 seconds
#define LCD_ROTATE_MS         3000    // 3 seconds per screen
#define MAX_BUFFER_SIZE       60      // Max offline readings buffer
#define RELAY_MIN_ON_MS       30000   // 30s min relay ON time
#define WIFI_RETRY_INTERVAL   5000    // 5s between WiFi retries
#define NTP_RETRY_INTERVAL    10000   // 10s between NTP retries

// ─── WiFi & Server Config ──────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASS     = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://192.168.1.100:5000/api/readings";
const char* RELAY_URL     = "http://192.168.1.100:5000/api/relay/status";
const char* DEVICE_ID     = "LAKE_NODE_01";
const char* API_KEY       = "lake-monitor-api-key-2024";

// ─── NTP Config ────────────────────────────────────────────────────
const char* NTP_SERVER    = "pool.ntp.org";
const long  GMT_OFFSET    = 19800;    // IST +5:30
const int   DST_OFFSET    = 0;

// ─── Turbidity Calibration (linear: NTU = slope * voltage + intercept)
float TURB_CAL_SLOPE      = -1120.4f;
float TURB_CAL_INTERCEPT  = 5000.0f;
float TURB_CAL_VREF       = 3.3f;

// ─── Thresholds (local fallback — synced from server when online)
float THRESH_TEMP_WARN    = 28.0f;
float THRESH_TEMP_CRIT    = 33.0f;
float THRESH_TURB_WARN    = 10.0f;
float THRESH_TURB_CRIT    = 50.0f;
float THRESH_SOUND_WARN   = 15.0f;   // dB above baseline
float THRESH_SOUND_CRIT   = 30.0f;
float THRESH_SOIL_WARN    = 41.0f;   // %
float THRESH_SOIL_CRIT    = 60.0f;

// ─── Hysteresis ────────────────────────────────────────────────────
#define HYSTERESIS_PCT    0.10f  // 10% below threshold to clear

// ─── Objects ───────────────────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);   // Try 0x3F if 0x27 doesn't work

// ─── State Variables ───────────────────────────────────────────────
float temperature     = 0.0f;
float humidity        = 0.0f;
float turbidityNTU    = 0.0f;
int   turbidityRaw    = 0;
float soundLevel      = 0.0f;   // dB relative to baseline
int   soundRaw        = 0;
float soilMoisturePct = 0.0f;
int   soilRaw         = 0;

// Sound baseline (captured at boot)
float soundBaseline   = 0.0f;

// Risk
enum RiskLevel { SAFE, WARNING, CRITICAL };
RiskLevel currentRisk = SAFE;
const char* riskLabels[] = { "SAFE", "WARNING", "CRITICAL" };

// Relay
bool relayOn          = false;
bool relayAutoMode    = true;     // true = auto, false = manual override
bool relayManualState = false;    // manual override state
unsigned long relayOnSince = 0;

// LCD screen rotation
int lcdScreen         = 0;
unsigned long lastLcdRotate = 0;

// Timing
unsigned long lastSend    = 0;
unsigned long lastWifiTry = 0;
bool ntpSynced            = false;

// ─── Offline Buffer ────────────────────────────────────────────────
struct SensorReading {
  float temp;
  float hum;
  float turbNtu;
  int   turbRaw;
  float soundLvl;
  int   sndRaw;
  float soilPct;
  int   slRaw;
  char  riskStr[10];
  char  timestamp[30];
  bool  relayState;
};

SensorReading offlineBuffer[MAX_BUFFER_SIZE];
int bufferCount = 0;

// ─── Custom LCD Characters ─────────────────────────────────────────
byte waveChar[8] = {
  0b00000, 0b00000, 0b00001, 0b00011,
  0b10110, 0b11100, 0b01000, 0b00000
};
byte dropChar[8] = {
  0b00100, 0b00100, 0b01110, 0b11111,
  0b11111, 0b11111, 0b01110, 0b00000
};

// ═══════════════════════════════════════════════════════════════════
//  MEDIAN FILTER — Sort-based median of N samples
// ═══════════════════════════════════════════════════════════════════
void sortArray(int arr[], int n) {
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        int tmp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = tmp;
      }
    }
  }
}

int readAnalogMedian(int pin) {
  int samples[SAMPLE_COUNT];
  long sum = 0;

  // Collect samples
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    samples[i] = analogRead(pin);
    delay(5);
  }

  // Sort for median
  sortArray(samples, SAMPLE_COUNT);

  // Take middle 6 samples (reject 2 highest and 2 lowest)
  int trimStart = 2;
  int trimEnd = SAMPLE_COUNT - 2;
  for (int i = trimStart; i < trimEnd; i++) {
    sum += samples[i];
  }

  return (int)(sum / (trimEnd - trimStart));
}

// ═══════════════════════════════════════════════════════════════════
//  SENSOR READING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

void readDHT() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) temperature = t;
  if (!isnan(h)) humidity = h;
}

void readTurbidity() {
  turbidityRaw = readAnalogMedian(TURBIDITY_PIN);
  // Convert raw ADC to voltage, then to NTU
  float voltage = (turbidityRaw / 4095.0f) * TURB_CAL_VREF;
  turbidityNTU = TURB_CAL_SLOPE * voltage + TURB_CAL_INTERCEPT;
  if (turbidityNTU < 0) turbidityNTU = 0;
  if (turbidityNTU > 1000) turbidityNTU = 1000; // Clamp
}

void readSound() {
  soundRaw = readAnalogMedian(SOUND_PIN);
  // Convert to dB-equivalent relative to baseline
  float rawRatio = (soundRaw > 0) ? (float)soundRaw / max(soundBaseline, 1.0f) : 0;
  // Logarithmic conversion: dB = 20 * log10(ratio)
  if (rawRatio > 0.001f) {
    soundLevel = 20.0f * log10(rawRatio);
  } else {
    soundLevel = 0.0f;
  }
  if (soundLevel < 0) soundLevel = 0;
}

void readSoilMoisture() {
  soilRaw = readAnalogMedian(SOIL_PIN);
  // Typical: dry = 4095, wet = 0 (resistive sensor)
  // Invert and scale to 0-100%
  soilMoisturePct = (1.0f - (soilRaw / 4095.0f)) * 100.0f;
  soilMoisturePct = constrain(soilMoisturePct, 0.0f, 100.0f);
}

void captureBaseline() {
  Serial.println("[INIT] Capturing sound baseline (5 seconds)...");
  long sum = 0;
  int count = 50;
  for (int i = 0; i < count; i++) {
    sum += analogRead(SOUND_PIN);
    delay(100);
  }
  soundBaseline = (float)sum / count;
  Serial.printf("[INIT] Sound baseline: %.1f (raw ADC)\n", soundBaseline);
}

// ═══════════════════════════════════════════════════════════════════
//  THRESHOLD & RISK LOGIC (with hysteresis)
// ═══════════════════════════════════════════════════════════════════

RiskLevel evaluateRisk() {
  int critCount = 0;
  int warnCount = 0;

  // Temperature
  if (temperature > THRESH_TEMP_CRIT)      critCount++;
  else if (temperature > THRESH_TEMP_WARN) warnCount++;

  // Turbidity
  if (turbidityNTU > THRESH_TURB_CRIT)     critCount++;
  else if (turbidityNTU > THRESH_TURB_WARN) warnCount++;

  // Sound
  if (soundLevel > THRESH_SOUND_CRIT)      critCount++;
  else if (soundLevel > THRESH_SOUND_WARN) warnCount++;

  // Soil moisture
  if (soilMoisturePct > THRESH_SOIL_CRIT)  critCount++;
  else if (soilMoisturePct > THRESH_SOIL_WARN) warnCount++;

  // Decision
  if (critCount >= 2 || (critCount >= 1 && warnCount >= 2)) return CRITICAL;
  if (critCount >= 1 || warnCount >= 2)                     return WARNING;
  return SAFE;
}

void manageRelay() {
  unsigned long now = millis();

  if (!relayAutoMode) {
    // Manual override
    digitalWrite(RELAY_PIN, relayManualState ? HIGH : LOW);
    relayOn = relayManualState;
    return;
  }

  // Auto mode with hysteresis
  RiskLevel risk = evaluateRisk();
  currentRisk = risk;

  if (risk >= WARNING && !relayOn) {
    // Turn ON
    digitalWrite(RELAY_PIN, HIGH);
    relayOn = true;
    relayOnSince = now;
    Serial.println("[RELAY] ON — Risk elevated");
  }
  else if (risk == SAFE && relayOn) {
    // Turn OFF only after minimum ON time (prevent chatter)
    if ((now - relayOnSince) >= RELAY_MIN_ON_MS) {
      // Apply hysteresis: only turn off if clearly below thresholds
      bool clearBelow = (temperature < THRESH_TEMP_WARN * (1 - HYSTERESIS_PCT)) &&
                        (turbidityNTU < THRESH_TURB_WARN * (1 - HYSTERESIS_PCT)) &&
                        (soundLevel < THRESH_SOUND_WARN * (1 - HYSTERESIS_PCT)) &&
                        (soilMoisturePct < THRESH_SOIL_WARN * (1 - HYSTERESIS_PCT));
      if (clearBelow) {
        digitalWrite(RELAY_PIN, LOW);
        relayOn = false;
        Serial.println("[RELAY] OFF — Risk cleared with hysteresis");
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  LCD DISPLAY — Rotating Screens
// ═══════════════════════════════════════════════════════════════════

void updateLCD() {
  unsigned long now = millis();
  if (now - lastLcdRotate < LCD_ROTATE_MS) return;
  lastLcdRotate = now;

  lcd.clear();

  switch (lcdScreen) {
    case 0: // Temperature & Humidity
      lcd.setCursor(0, 0);
      lcd.write(1); // drop icon
      lcd.print(" Temp: ");
      lcd.print(temperature, 1);
      lcd.print((char)223); // degree symbol
      lcd.print("C");
      lcd.setCursor(0, 1);
      lcd.print("  Hum:  ");
      lcd.print(humidity, 1);
      lcd.print("%");
      break;

    case 1: // Turbidity
      lcd.setCursor(0, 0);
      lcd.write(0); // wave icon
      lcd.print(" Turbidity");
      lcd.setCursor(0, 1);
      lcd.print("  ");
      lcd.print(turbidityNTU, 1);
      lcd.print(" NTU");
      break;

    case 2: // Sound Level
      lcd.setCursor(0, 0);
      lcd.print("  Sound Level");
      lcd.setCursor(0, 1);
      lcd.print("  +");
      lcd.print(soundLevel, 1);
      lcd.print(" dB rel");
      break;

    case 3: // Soil Moisture
      lcd.setCursor(0, 0);
      lcd.write(1); // drop icon
      lcd.print(" Soil Moisture");
      lcd.setCursor(0, 1);
      lcd.print("  ");
      lcd.print(soilMoisturePct, 1);
      lcd.print("%");
      break;

    case 4: // Risk Status & Relay
      lcd.setCursor(0, 0);
      lcd.print("Risk: ");
      lcd.print(riskLabels[currentRisk]);
      lcd.setCursor(0, 1);
      lcd.print("Pump: ");
      lcd.print(relayOn ? "ON " : "OFF");
      lcd.print(relayAutoMode ? " [AUTO]" : " [MAN]");
      break;
  }

  lcdScreen = (lcdScreen + 1) % 5;
}

// ═══════════════════════════════════════════════════════════════════
//  TIMESTAMP (NTP)
// ═══════════════════════════════════════════════════════════════════

String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return String(millis()); // Fallback to millis
  }
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  // Append timezone
  snprintf(buf + strlen(buf), sizeof(buf) - strlen(buf), "+05:30");
  return String(buf);
}

// ═══════════════════════════════════════════════════════════════════
//  NETWORKING
// ═══════════════════════════════════════════════════════════════════

bool isWifiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

void connectWifi() {
  if (isWifiConnected()) return;

  unsigned long now = millis();
  if (now - lastWifiTry < WIFI_RETRY_INTERVAL) return;
  lastWifiTry = now;

  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 10) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (isWifiConnected()) {
    Serial.println();
    Serial.print("[WiFi] Connected! IP: ");
    Serial.println(WiFi.localIP());

    // Sync NTP
    if (!ntpSynced) {
      configTime(GMT_OFFSET, DST_OFFSET, NTP_SERVER);
      struct tm timeinfo;
      if (getLocalTime(&timeinfo, 5000)) {
        ntpSynced = true;
        Serial.println("[NTP] Time synced");
      }
    }
  }
}

bool sendReading(SensorReading &reading) {
  if (!isWifiConnected()) return false;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(5000);

  // Build JSON payload
  StaticJsonDocument<512> doc;
  doc["device_id"]         = DEVICE_ID;
  doc["timestamp"]         = reading.timestamp;
  doc["temperature"]       = reading.temp;
  doc["humidity"]          = reading.hum;
  doc["turbidity_raw"]     = reading.turbRaw;
  doc["turbidity_ntu"]     = reading.turbNtu;
  doc["sound_raw"]         = reading.sndRaw;
  doc["sound_level"]       = reading.soundLvl;
  doc["soil_moisture_raw"] = reading.slRaw;
  doc["soil_moisture_pct"] = reading.soilPct;
  doc["relay_state"]       = reading.relayState;
  doc["risk_level"]        = reading.riskStr;

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  http.end();

  if (httpCode == 200 || httpCode == 201) {
    Serial.printf("[HTTP] Sent OK (%d)\n", httpCode);
    return true;
  } else {
    Serial.printf("[HTTP] Failed (%d)\n", httpCode);
    return false;
  }
}

void bufferReading() {
  if (bufferCount >= MAX_BUFFER_SIZE) {
    // Drop oldest (shift left)
    for (int i = 0; i < MAX_BUFFER_SIZE - 1; i++) {
      offlineBuffer[i] = offlineBuffer[i + 1];
    }
    bufferCount = MAX_BUFFER_SIZE - 1;
  }

  SensorReading &r = offlineBuffer[bufferCount];
  r.temp     = temperature;
  r.hum      = humidity;
  r.turbNtu  = turbidityNTU;
  r.turbRaw  = turbidityRaw;
  r.soundLvl = soundLevel;
  r.sndRaw   = soundRaw;
  r.soilPct  = soilMoisturePct;
  r.slRaw    = soilRaw;
  r.relayState = relayOn;
  strncpy(r.riskStr, riskLabels[currentRisk], sizeof(r.riskStr));
  String ts = getTimestamp();
  strncpy(r.timestamp, ts.c_str(), sizeof(r.timestamp));

  bufferCount++;
}

void flushBuffer() {
  if (bufferCount == 0 || !isWifiConnected()) return;

  Serial.printf("[BUFFER] Flushing %d buffered readings...\n", bufferCount);
  int sent = 0;
  for (int i = 0; i < bufferCount; i++) {
    if (sendReading(offlineBuffer[i])) {
      sent++;
    } else {
      // Shift remaining to front
      for (int j = i; j < bufferCount; j++) {
        offlineBuffer[j - sent] = offlineBuffer[j];
      }
      bufferCount -= sent;
      return;
    }
  }
  bufferCount = 0;
  Serial.printf("[BUFFER] All %d readings sent\n", sent);
}

void checkRemoteRelayCommand() {
  if (!isWifiConnected()) return;

  HTTPClient http;
  String url = String(RELAY_URL) + "?device_id=" + DEVICE_ID;
  http.begin(url);
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(3000);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, response) == DeserializationError::Ok) {
      if (doc.containsKey("mode")) {
        String mode = doc["mode"].as<String>();
        relayAutoMode = (mode == "auto");
        if (!relayAutoMode && doc.containsKey("state")) {
          relayManualState = doc["state"].as<bool>();
        }
        Serial.printf("[RELAY CMD] Mode: %s, Manual state: %s\n",
          mode.c_str(), relayManualState ? "ON" : "OFF");
      }
    }
  }
  http.end();
}

// ═══════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("════════════════════════════════════════");
  Serial.println("  Smart Lake Health Monitor v1.0");
  Serial.println("  Eutrophication Detection System");
  Serial.println("════════════════════════════════════════");

  // Initialize pins
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  // Initialize I2C and LCD
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, waveChar);
  lcd.createChar(1, dropChar);

  lcd.setCursor(0, 0);
  lcd.print(" Lake Monitor");
  lcd.setCursor(0, 1);
  lcd.print("  Starting...");

  // Initialize DHT
  dht.begin();
  delay(1000);

  // Capture sound baseline at boot
  captureBaseline();

  // Connect WiFi
  WiFi.mode(WIFI_STA);
  connectWifi();

  // Show ready
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" System Ready");
  lcd.setCursor(0, 1);
  if (isWifiConnected()) {
    lcd.print(WiFi.localIP().toString());
  } else {
    lcd.print(" Offline Mode");
  }
  delay(2000);

  Serial.println("[INIT] System ready!");
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // Maintain WiFi connection
  connectWifi();

  // Read all sensors
  readDHT();
  readTurbidity();
  readSound();
  readSoilMoisture();

  // Evaluate risk and manage relay
  currentRisk = evaluateRisk();
  manageRelay();

  // Update LCD (rotates automatically)
  updateLCD();

  // Send data every SEND_INTERVAL_MS
  if (now - lastSend >= SEND_INTERVAL_MS) {
    lastSend = now;

    // Print to Serial
    Serial.println("─── Sensor Readings ───────────────────");
    Serial.printf("  Temp: %.1f°C  Hum: %.1f%%\n", temperature, humidity);
    Serial.printf("  Turbidity: %.1f NTU (raw: %d)\n", turbidityNTU, turbidityRaw);
    Serial.printf("  Sound: +%.1f dB (raw: %d, base: %.0f)\n", soundLevel, soundRaw, soundBaseline);
    Serial.printf("  Soil: %.1f%% (raw: %d)\n", soilMoisturePct, soilRaw);
    Serial.printf("  Risk: %s  Relay: %s\n", riskLabels[currentRisk], relayOn ? "ON" : "OFF");
    Serial.println("───────────────────────────────────────");

    // Buffer the reading
    bufferReading();

    // Try to send (flush buffer)
    if (isWifiConnected()) {
      flushBuffer();
      // Check for remote relay commands periodically
      checkRemoteRelayCommand();
    } else {
      Serial.printf("[OFFLINE] Buffered (%d/%d)\n", bufferCount, MAX_BUFFER_SIZE);
    }
  }

  delay(100); // Small delay to prevent watchdog issues
}
