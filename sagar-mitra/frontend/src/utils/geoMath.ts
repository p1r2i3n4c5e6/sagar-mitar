/**
 * Client-side geodesic math (pure TypeScript, no external dependency).
 * Turf.js-equivalent calculations for offline use.
 */

const R = 6371.0; // Earth radius km
export const KM_TO_NM = 0.539957;
export const IMBL_ALERT_NM = 2.0; // Trigger alert when < 2 NM from border

export const IMBL_BORDER: Array<[number, number]> = [
  [80.250, 10.800],
  [80.200, 10.600],
  [80.150, 10.400],
  [80.050, 10.100],
  [79.950, 9.800],
  [79.800, 9.500],
  [79.650, 9.200],
];

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

/** Haversine great-circle distance in km */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Geodesic bearing (degrees, 0–360) from point A to point B */
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const dL = toRad(lon2 - lon1);
  const y = Math.sin(dL) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dL);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Convert km to nautical miles */
export function kmToNm(km: number): number {
  return km * KM_TO_NM;
}

/** Minimum distance (km) from a point to any IMBL vertex */
export function minDistToIMBL(lat: number, lon: number): number {
  return Math.min(
    ...IMBL_BORDER.map(([bLon, bLat]) => haversineKm(lat, lon, bLat, bLon))
  );
}

/** Returns true if vessel is within IMBL_ALERT_NM of the border */
export function isIMBLAlert(lat: number, lon: number): boolean {
  return kmToNm(minDistToIMBL(lat, lon)) < IMBL_ALERT_NM;
}

/** Dead-reckoning: project position after `hours` at `speedKmh` on `bearingDeg` */
export function deadReckoning(
  lat: number, lon: number,
  speedKmh: number, hours: number, bearing: number
): { lat: number; lon: number } {
  const distRad = (speedKmh * hours) / R;
  const latR = toRad(lat);
  const lonR = toRad(lon);
  const bR = toRad(bearing);

  const newLatR = Math.asin(
    Math.sin(latR) * Math.cos(distRad) +
    Math.cos(latR) * Math.sin(distRad) * Math.cos(bR)
  );
  const newLonR = lonR + Math.atan2(
    Math.sin(bR) * Math.sin(distRad) * Math.cos(latR),
    Math.cos(distRad) - Math.sin(latR) * Math.sin(newLatR)
  );
  return { lat: toDeg(newLatR), lon: toDeg(newLonR) };
}

/** Cardinal direction label for a bearing */
export function bearingLabel(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
