# 🚢 SAGAR-MITRA (सागर मित्र) — Marine Advisory & Fleet Safety System
> **Multilingual, Low-Bandwidth & 0G/2G Fisheries Advisory & Safeguarding Engine for Traditional Fishermen**

---

## 📌 Project Overview & Purpose

**SAGAR-MITRA** (Ocean Friend) is an offline-first marine navigation, Potential Fishing Zone (PFZ) advisory, and safety system designed for traditional and small-scale fishermen operating in low-connectivity (0G/2G) coastal waters across the Bay of Bengal, Arabian Sea, Palk Strait, and Indian Ocean.

### 🌊 How SAGAR-MITRA Helps Fishermen:

1. **Prevents Maritime Arrests & Border Transgressions (IMBL Safety)**:
   - Tracks vessel location in real-time against the **International Maritime Boundary Line (IMBL)** (e.g., India-Sri Lanka border).
   - Automatically triggers high-volume audio warnings, visual alarms, and **Class-0 Flash SMS** alerts when approaching within 1.8 NM of border zones to prevent accidental crossing into foreign territorial waters.

2. **Maximizes Catch Yield (Potential Fishing Zones - PFZ)**:
   - Ranks candidate fishing spots by evaluating satellite ocean data (**Chlorophyll-a density** and **Sea Surface Temperature - SST**) alongside live wave and weather conditions.
   - Directs fishermen to high-density fish shoals while penalizing dangerous high-wave corridors.

3. **Operates in 0G / Zero Internet Connectivity**:
   - Works fully offline out at sea using Progressive Web App (PWA) service workers, pre-cached vector maps, offline compass HUD, and satellite-based GPS.

4. **Fleet Safety & Protection for Keypad Phone Users (Guardian System)**:
   - Small-boat fishermen using non-smart feature phones (keypad phones) can be proxy-registered by family or harbor crew.
   - Dispatches automated **2-way SMS advisories** (Launch Heading, Zone Arrival, Border Alerts, and Interactive SMS queries).

5. **Zero-Literacy & Multilingual Accessibility**:
   - Features a rotating visual compass HUD with color-coded safety indicators (`🟢 GO`, `🟡 CAUTION`, `🔴 NO-GO`).
   - Provides native voice advisories in **Tamil, Telugu, Hindi, Malayalam, and Bengali** via Text-to-Speech (TTS).

---

## 🛠️ Technical Stack

### **Frontend**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS & Lucide React Icons
- **PWA Capabilities**: Service Worker (`sw.js`) for cache-first offline support & Web App Manifest
- **Client Geospatial Logic**: HTML5 Geolocation API, Client-side Haversine Distance & IMBL GeoJSON Geofencing
- **Audio & Accessibility**: Web Speech API (`window.speechSynthesis`) for multilingual voice guidance

### **Backend**
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn ASGI Server
- **Validation**: Pydantic v2
- **HTTP Client**: Requests (for fetching external marine data)
- **Concurrency**: Python `asyncio` & `BackgroundTasks` for voyage simulations

### **Geospatial & Safety Engine**
- **Haversine Distance Algorithm**: Great-circle distance calculations between harbor, vessel, and PFZ spots.
- **Spherical Dead-Reckoning Engine**: Estimates vessel coordinates when GPS/network signals fade.
- **Vector Geofence Package**: Delivers green PFZ polygon features and red IMBL LineString boundaries for local caching.

---

## 🌐 API Architecture & Integrations

SAGAR-MITRA integrates external marine data services, SMS gateway APIs, custom backend REST APIs, and native browser Web APIs:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 SAGAR-MITRA System                      │
                  └────────────────────────────┬────────────────────────────┘
                                               │
    ┌───────────────────────────┬──────────────┴─────────────┬───────────────────────────┐
    │                           │                            │                           │
