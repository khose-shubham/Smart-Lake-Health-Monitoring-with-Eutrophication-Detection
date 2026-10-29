# 🎓 College Project Demo & Presentation Script

**Project Title:** Smart Lake Health Monitoring System with Automated Eutrophication Cascade Detection & Actuation  
**Time Limit:** 5 to 7 Minutes  
**Target Audience:** External Examiners, Project Evaluators & Faculty  

---

## 🕒 Minute-by-Minute Presentation Timeline

### Minute 0:00 – 1:00: Problem Statement & Engineering Context
> *"Good morning respected evaluators. Fresh water lakes across our cities and agricultural belts are suffering from rapid ecological deterioration due to **eutrophication** — caused by unchecked agricultural runoff (nitrogen and phosphorus fertilizers) and domestic effluents.*  
> *Existing monitoring systems only take manual lab samples weeks after fish kills occur. Our project, **AquaSense**, is an autonomous, IoT-edge enabled lake monitoring and remediation system that predicts and intervenes in eutrophication in real time."*

---

### Minute 1:00 – 2:00: Hardware Architecture & Sensor Array
- Point to the ESP32 hardware station or running simulator.
- Explain the multi-sensor array:
  1. **DHT11 (GPIO 13)**: Monitors air temperature and ambient humidity (high water temperatures accelerate cyanobacteria blooms).
  2. **Turbidity Sensor (GPIO 34)**: Measures water clarity and algal suspension via 12-bit ADC with 10-sample median filtering.
  3. **Lake-Bank Soil Moisture Sensor (GPIO 32)**: Proxy for agricultural runoff surge and fertilizer leaching into the lake.
  4. **Bioacoustic Sensor (GPIO 35)**: Proxy for aquatic biological activity; hypoxia leads to acoustic silence as organisms asphyxiate.
  5. **16x2 I2C LCD (GPIO 21, 22)**: Field telemetry and system status readout.
  6. **Aeration Pump Relay (GPIO 18)**: Automated actuator that injects dissolved oxygen when hypoxia thresholds are breached.

---

### Minute 2:00 – 3:30: Live Dashboard Demonstration
Open the web application (`http://localhost:5173`):
1. **Overview Page**:
   - Showcase the **Eutrophication Risk Gauge** (0–100 score).
   - Point out the **5-Phase Ecological Cascade Progress Bar**:
     - Phase 0: Oligotrophic (Pristine)
     - Phase 1: Nutrient Influx
     - Phase 2: Algal Bloom
     - Phase 3: Microbial Decomposition
     - Phase 4: Hypoxia / Fish Kill
   - Show the 5 individual circular telemetry gauges.
   - Point out the live **WebSocket connection indicator** streaming 10-second updates without page reloading.

2. **Relay Control Widget**:
   - Demonstrate switching between **Auto Mode** and **Manual Override**.
   - Click "Engage Pump" to demonstrate direct manual control (show the relay LED turn ON or simulator relay log).

---

### Minute 3:30 – 4:30: Live Ecological Incident Simulation
Open terminal and trigger the simulator scenario:
```bash
# In terminal:
cd simulator
npm run bloom
```
Showcase the dashboard reacting within 10 seconds:
- Turbidity jumps to **68 NTU** (red warning).
- Bioacoustic sound plunges to **12 dB** (hypoxic silence).
- Risk Score climbs above **70/100**.
- **Critical Incident Alert banner** pulses at the top of the screen.
- **Aerator Relay automatically activates** in Auto Mode to restore dissolved oxygen levels!
- Switch to **Analytics Tab**: Show the dual-axis chart showing how runoff preceded turbidity and risk score surges.

---

### Minute 4:30 – 5:30: Incident Resolution & Compliance Export
1. Navigate to **Alerts Tab**:
   - Show the newly triggered critical alert.
   - Click **"Acknowledge"** and then **"Resolve"** to demonstrate incident lifecycle tracking.
2. Navigate to **Reports Tab**:
   - Show the Limnological Water Quality Standards table (Carlson Trophic State Index).
   - Click **"Download CSV Report"** to show instant data export for environmental researchers.
   - Click **"Download PDF Report"** to show structured compliance dossier generation.
3. Navigate to **Settings Tab**:
   - Show how administrators can reconfigure sensor threshold setpoints and multi-parameter heuristic weights without flashing new firmware.

---

### Minute 5:30 – 6:00: Conclusion & Examiner Q&A Defense

#### Common Examiner Questions & Model Answers:
1. **Q: Why use a soil moisture sensor in a lake monitoring project?**
   - *A: Soil moisture placed on the littoral lake-bank serves as an early-warning proxy for storm runoff. Agricultural fertilizers leach during bank saturation hours before algae visibly proliferate.*
2. **Q: How does the ESP32 handle ADC noise on GPIO 34?**
   - *A: The firmware takes 10 consecutive ADC samples per cycle, runs an insertion sort median filter to eliminate transient electrical spikes, and averages the remaining middle values.*
3. **Q: What happens if WiFi or backend goes down?**
   - *A: The ESP32 firmware features an offline circular buffer in RAM that stores up to 60 readings, and local autonomous relay control continues uninterrupted using onboard threshold logic.*
