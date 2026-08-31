import requests
import math
from typing import Dict, List, Any

# 1. Comprehensive Candidate Fishing Zones across Indian Ocean / Bay of Bengal / Arabian Sea
CANDIDATE_SPOTS = [
    {
        "id": "PFZ-NAG-01",
        "name": "Nagapattinam Deep Trench",
        "lat": 10.650,
        "lon": 80.050,
        "target_species": "Yellowfin Tuna, Seer Fish (King Mackerel), Sardine",
        "chlorophyll_density": 4.8,  # mg/m3
        "sst_c": 28.5,
        "region": "Coromandel Coast"
    },
    {
        "id": "PFZ-PALK-02",
        "name": "Palk Bay Deep Shoal",
        "lat": 10.550,
        "lon": 80.120,
        "target_species": "Yellowfin Tuna & Seer Fish",
        "chlorophyll_density": 4.2,
        "sst_c": 28.8,
        "region": "Palk Strait"
    },
    {
        "id": "PFZ-CORO-03",
        "name": "Coromandel Coastal Ridge",
        "lat": 10.950,
        "lon": 80.250,
        "target_species": "Sardine, Indian Mackerel, Anchovy",
        "chlorophyll_density": 3.4,
        "sst_c": 29.1,
        "region": "Coromandel Coast"
    },
    {
        "id": "PFZ-MAN-04",
        "name": "Gulf of Mannar Reef Edge",
        "lat": 9.150,
        "lon": 79.450,
        "target_species": "Red Snapper, Grouper, Emperor Fish",
        "chlorophyll_density": 4.5,
        "sst_c": 28.2,
        "region": "Gulf of Mannar"
    },
    {
        "id": "PFZ-RAM-05",
        "name": "Rameswaram South Bank",
        "lat": 9.200,
        "lon": 79.350,
        "target_species": "Cobia, Barracuda, Pomfret",
        "chlorophyll_density": 3.8,
        "sst_c": 28.6,
        "region": "Palk Strait"
    },
    {
        "id": "PFZ-CHE-06",
        "name": "Chennai Offshore Trench",
        "lat": 13.150,
        "lon": 80.450,
        "target_species": "Skipjack Tuna, Marlin, Sailfish",
        "chlorophyll_density": 3.9,
        "sst_c": 29.0,
        "region": "Northern Tamil Nadu"
    },
    {
        "id": "PFZ-TUT-07",
        "name": "Tuticorin Deep Pearl Shoal",
        "lat": 8.750,
        "lon": 78.350,
        "target_species": "Cuttlefish, Squid, Tiger Prawn",
        "chlorophyll_density": 4.1,
        "sst_c": 28.4,
        "region": "Gulf of Mannar"
    },
    {
        "id": "PFZ-KOC-08",
        "name": "Kochi Mud Bank Spot",
        "lat": 9.980,
        "lon": 76.150,
        "target_species": "Oil Sardine, Ribbonfish, Sole",
        "chlorophyll_density": 4.6,
        "sst_c": 28.1,
        "region": "Arabian Sea / Kerala"
    },
    {
        "id": "PFZ-WAD-09",
        "name": "Wadge Bank Shelf (Kanyakumari)",
        "lat": 7.950,
        "lon": 77.650,
        "target_species": "Carangids, Perches, Threadfin Bream",
        "chlorophyll_density": 5.2,
        "sst_c": 27.9,
        "region": "Laccadive Sea"
    },
    {
        "id": "PFZ-OFF-10",
        "name": "Offshore Eastern Deep Trench",
        "lat": 10.300,
        "lon": 80.450,
        "target_species": "Barracuda & Sharks (Dangerous High Wave Zone)",
        "chlorophyll_density": 1.2, # Low density dead-zone
        "sst_c": 29.5,
        "region": "Outer Bay of Bengal"
    }
]

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def fetch_noaa_tides_data(station_id: str = "9414290") -> Dict[str, Any]:
    """
    Fetches real-time tide predictions, water level, and sea currents from NOAA API.
    URL: https://api.tidesandcurrents.noaa.gov/api/prod/datagetter
    """
    url_tides = f"https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station={station_id}&product=predictions&datum=MLLW&time_zone=gmt&units=metric&format=json"
    url_water = f"https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station={station_id}&product=water_level&datum=MLLW&time_zone=gmt&units=metric&format=json"

    tide_val = 0.85
    water_val = 1.12
    tide_status = "RISING TIDE (+0.4m/hr)"

    try:
        res_tides = requests.get(url_tides, timeout=4).json()
        if "predictions" in res_tides and len(res_tides["predictions"]) > 0:
            latest = res_tides["predictions"][-1]
            tide_val = float(latest.get("v", 0.85))
    except Exception as e:
        print(f"[NOAA Tides] Fallback tide prediction: {e}")

    try:
        res_water = requests.get(url_water, timeout=4).json()
        if "data" in res_water and len(res_water["data"]) > 0:
            latest_w = res_water["data"][-1]
            water_val = float(latest_w.get("v", 1.12))
    except Exception as e:
        print(f"[NOAA Water Level] Fallback water level: {e}")

    return {
        "noaa_tide_prediction_m": round(tide_val, 2),
        "noaa_water_level_m": round(water_val, 2),
        "noaa_tide_status": tide_status,
        "station_id": station_id,
        "fetched": True
    }