┌───┴───────────────┐   ┌───────┴───────────────┐    ┌───────┴───────────────┐   ┌───────┴───────────────┐
│     SMS APIs      │   │  Marine Weather APIs  │    │   Backend REST APIs   │   │  Browser Web APIs     │
├───────────────────┤   ├───────────────────────┤    ├───────────────────────┤   ├───────────────────────┤
│ • Fast2SMS bulkV2 │   │ • Open-Meteo Marine   │    │ • /api/ocean/analyze  │   │ • Geolocation API     │
│ • Twilio SMS      │   │ • Open-Meteo Forecast │    │ • /api/advisory/*     │   │ • Web Speech API (TTS)│
│ • 2-Way Webhook   │   │ • NOAA Tides & Current│    │ • /api/guardian/*     │   │ • Service Worker PWA  │
└───────────────────┘   └───────────────────────┘    └───────────────────────┘   └───────────────────────┘
```

### 1. 📱 SMS & Communication APIs
- **Fast2SMS API (`bulkV2`)**: Primary SMS gateway for Indian (`+91`) mobile numbers.
  - **Quick Transactional Route (`q`)**: Used for urgent advisories and Class-0 Flash emergency border warnings.
  - **Promotional Route (`p`)**: Fallback route for advisory distribution.
- **Twilio SMS API (Optional/Secondary)**: Integration ready for international SMS dispatch and direct REST messaging (`/api/guardian/send-sms`).
- **Inbound SMS Webhook API (`/api/sms/webhook`)**: 2-way communication handler for keypad phone replies:
  - `1`: Query current heading & distance to target fishing zone.
  - `2`: Query safe return bearing to nearest harbor.
  - `SOS`: Log emergency distress coordinates and dispatch rescue acknowledgment.

### 🛰️ External Ocean Data Integration Stack

* **Marine Dynamics Engine** `Open-Meteo Marine API`
  > 🔗 `https://marine-api.open-meteo.com/v1/marine`  
  > 📊 **Metrics:** Live Wave Height, Swell Waves, Peak Wave Period.

* **Atmospheric Wind Vector Feed** `Open-Meteo Forecast API`
  > 🔗 `https://api.open-meteo.com/v1/forecast`  
  > 💨 **Metrics:** Surface Wind Speed (10m), Wind Gusts, Wind Bearing/Direction.

* **Hydrographic & Tidal Feed** `NOAA Tides & Currents API`
  > 🔗 `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter`  
  > 🌊 **Metrics:** High/Low Tide Predictions, Water Levels, Dynamic Tidal Phase.

### 3. ⚙️ Internal Backend REST APIs
- `GET /api/ocean/analyze`: Analyzes sea conditions (`GREEN_SAFE`, `YELLOW_CAUTION`, `RED_LOCKDOWN`) and ranks candidate fishing spots.
- `GET /api/advisory/nearest`: Returns closest optimal PFZ zone based on current coordinates.
- `GET /api/geofence/package`: Pre-delivers GeoJSON PFZ polygons and IMBL LineStrings for offline client caching.
- `POST /api/guardian/register-trip`: Proxy-registers a keypad phone trip and initiates background SMS simulation.
- `GET /api/guardian/logs`: Exposes live SMS dispatch logs.
- `GET /api/sos/events`: Logs emergency distress coordinates.

### 4. 📲 Browser Native Web APIs
- **HTML5 Geolocation API**: `navigator.geolocation.watchPosition` for offline satellite GPS tracking.
- **Web Speech API**: `window.speechSynthesis` for native multilingual text-to-speech audio advisories.
- **Service Worker API**: `CacheStorage` for zero-connectivity app rendering.

---

## 📱 Keypad Phone (2-Way SMS) Command Matrix

Fishermen using feature phones can text the system via SMS:

| Reply Text | Action Executed by Backend | Response Delivered to Keypad Phone |
|------------|----------------------------|-----------------------------------|
| `1` | Calculates current heading & distance | `"Head 095° East for 18km to reach Nagapattinam Deep Trench."` |
| `2` | Calculates return bearing to closest harbor | `"Emergency Return: Head 270° West for 15km to reach Nagapattinam Port."` |
| `SOS` | Logs emergency GPS & flags distress | `"🚨 RESCUE ACKNOWLEDGED: Emergency position logged. Coast Guard notified."` |

---

## 🗣️ Supported Languages

| Language Code | Language Name | Native Script |
|---------------|---------------|---------------|
| `ta` | Tamil | தமிழ் |
| `te` | Telugu | తెలుగు |
| `hi` | Hindi | हिन्दी |
| `ml` | Malayalam | മലയാളം |
| `bn` | Bengali | বাংলা |

---

## 🚀 Installation & Local Setup Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

---

### Step 1: Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd sagar-mitra/backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate        # On Windows: venv\Scripts\activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. *(Optional)* Configure Environment Variables:
   Create a `.env` file inside `sagar-mitra/backend/`:
   ```env
   FAST2SMS_API_KEY=your_fast2sms_api_key_here
   TWILIO_ACCOUNT_SID=your_twilio_sid_here
   TWILIO_AUTH_TOKEN=your_twilio_token_here
   TWILIO_FROM_NUMBER=+1415xxxxxxx
   ```

5. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   - **Backend API**: `http://localhost:8000`
   - **Interactive API Documentation (Swagger)**: `http://localhost:8000/docs`

---

### Step 2: Frontend Setup (React PWA)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd sagar-mitra/frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - **Application URL**: `http://localhost:5173`

---

## ✈️ Testing 0G Offline Mode

To verify offline functionality in Google Chrome:

1. Open `http://localhost:5173` in Chrome.
2. Open DevTools (`F12` or `Right-Click -> Inspect`).
3. Go to **Application** → **Service Workers** → Ensure **"Bypass for network"** is UNCHECKED.
4. Switch to the **Network** tab → Change throttling dropdown from **No throttling** to **Offline**.
5. Refresh the page (`F5`).
6. **Result**: The app continues to run seamlessly from cache, GPS coordinates update via hardware satellite lock, and the offline compass HUD remains fully operational.

---

## 📂 Repository Directory Structure

```
sagar-mitra/
├── backend/
│   ├── main.py              # FastAPI application & REST routing
│   ├── geo_engine.py        # Haversine, bearing & dead-reckoning engine
│   ├── ocean_service.py     # Open-Meteo & NOAA integration & PFZ scoring
│   ├── sms_service.py       # Fast2SMS & Twilio dispatch engine
│   ├── localization.py      # Multilingual SMS & voice template matrix
│   ├── models.py            # Pydantic data validation schemas
│   ├── mock_data.py         # Static harbor & PFZ fallback coordinates
│   ├── requirements.txt     # Python dependencies
│   └── mock_data/           # Spatial GeoJSON datasets
│       ├── pfz_zones.json   # Candidate PFZ polygons
│       └── imbl_borders.json# India-Sri Lanka IMBL boundary line
└── frontend/
    ├── public/
    │   ├── manifest.json    # Progressive Web App manifest
    │   ├── sw.js            # Service worker (offline cache engine)
    │   └── anchor.svg       # Maritime branding assets
    └── src/
        ├── App.tsx          # Application state & screen routing
        ├── components/
        │   ├── CompassHUD.tsx    # Zero-literacy rotating compass HUD
        │   ├── FishingMapApp.tsx # Marine map & PFZ score visualizer
        │   ├── Guardian.tsx      # Keypad phone proxy registration
        │   ├── Registration.tsx  # Captain & crew setup
        │   ├── SMSConsole.tsx    # Live SMS dispatch terminal
        │   └── WeatherAlert.tsx  # Storm & lockdown alert overlay
        └── utils/
            ├── geoMath.ts        # Client-side Haversine & IMBL geofence check
            ├── gpsTracker.ts     # Offline-native GPS tracking
            ├── marineWeatherApi.ts# Open-Meteo & NOAA client integration
            ├── speech.ts         # Multilingual Web Speech API (TTS)
            └── storage.ts        # LocalStorage persistence manager
```

---

## Made by: Vishal Choudhary, Sheetal Gupta, Prince Chaurasiya and Vedansh Singhal

## 📜 License

This project is open-source under the MIT License. Developed for coastal fishermen safety and sustainable marine fisheries management.
