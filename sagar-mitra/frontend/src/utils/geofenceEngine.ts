/**
 * Offline Geofence Engine (Turf.js)
 * Runs entirely client-side with zero network dependency.
 * Evaluates vessel GPS against PFZ polygons and IMBL border lines.
 */
import * as turf from '@turf/turf';
import type { Feature, Polygon, LineString, GeoJsonProperties } from 'geojson';

export type GeofenceStatus = 'SAFE' | 'IN_FISHING_ZONE' | 'BORDER_WARNING' | 'BORDER_BREACH';

export interface GeofenceAlert {
  status: GeofenceStatus;
  message: string;
  distanceToBorderKm: number;
  distanceToBorderNm: number;
  insidePFZ: boolean;
  activePFZName?: string;
}

export interface PFZZoneGeo {
  id: string;
  name: string;
  species: string;
  center: [number, number];        // [lat, lon]
  color: string;
  wave_height: number;
  chlorophyll: string;
  sst_c: number;
  is_dangerous?: boolean;
  polygon: Feature<Polygon, GeoJsonProperties>;
}

// ── Tamil Nadu / Palk Strait / Arabian Sea / Bay of Bengal PFZ zones ──────────────
export const PFZ_ZONES: PFZZoneGeo[] = [
  {
    id: 'PFZ-NAG-01',
    name: 'Nagapattinam Deep Trench',
    species: 'Yellowfin Tuna, Seer Fish (King Mackerel), Sardine',
    center: [10.650, 80.050],
    color: '#22c55e',
    wave_height: 0.9,
    chlorophyll: '4.8 mg/m³',
    sst_c: 28.5,
    polygon: turf.polygon([[
      [80.000, 10.600], [80.100, 10.600],
      [80.100, 10.700], [80.000, 10.700],
      [80.000, 10.600],
    ]]),
  },
  {
    id: 'PFZ-PALK-02',
    name: 'Palk Bay Deep Shoal',
    species: 'Yellowfin Tuna & Seer Fish',
    center: [10.550, 80.120],
    color: '#10b981',
    wave_height: 1.1,
    chlorophyll: '4.2 mg/m³',
    sst_c: 28.8,
    polygon: turf.polygon([[
      [80.070, 10.490], [80.170, 10.490],
      [80.170, 10.610], [80.070, 10.610],
      [80.070, 10.490],
    ]]),
  },
  {
    id: 'PFZ-CORO-03',
    name: 'Coromandel Coastal Ridge',
    species: 'Sardine, Indian Mackerel, Anchovy',
    center: [10.950, 80.250],
    color: '#84cc16',
    wave_height: 1.2,
    chlorophyll: '3.4 mg/m³',
    sst_c: 29.1,
    polygon: turf.polygon([[
      [80.200, 10.900], [80.300, 10.900],
      [80.300, 11.000], [80.200, 11.000],
      [80.200, 10.900],
    ]]),
  },
  {
    id: 'PFZ-MAN-04',
    name: 'Gulf of Mannar Reef Edge',
    species: 'Red Snapper, Grouper, Emperor Fish',
    center: [9.150, 79.450],
    color: '#06b6d4',
    wave_height: 0.8,
    chlorophyll: '4.5 mg/m³',
    sst_c: 28.2,
    polygon: turf.polygon([[
      [79.400, 9.100], [79.500, 9.100],
      [79.500, 9.200], [79.400, 9.200],
      [79.400, 9.100],
    ]]),
  },
  {
    id: 'PFZ-RAM-05',
    name: 'Rameswaram South Bank',
    species: 'Cobia, Barracuda, Pomfret',
    center: [9.200, 79.350],
    color: '#3b82f6',
    wave_height: 1.0,
    chlorophyll: '3.8 mg/m³',
    sst_c: 28.6,
    polygon: turf.polygon([[
      [79.300, 9.150], [79.400, 9.150],
      [79.400, 9.250], [79.300, 9.250],
      [79.300, 9.150],
    ]]),
  },
  {
    id: 'PFZ-CHE-06',
    name: 'Chennai Offshore Trench',
    species: 'Skipjack Tuna, Marlin, Sailfish',
    center: [13.150, 80.450],
    color: '#6366f1',
    wave_height: 1.4,
    chlorophyll: '3.9 mg/m³',
    sst_c: 29.0,
    polygon: turf.polygon([[
      [80.400, 13.100], [80.500, 13.100],
      [80.500, 13.200], [80.400, 13.200],
      [80.400, 13.100],
    ]]),
  },
  {
    id: 'PFZ-TUT-07',
    name: 'Tuticorin Deep Pearl Shoal',
    species: 'Cuttlefish, Squid, Tiger Prawn',
    center: [8.750, 78.350],
    color: '#a855f7',
    wave_height: 0.9,
    chlorophyll: '4.1 mg/m³',
    sst_c: 28.4,
    polygon: turf.polygon([[
      [78.300, 8.700], [78.400, 8.700],
      [78.400, 8.800], [78.300, 8.800],
      [78.300, 8.700],
    ]]),
  },
  {
    id: 'PFZ-WAD-08',
    name: 'Wadge Bank Shelf (Kanyakumari)',
    species: 'Carangids, Perches, Threadfin Bream',
    center: [7.950, 77.650],
    color: '#ec4899',
    wave_height: 1.1,
    chlorophyll: '5.2 mg/m³',
    sst_c: 27.9,
    polygon: turf.polygon([[
      [77.600, 7.900], [77.700, 7.900],
      [77.700, 8.000], [77.600, 8.000],
      [77.600, 7.900],
    ]]),
  },
  {
    id: 'PFZ-DANG-09',
    name: 'Offshore Border High Wave Zone',
    species: 'Sharks & Rays (Dangerous Border Currents)',
    center: [10.300, 80.450],
    color: '#ef4444', // Red dangerous color
    wave_height: 2.8, // High wave
    chlorophyll: '1.2 mg/m³', // Low chlorophyll deadzone
    sst_c: 29.8,
    is_dangerous: true,
    polygon: turf.polygon([[
      [80.400, 10.250], [80.500, 10.250],
      [80.500, 10.350], [80.400, 10.350],
      [80.400, 10.250],
    ]]),
  },
];

