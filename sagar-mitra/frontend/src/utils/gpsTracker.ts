/**
 * GPS tracker using the HTML5 Geolocation watchPosition API.
 * Works completely offline — uses satellite GNSS, no network needed.
 */
import { GpsCoords } from '../types';

type GpsCallback = (coords: GpsCoords) => void;
type GpsErrorCallback = (error: GeolocationPositionError) => void;

let watchId: number | null = null;

export function startGpsWatch(onUpdate: GpsCallback, onError?: GpsErrorCallback): void {
  if (!navigator.geolocation) {
    console.warn('[GPS] Geolocation not supported');
    return;
  }

  if (watchId !== null) stopGpsWatch();

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat:       pos.coords.latitude,
        lon:       pos.coords.longitude,
        accuracy:  pos.coords.accuracy,
        heading:   pos.coords.heading,
        speed:     pos.coords.speed,
        timestamp: pos.timestamp,
      });
    },
    (err) => {
      console.warn('[GPS] Error:', err.message);
      onError?.(err);
    },
    {
      enableHighAccuracy: true,  // Force GNSS satellite fix
      maximumAge: 5000,          // Accept 5-second-old position
      timeout: 15000,            // Wait up to 15s for first fix
    }
  );
}

export function stopGpsWatch(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/** One-shot position request */
export function getPositionOnce(): Promise<GpsCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat:       pos.coords.latitude,
        lon:       pos.coords.longitude,
        accuracy:  pos.coords.accuracy,
        heading:   pos.coords.heading,
        speed:     pos.coords.speed,
        timestamp: pos.timestamp,
      }),
      reject,
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}
