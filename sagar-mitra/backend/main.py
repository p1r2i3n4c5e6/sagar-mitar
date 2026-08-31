"""
SAGAR-MITRA — FastAPI Backend
Handles: PFZ advisory, guardian trip registration, live SMS logs, inbound SMS webhook.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from pydantic import BaseModel
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import CaptainProfile, FriendTripRequest, SMSWebhookPayload
from mock_data import HARBORS, PFZ_ZONES, WEATHER_HAZARDS
from geo_engine import (
    find_nearest_optimal_pfz,
    dead_reckoning_position,
    min_distance_to_imbl,
    safe_return_bearing,
    calculate_bearing,
    haversine_distance,
)
from localization import get_message, supported_languages
from sms_service import send_sms, get_logs
from ocean_service import analyze_port_and_spots, CANDIDATE_SPOTS

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SAGAR-MITRA Maritime Engine",
    version="1.0.0",
    description="Low-bandwidth fisheries advisory & fleet safety API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory state ─────────────────────────────────────────────────────────
CAPTAIN_SESSIONS: dict[str, dict] = {}       # phone → profile
ACTIVE_KEYPAD_TRIPS: dict[str, dict] = {}    # friend_phone → trip state
SOS_EVENTS: list[dict] = []                  # distress log


# ─── Background: Voyage simulation ───────────────────────────────────────────
async def run_keypad_simulation(
    phone: str,
    lang: str,
    h_lat: float, h_lon: float,
    t_lat: float, t_lon: float,
    bearing: float,
    dist_km: float,
) -> None:
    """
    Simulates a 3-event voyage for live demo:
    1. Departure SMS  (immediate)
    2. Zone Reached   (after 8 s)
    3. IMBL Flash     (after 16 s)
    """
    trip = ACTIVE_KEYPAD_TRIPS.get(phone)

    # Step 1 – Launch advisory
    wave = trip["trip"].get("wave_height", 0.9) if trip else 0.9
    msg = get_message(lang, "LAUNCH", bearing=int(bearing), dist=int(dist_km), wave=wave)
    send_sms(phone, msg)

    await asyncio.sleep(8)

    # Step 2 – Zone reached
    if phone in ACTIVE_KEYPAD_TRIPS:
        ACTIVE_KEYPAD_TRIPS[phone]["status"] = "AT_ZONE"
    msg = get_message(lang, "REACHED")
    send_sms(phone, msg)

    await asyncio.sleep(8)

    # Step 3 – IMBL border simulation (proximity alert ~1.8 NM)
    if phone in ACTIVE_KEYPAD_TRIPS:
        ACTIVE_KEYPAD_TRIPS[phone]["status"] = "BORDER_WARNING"
    msg = get_message(lang, "BORDER_ALERT", dist=round(1.8 * 1.852, 1))  # NM→km
    send_sms(phone, msg, is_flash=True)

    if phone in ACTIVE_KEYPAD_TRIPS:
        ACTIVE_KEYPAD_TRIPS[phone]["status"] = "COMPLETED"


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "SAGAR-MITRA Maritime Engine",
        "status": "ONLINE",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/advisory/nearest")
def get_nearest_pfz(lat: float, lon: float):
    """Return the closest OPTIMAL PFZ and navigation data."""
    return find_nearest_optimal_pfz(lat, lon)


@app.get("/api/ocean/analyze")
def get_ocean_analysis(lat: float = 10.767, lon: float = 79.842):
    """
    Evaluates sea safety status (GO / CAUTION / NO-GO) and ranks
    candidate fishing spots using live Open-Meteo Marine APIs.
    """
    return analyze_port_and_spots(lat, lon)


@app.get("/api/advisory/all-zones")
def get_all_zones():
    return PFZ_ZONES


@app.get("/api/advisory/weather")
def get_weather():
    return WEATHER_HAZARDS


@app.get("/api/harbors")
def get_harbors():
    return [{"id": k, **v} for k, v in HARBORS.items()]


@app.get("/api/geofence/package")
def get_geofence_package(lat: float, lon: float):
    """
    Returns the vector package for offline caching:
    - Green PFZ polygon GeoJSON features (within 150 km)
    - Red IMBL LineString with danger threshold
    Used by the frontend to pre-cache geofence data for 0G sailing.
    """
    pfz_for_client = []
    for zone in PFZ_ZONES:
        dist = haversine_distance(lat, lon, zone["lat"], zone["lon"])
        if dist <= 150:
            pfz_for_client.append({
                "id":          zone["id"],
                "name":        zone["name"],
                "species":     zone["species"],
                "wave_height": zone["wave_height"],
                "chlorophyll": zone["chlorophyll"],
                "status":      zone["status"],
                "center":      [zone["lat"], zone["lon"]],
                "polygon_geojson": {
                    "type": "Feature",
                    "properties": {"id": zone["id"], "name": zone["name"]},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [zone["polygon"]],
                    },
                },
            })

    imbl_geojson = {
        "type": "Feature",
        "properties": {
            "name":                "India-Sri Lanka IMBL",
            "danger_threshold_km": 1.852,
            "warning_threshold_km": 7.408,
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [pt["lon"], pt["lat"]] for pt in IMBL_BORDER_POINTS
            ],
        },
    }

    return {
        "origin":          {"lat": lat, "lon": lon},
        "pfz_zones":       pfz_for_client,
        "imbl_boundary":   imbl_geojson,
        "cached_at":       __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }


@app.post("/api/captain/register")
def register_captain(profile: CaptainProfile):
    """Save captain profile in session memory."""
    CAPTAIN_SESSIONS[profile.phone] = profile.dict()
    rec = find_nearest_optimal_pfz(profile.lat, profile.lon)
    return {"status": "REGISTERED", "profile": profile, "recommendation": rec}


@app.post("/api/guardian/register-trip")
def register_friend_trip(trip: FriendTripRequest, bg: BackgroundTasks):
    """Proxy-register a keypad-phone friend's voyage and start SMS simulation."""
    harbor = HARBORS.get(trip.departure_harbor, HARBORS["Nagapattinam"])
    target = next((z for z in PFZ_ZONES if z["id"] == trip.target_zone_id), PFZ_ZONES[0])

    dist_km = haversine_distance(harbor["lat"], harbor["lon"], target["lat"], target["lon"])
    bearing = calculate_bearing(harbor["lat"], harbor["lon"], target["lat"], target["lon"])

    ACTIVE_KEYPAD_TRIPS[trip.friend_phone] = {
        "trip": {**trip.dict(), "wave_height": target.get("wave_height", 1.0)},
        "start": harbor,
        "target": target,
        "bearing": round(bearing, 1),
        "dist_km": round(dist_km, 2),
        "status": "UNDERWAY",
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }

    bg.add_task(
        run_keypad_simulation,
        trip.friend_phone, trip.language,
        harbor["lat"], harbor["lon"],
        target["lat"], target["lon"],
        bearing, dist_km,
    )

    return {
        "status": "ACTIVE",
        "message": f"Protection activated for {trip.friend_name}",
        "bearing_deg": round(bearing, 1),
        "distance_km": round(dist_km, 2),
        "distance_nm": round(dist_km * 0.539957, 2),
    }


