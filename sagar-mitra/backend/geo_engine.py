"""
Geodesic math engine: Haversine distance, bearing, dead-reckoning,
IMBL minimum distance — all pure Python, zero dependencies.
"""
import math
from mock_data import PFZ_ZONES, IMBL_BORDER_POINTS, HARBORS

EARTH_RADIUS_KM = 6371.0
KM_TO_NM = 0.539957
VESSEL_SPEED_KMH = 14.0  # ~7.5 knots, typical small trawler


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in kilometres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return 2 * EARTH_RADIUS_KM * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return initial compass bearing in degrees [0, 360)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    y = math.sin(dlambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def find_nearest_optimal_pfz(lat: float, lon: float) -> dict:
    """Return the closest OPTIMAL PFZ from a given harbour coordinate."""
    best_zone = None
    min_dist = float("inf")

    for zone in PFZ_ZONES:
        if zone["status"] != "OPTIMAL":
            continue
        dist = haversine_distance(lat, lon, zone["lat"], zone["lon"])
        if dist < min_dist:
            min_dist = dist
            best_zone = zone

    if best_zone is None:
        best_zone = PFZ_ZONES[0]  # fallback

    bearing = calculate_bearing(lat, lon, best_zone["lat"], best_zone["lon"])
    return {
        "zone": best_zone,
        "distance_km": round(min_dist, 2),
        "distance_nm": round(min_dist * KM_TO_NM, 2),
        "bearing_deg": round(bearing, 1),
    }


def dead_reckoning_position(
    lat: float, lon: float,
    speed_kmh: float, hours: float, bearing_deg: float
) -> tuple[float, float]:
    """
    Predict vessel position after `hours` of travel at given speed/bearing.
    Uses spherical Earth dead-reckoning formula.
    """
    dist_km = speed_kmh * hours
    dist_rad = dist_km / EARTH_RADIUS_KM
    lat_r = math.radians(lat)
    lon_r = math.radians(lon)
    b_r = math.radians(bearing_deg)

    new_lat_r = math.asin(
        math.sin(lat_r) * math.cos(dist_rad)
        + math.cos(lat_r) * math.sin(dist_rad) * math.cos(b_r)
    )
    new_lon_r = lon_r + math.atan2(
        math.sin(b_r) * math.sin(dist_rad) * math.cos(lat_r),
        math.cos(dist_rad) - math.sin(lat_r) * math.sin(new_lat_r),
    )
    return math.degrees(new_lat_r), math.degrees(new_lon_r)


def min_distance_to_imbl(lat: float, lon: float) -> float:
    """Minimum haversine distance (km) from a point to any IMBL vertex."""
    return min(
        haversine_distance(lat, lon, pt["lat"], pt["lon"])
        for pt in IMBL_BORDER_POINTS
    )


def nearest_harbor(lat: float, lon: float) -> dict:
    """Return the closest harbor dict (name, lat, lon)."""
    best = None
    min_dist = float("inf")
    for h_name, h in HARBORS.items():
        d = haversine_distance(lat, lon, h["lat"], h["lon"])
        if d < min_dist:
            min_dist = d
            best = {**h, "name": h_name, "distance_km": round(d, 2)}
    return best


def safe_return_bearing(vessel_lat: float, vessel_lon: float) -> dict:
    """Bearing and distance back to the nearest safe harbor."""
    h = nearest_harbor(vessel_lat, vessel_lon)
    b = calculate_bearing(vessel_lat, vessel_lon, h["lat"], h["lon"])
    return {
        "harbor": h["name"],
        "bearing_deg": round(b, 1),
        "distance_km": round(h["distance_km"], 2),
        "distance_nm": round(h["distance_km"] * KM_TO_NM, 2),
    }
