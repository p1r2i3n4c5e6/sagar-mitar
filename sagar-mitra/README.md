# 🚢 SAGAR-MITRA — Marine Advisory & Fleet Safety System
## Multilingual Low-Bandwidth Fisheries Advisory for 0G/2G Marine Environments

---

## Architecture

```
SMARTPHONE (PWA)            BACKEND (FastAPI)           KEYPAD PHONE (SMS)
──────────────────          ─────────────────           ──────────────────
Auto GPS Lock            →  Haversine PFZ Matcher   →  Launch SMS (ta/te/hi/ml/bn)
Offline Compass HUD      ←  Dead-Reckoning Engine   →  Arrival SMS @ Zone
IMBL Border Audio Alarm  ←  IMBL Border Detection   →  Flash CLASS-0 Border Alert
Multilingual Voice TTS   ←  Localization Matrix     ←  2-way Reply (1/2/SOS)
```

---

## Quick Start

### Step 1 — Backend (Python)

```bash
cd sagar-mitra/backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Step 2 — Frontend (React PWA)

```bash
cd sagar-mitra/frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Test Offline Mode (Chrome DevTools)

1. Open Chrome → F12 → **Application** → **Service Workers** → check "Bypass for network: OFF"  
2. **Network tab** → Throttle → **Offline**  
3. Refresh the page — app loads from cache, GPS still works via satellite

---

## Environment Variables (optional SMS gateway)

Create `backend/.env`:
```env
FAST2SMS_API_KEY=your_key_here       # For Indian +91 numbers
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1415xxxxxxx
```

---

## SMS 2-Way Commands (Keypad Phone)

| Reply | Action |
|-------|--------|
| `1`   | Current heading & km to target zone |
| `2`   | Bearing back to nearest safe port |
| `SOS` | Distress — logs coordinates + rescue alert |

---

## Supported Languages

| Code | Language   |
|------|-----------|
| `ta` | Tamil      |
| `te` | Telugu     |
| `hi` | Hindi      |
| `ml` | Malayalam  |
| `bn` | Bengali    |

---

## Demo Protocol (3 minutes)

1. **(0:00–0:45)** Open app → GPS auto-lock → click **Launch SAGAR-MITRA** → see zone auto-assigned  
2. **(0:45–1:30)** Enable Airplane Mode → Compass still works → tap 🔊 Voice button → hear Tamil advisory  
3. **(1:30–2:30)** Click **Protect a Friend** → enter your own phone → click **Start SMS Protection**  
4. **(2:30–3:00)** Watch terminal dispatch: Launch SMS → Arrival SMS → Flash IMBL Border alert  

---

## File Structure

```
sagar-mitra/
├── backend/
│   ├── main.py              # FastAPI routes
│   ├── geo_engine.py        # Haversine + dead-reckoning
│   ├── localization.py      # UCS-2 multilingual templates
│   ├── sms_service.py       # Fast2SMS / Twilio / simulation
│   ├── models.py            # Pydantic schemas
│   ├── mock_data.py         # PFZ zones, harbors, IMBL border
│   ├── requirements.txt
│   └── mock_data/
│       ├── pfz_zones.json   # GeoJSON PFZ polygons
│       └── imbl_borders.json
└── frontend/
    ├── public/
    │   ├── manifest.json    # PWA manifest
    │   └── sw.js            # Service worker (cache-first)
    └── src/
        ├── App.tsx          # State machine
        ├── components/
        │   ├── Registration.tsx  # 2-step captain + crew setup
        │   ├── CompassHUD.tsx    # Zero-literacy rotating compass
        │   ├── Guardian.tsx      # Proxy SMS for keypad friends
        │   ├── SMSConsole.tsx    # Live dispatch terminal
        │   └── WeatherAlert.tsx  # Emergency lockout overlay
        └── utils/
            ├── geoMath.ts   # Client-side Haversine + IMBL check
            ├── gpsTracker.ts # watchPosition GPS (offline-native)
            ├── speech.ts    # Web Speech API multilingual TTS
            └── storage.ts   # LocalStorage session persistence
```
