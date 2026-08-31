"""
Mock data: Tamil Nadu / Palk Strait coastline
Includes PFZ polygons, harbor coordinates, and IMBL border vectors.
"""

HARBORS = {
    "Nagapattinam": {"lat": 10.767, "lon": 79.842, "name": "Nagapattinam"},
    "Rameswaram":   {"lat": 9.288,  "lon": 79.313, "name": "Rameswaram"},
    "Chennai":      {"lat": 13.082, "lon": 80.270,  "name": "Chennai"},
    "Kochi":        {"lat": 9.931,  "lon": 76.267,  "name": "Kochi"},
    "Visakhapatnam":{"lat": 17.686, "lon": 83.218,  "name": "Visakhapatnam"},
    "Tuticorin":    {"lat": 8.800,  "lon": 78.135,  "name": "Tuticorin"},
    "Karaikal":     {"lat": 10.924, "lon": 79.836,  "name": "Karaikal"},
}

PFZ_ZONES = [
    {
        "id": "PFZ-BAY-01",
        "name": "Palk Bay Deep Shoal",
        "lat": 10.550,
        "lon": 80.120,
        "species": "Tuna & Mackerel",
        "chlorophyll": "4.2 mg/m³",
        "sst": "28.4°C",
        "wave_height": 0.9,
        "wind_kmh": 18,
        "status": "OPTIMAL",
        "polygon": [
            [80.08, 10.51], [80.16, 10.51],
            [80.16, 10.59], [80.08, 10.59], [80.08, 10.51]
        ]
    },
    {
        "id": "PFZ-BAY-02",
        "name": "Coromandel Ridge",
        "lat": 11.100,
        "lon": 80.350,
        "species": "Sardine & Seer Fish",
        "chlorophyll": "3.8 mg/m³",
        "sst": "27.9°C",
        "wave_height": 1.2,
        "wind_kmh": 22,
        "status": "OPTIMAL",
        "polygon": [
            [80.31, 11.06], [80.39, 11.06],
            [80.39, 11.14], [80.31, 11.14], [80.31, 11.06]
        ]
    },
    {
        "id": "PFZ-BAY-03",
        "name": "Gulf of Mannar Bloom",
        "lat": 9.100,
        "lon": 79.050,
        "species": "Prawn & Pomfret",
        "chlorophyll": "5.1 mg/m³",
        "sst": "29.2°C",
        "wave_height": 0.7,
        "wind_kmh": 14,
        "status": "OPTIMAL",
        "polygon": [
            [79.01, 9.06], [79.09, 9.06],
            [79.09, 9.14], [79.01, 9.14], [79.01, 9.06]
        ]
    },
    {
        "id": "PFZ-ROUGH-04",
        "name": "Offshore Deep Trench",
        "lat": 10.200,
        "lon": 80.400,
        "species": "Barracuda",
        "chlorophyll": "2.1 mg/m³",
        "sst": "26.5°C",
        "wave_height": 3.8,
        "wind_kmh": 47,
        "status": "HAZARDOUS",
        "polygon": [
            [80.36, 10.16], [80.44, 10.16],
            [80.44, 10.24], [80.36, 10.24], [80.36, 10.16]
        ]
    },
    {
        "id": "PFZ-KER-05",
        "name": "Lakshadweep Upwelling",
        "lat": 10.800,
        "lon": 75.200,
        "species": "Skipjack Tuna",
        "chlorophyll": "4.9 mg/m³",
        "sst": "28.1°C",
        "wave_height": 1.5,
        "wind_kmh": 28,
        "status": "OPTIMAL",
        "polygon": [
            [75.16, 10.76], [75.24, 10.76],
            [75.24, 10.84], [75.16, 10.84], [75.16, 10.76]
        ]
    },
]

# IMBL LineString: India–Sri Lanka Palk Strait corridor (approximate)
IMBL_BORDER_POINTS = [
    {"lat": 10.800, "lon": 80.250},
    {"lat": 10.600, "lon": 80.200},
    {"lat": 10.400, "lon": 80.150},
    {"lat": 10.100, "lon": 80.050},
    {"lat": 9.800,  "lon": 79.950},
    {"lat": 9.500,  "lon": 79.800},
    {"lat": 9.200,  "lon": 79.650},
]

WEATHER_HAZARDS = [
    {
        "type": "CYCLONE",
        "name": "BOB-01",
        "lat": 12.5,
        "lon": 82.0,
        "intensity": "Severe",
        "radius_km": 200,
        "active": False
    }
]