// ── International Maritime Boundary Line (India – Sri Lanka) ───────────────
export const IMBL_LINE: Feature<LineString, GeoJsonProperties> = turf.lineString([
  [80.280, 10.850],
  [80.220, 10.600],
  [80.150, 10.350],
  [80.080, 10.100],
  [79.950,  9.800],
  [79.800,  9.500],
  [79.650,  9.200],
  [79.500,  8.950],
]);

// ── Geofence evaluation ────────────────────────────────────────────────────
const KM_TO_NM = 0.539957;
const BREACH_KM  = 1.852;   // 1 NM
const WARNING_KM = 7.408;   // 4 NM

export function evaluateGeofences(
  boatLatLon: [number, number],
  pfzZones: PFZZoneGeo[],
  borderLine: Feature<LineString, GeoJsonProperties> = IMBL_LINE
): GeofenceAlert {
  const boatPoint = turf.point([boatLatLon[1], boatLatLon[0]]);
  const distKm = turf.pointToLineDistance(boatPoint, borderLine, { units: 'kilometers' });
  const distNm = distKm * KM_TO_NM;

  if (distKm <= BREACH_KM) {
    return {
      status: 'BORDER_BREACH',
      message: `DANGER! Maritime border ${distNm.toFixed(1)} NM away! Turn 180° immediately!`,
      distanceToBorderKm: distKm,
      distanceToBorderNm: distNm,
      insidePFZ: false,
    };
  }

  if (distKm <= WARNING_KM) {
    return {
      status: 'BORDER_WARNING',
      message: `WARNING: Approaching border — ${distNm.toFixed(1)} NM. Reduce speed & caution!`,
      distanceToBorderKm: distKm,
      distanceToBorderNm: distNm,
      insidePFZ: false,
    };
  }

  for (const zone of pfzZones) {
    if (turf.booleanPointInPolygon(boatPoint, zone.polygon)) {
      return {
        status: 'IN_FISHING_ZONE',
        message: `You have entered ${zone.name}! Cast your nets. ${zone.species} detected here.`,
        distanceToBorderKm: distKm,
        distanceToBorderNm: distNm,
        insidePFZ: true,
        activePFZName: zone.name,
      };
    }
  }

  return {
    status: 'SAFE',
    message: 'Navigating in open safe waters.',
    distanceToBorderKm: distKm,
    distanceToBorderNm: distNm,
    insidePFZ: false,
  };
}

export function triggerGeofenceAudio(alert: GeofenceAlert, lang = 'en'): void {
  const isSiren = alert.status === 'BORDER_BREACH';
  const isWarn  = alert.status === 'BORDER_WARNING';

  if (isSiren || isWarn) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isSiren ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(isSiren ? 880 : 660, ctx.currentTime);
      if (isSiren) {
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.8);
      }
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isSiren ? 1.2 : 0.6));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + (isSiren ? 1.2 : 0.6));
    } catch { /* AudioContext blocked until user gesture */ }
  }

  if ('speechSynthesis' in window && alert.message) {
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(alert.message);
    utt.lang   = lang === 'ta' ? 'ta-IN' : 'en-IN';
    utt.rate   = 0.92;
    utt.volume = 1;
    window.speechSynthesis.speak(utt);
  }
}
