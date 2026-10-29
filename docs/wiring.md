# 🔌 Hardware Wiring & Sensor Calibration Guide

## 1. ESP32 Pin Allocation Table

The system uses standard ESP32 NodeMCU / DevKit V1 (30-pin or 38-pin).

| Component | Sensor Pin | ESP32 Pin | Logic Level | Mode / Type | Purpose |
|---|---|---|---|---|---|
| **DHT11** | DATA / OUT | **GPIO 13** | 3.3V / 5V | Digital (1-wire) | Air Temperature & Relative Humidity |
| **Turbidity Sensor** | Analog OUT | **GPIO 34** (ADC1_CH6) | 0–3.3V | 12-bit ADC Input | Water clarity & suspended algae (NTU) |
| **Sound / Acoustic** | Analog OUT | **GPIO 35** (ADC1_CH7) | 0–3.3V | 12-bit ADC Input | Bioactivity & fish respiration acoustics |
| **Soil Moisture** | Analog OUT | **GPIO 32** (ADC1_CH4) | 0–3.3V | 12-bit ADC Input | Lake-bank runoff & fertilizer leaching |
| **Relay Module** | IN / Trigger | **GPIO 18** | 3.3V | Digital Output | Aeration water pump actuator |
| **16x2 I2C LCD** | SDA | **GPIO 21** | 3.3V | I2C Bus | Live on-site telemetry display |
| **16x2 I2C LCD** | SCL | **GPIO 22** | 3.3V | I2C Bus | Live on-site telemetry clock |

---

## 2. Power Supply Circuit & Voltage Regulation

> [!IMPORTANT]
> The ESP32 analog pins **MUST NOT** receive voltages exceeding **3.3V**. Connecting 5V analog outputs directly to ESP32 ADC pins will permanently damage the microcontroller.

- **VCC (5V Rail)**: Supply 5V (2A minimum) to the ESP32 `VIN` pin, Relay Module `VCC`, and the 16x2 I2C LCD `VCC`.
- **Sensors VCC**:
  - DHT11: Power from ESP32 `3.3V` pin or `5V` (with 10kΩ pull-up on DATA).
  - Soil Moisture Sensor: Power from `3.3V` to keep output range within 0–3.3V.
  - Sound Sensor: Power from `3.3V` to keep output within 0–3.3V.
  - Turbidity Sensor (e.g., DF-Robot / generic SKU): Sensor board runs on 5V. If analog output exceeds 3.3V at maximum clarity, use a simple 2-resistor voltage divider (10kΩ and 20kΩ) or calibrate ADC attenuation with `analogSetPinAttenuation(34, ADC_11db)`.
- **Common Ground**: Ensure all sensor GNDs, Relay GND, and ESP32 GND are tied to a single common ground bus.

---

## 3. Sensor Calibration Procedures

### A. Turbidity Sensor (NTU Calibration)
1. Place sensor in distilled / purified water (0 NTU reference). Record ADC voltage $V_{clear}$ (typically ~3.0V – 3.3V).
2. Prepare a 100 NTU calibration turbidity solution (or calibrate against standard formazin).
3. The relationship between turbidity $T$ (in NTU) and output voltage $V$ is modeled by:
   $$T = -1120.4 \times V^2 + 5742.3 \times V - 4352.9$$
   *(or linear approximation for 0–100 NTU)*:
   $$T = (V_{clear} - V_{actual}) \times K$$
4. Update the calibration coefficients in the backend `/api/thresholds` or directly on the dashboard **Settings** tab.

### B. Soil Moisture Sensor (Lake-Bank Runoff Proxy)
1. Dry Air Reading: Place sensor in open dry air. Record ADC reading $ADC_{dry}$ (~3500–4095).
2. Saturated Wet Reading: Submerge sensor in a cup of water up to the boundary line. Record ADC reading $ADC_{wet}$ (~1200–1600).
3. Moisture Percentage:
   $$\text{Moisture \%} = \frac{ADC_{dry} - ADC_{read}}{ADC_{dry} - ADC_{wet}} \times 100\%$$

### C. Sound / Acoustic Sensor (Bioactivity Proxy)
1. Measures biological acoustics in the lake littoral zone.
2. In healthy waters, continuous acoustic activity (40–60 dB-rel) is present due to aquatic organisms, fish gill movements, and water current.
3. During severe eutrophication anoxia, bioacoustics plunge to &lt;15 dB-rel (acoustic silence).

---

## 4. 16x2 LCD Display Layout

The ESP32 firmware updates the LCD in two alternating cycles:

**Cycle 1 (Telemetry Values):**
```
+----------------+
|T:24.2C  H:68%  |
|Turb:12.5 Soil45|
+----------------+
```

**Cycle 2 (Ecological Status & Pump):**
```
+----------------+
|Risk: 18/100 OK |
|Pump: OFF [AUTO]|
+----------------+
```