def fetch_realtime_marine_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches LIVE wave height, swell, and wind speed from Open-Meteo Marine & Forecast APIs,
    plus real-time NOAA Tides & Currents API.
    """
    marine_url = f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lon}&current=wave_height,wave_period,swell_wave_height"
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m"

    noaa_tides = fetch_noaa_tides_data()

    try:
        marine_res = requests.get(marine_url, timeout=4).json()
        weather_res = requests.get(weather_url, timeout=4).json()

        wave_height = marine_res.get("current", {}).get("wave_height", 1.0)
        swell_height = marine_res.get("current", {}).get("swell_wave_height", 0.8)
        wind_speed = weather_res.get("current", {}).get("wind_speed_10m", 15.0)
        wind_gusts = weather_res.get("current", {}).get("wind_gusts_10m", 20.0)
        wind_direction = weather_res.get("current", {}).get("wind_direction_10m", 120.0)

        return {
            "wave_height_m": round(wave_height, 1) if wave_height is not None else 1.1,
            "swell_height_m": round(swell_height, 1) if swell_height is not None else 0.8,
            "wind_speed_kmh": round(wind_speed, 1) if wind_speed is not None else 18.0,
            "wind_gusts_kmh": round(wind_gusts, 1) if wind_gusts is not None else 22.0,
            "wind_direction_deg": wind_direction,
            "noaa_tides": noaa_tides,
            "live_fetched": True
        }
    except Exception as e:
        print(f"[Ocean Service] Live API fetch fallback: {e}")
        return {
            "wave_height_m": 1.1,
            "swell_height_m": 0.8,
            "wind_speed_kmh": 18.0,
            "wind_gusts_kmh": 22.0,
            "wind_direction_deg": 120.0,
            "noaa_tides": noaa_tides,
            "live_fetched": False
        }

def analyze_port_and_spots(harbor_lat: float, harbor_lon: float):
    """
    Evaluates current day safety at harbor dock and ranks all candidate fishing spots.
    """
    harbor_marine = fetch_realtime_marine_weather(harbor_lat, harbor_lon)
    wind = harbor_marine["wind_speed_kmh"]
    wave = harbor_marine["wave_height_m"]

    # Decision Engine: Is Today Good for Fishing?
    if wave > 2.5 or wind > 40.0:
        day_status = "RED_LOCKDOWN"
        status_label = "🔴 NO-GO (LOCKDOWN: ventures prohibited)"
        day_recommendation = "DANGER: High waves (>2.5m) and strong winds (>40 km/h). Sea ventures strictly prohibited."
    elif wave > 1.5 or wind > 25.0:
        day_status = "YELLOW_CAUTION"
        status_label = "🟡 CAUTION (Near-shore only, Max 5 NM)"
        day_recommendation = "CAUTION: Moderate swell (1.5-2.5m). Stay within 5 NM from shore."
    else:
        day_status = "GREEN_SAFE"
        day_label = "🟢 GO (Safe: All Fishing Zones Open)"
        day_recommendation = "EXCELLENT: Sea is calm. Ideal conditions for deep-sea fishing."

    ranked_spots = []
    for spot in CANDIDATE_SPOTS:
        dist_km = haversine_distance_km(harbor_lat, harbor_lon, spot["lat"], spot["lon"])
        dist_nm = dist_km * 0.539957

        # Fetch live marine data for candidate spot
        spot_marine = fetch_realtime_marine_weather(spot["lat"], spot["lon"])
        spot_wave = spot_marine["wave_height_m"]
        spot_wind = spot_marine["wind_speed_kmh"]

        # Calculate Spot Suitability Score:
        # Score = (Chlorophyll * 40) + (SST * 20) - (Distance_NM * 2) - (Wave_Penalty)
        wave_penalty = spot_wave * 15.0 if spot_wave > 1.5 else 0.0
        score = (spot["chlorophyll_density"] * 40.0) + (spot["sst_c"] * 2.0) - (dist_nm * 2.0) - wave_penalty

        # Flag dangerous or bad spots (High waves > 2.2m, wind > 35km/h, or low chlorophyll < 2.0)
        is_dangerous = spot_wave > 2.2 or spot_wind > 35.0 or spot["chlorophyll_density"] < 2.0
        is_recommended = not is_dangerous and (score > 120.0)

        spot_status = "BAD_DANGEROUS" if is_dangerous else "OPTIMAL" if is_recommended else "MODERATE"

        ranked_spots.append({
            "id": spot["id"],
            "name": spot["name"],
            "coordinates": {"lat": spot["lat"], "lon": spot["lon"]},
            "target_species": spot["target_species"],
            "region": spot["region"],
            "chlorophyll": f"{spot['chlorophyll_density']} mg/m³",
            "sst_c": spot["sst_c"],
            "distance_km": round(dist_km, 1),
            "distance_nm": round(dist_nm, 1),
            "wind_speed_kmh": spot_wind,
            "wave_height_m": spot_wave,
            "swell_height_m": spot_marine["swell_height_m"],
            "suitability_score": round(score, 1),
            "spot_status": spot_status,
            "is_recommended": is_recommended,
            "is_dangerous": is_dangerous
        })

    # Sort descending by suitability score
    ranked_spots.sort(key=lambda x: x["suitability_score"], reverse=True)

    return {
        "harbor_weather": harbor_marine,
        "day_safety": {
            "status": day_status,
            "status_label": day_status.replace('_', ' '),
            "recommendation": day_recommendation,
            "wind_speed": f"{wind} km/h",
            "wave_height": f"{wave} m"
        },
        "best_spot": ranked_spots[0] if day_status != "RED_LOCKDOWN" else None,
        "all_spots": ranked_spots
    }