@app.get("/api/guardian/active-trips")
def get_active_trips():
    return list(ACTIVE_KEYPAD_TRIPS.values())


@app.get("/api/guardian/logs")
def get_sms_logs():
    return get_logs()


class DirectSMSRequest(BaseModel):
    phone: str
    message: str
    is_flash: bool = False


@app.post("/api/guardian/send-sms")
@app.post("/api/sms/send-otp")
def dispatch_direct_sms(req: DirectSMSRequest):
    """
    Direct endpoint for real-time Twilio SMS dispatch.
    """
    res = send_sms(req.phone, req.message, req.is_flash)
    return {"status": "SUCCESS", "log": res}


@app.post("/api/sms/webhook")
def sms_webhook(payload: SMSWebhookPayload):
    """
    2-way inbound SMS handler:
      '1' → current heading & distance to target
      '2' → safe return bearing to nearest port
      'SOS' → distress alarm, log GPS (dead-reckoned)
    """
    phone = payload.From.strip()
    cmd = payload.Body.strip().upper()
    trip_data = ACTIVE_KEYPAD_TRIPS.get(phone)
    lang = trip_data["trip"]["language"] if trip_data else "ta"

    if cmd == "1":
        if trip_data:
            b = trip_data["bearing"]
            d = trip_data["dist_km"]
            reply = get_message(lang, "LAUNCH", bearing=int(b), dist=int(d), wave=1.0)
        else:
            reply = get_message("ta", "LAUNCH", bearing=90, dist=20, wave=1.0)

    elif cmd == "2":
        if trip_data:
            start = trip_data["start"]
            ret = safe_return_bearing(start["lat"], start["lon"])
            reply = get_message(lang, "SAFE_RETURN",
                                bearing=int(ret["bearing_deg"]),
                                dist=int(ret["distance_km"]))
        else:
            reply = get_message("ta", "SAFE_RETURN", bearing=270, dist=15)

    elif cmd == "SOS":
        # Dead-reckon current position from trip start
        est_lat, est_lon = (trip_data["start"]["lat"], trip_data["start"]["lon"]) if trip_data else (10.5, 80.0)
        SOS_EVENTS.append({
            "phone": phone,
            "estimated_lat": est_lat,
            "estimated_lon": est_lon,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        reply = get_message(lang, "SOS_ACK", lat=round(est_lat, 4), lon=round(est_lon, 4))
        send_sms(phone, reply)
        return {"reply": reply, "sos_logged": True}

    else:
        reply = "Reply 1:Heading | 2:Return Port | SOS:Rescue"

    send_sms(phone, reply)
    return {"reply": reply}


@app.get("/api/sos/events")
def get_sos_events():
    return SOS_EVENTS


@app.get("/api/locales")
def get_supported_languages():
    return supported_languages()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
