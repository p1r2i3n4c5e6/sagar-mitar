/**
 * Offline Map Download Manager
 * Caches Land-to-Sea Corridor Bounding Box Map Tiles and GeoJSON Vector Layers to
 * Cache Storage API for true 0G offline maritime use.
 */
import type { PFZZoneGeo } from './geofenceEngine';
import { IMBL_LINE } from './geofenceEngine';

const TILE_CACHE = 'sagar-tiles-v1';
const GEO_CACHE  = 'sagar-geodata-v1';

// OSM tile URL template
const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

// Convert lat/lon/zoom to tile XY (Slippy Map formula)
function latLonToTile(lat: number, lon: number, zoom: number): [number, number] {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  );
  return [x, y];
}

// Get all tile XYs in a bounding box at a given zoom
function getBBoxTiles(
  minLat: number, maxLat: number,
  minLon: number, maxLon: number,
  zoom: number
): Array<[number, number, number]> {
  const [x0, y0] = latLonToTile(maxLat, minLon, zoom); // top-left
  const [x1, y1] = latLonToTile(minLat, maxLon, zoom); // bottom-right
  const tiles: Array<[number, number, number]> = [];
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      tiles.push([zoom, x, y]);
    }
  }
  return tiles;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  pct: number;
  done: boolean;
}

/**
 * Download and cache all tiles for the Land-to-Sea Corridor
 * (From Land Port origin -> Fishing Spot -> Extreme Country IMBL Border)
 * at zoom levels 8–12 + GeoJSON vectors.
 */
export async function downloadOfflinePack(
  zone: PFZZoneGeo,
  landPortCoords: [number, number] = [10.767, 79.842],
  onProgress: (p: DownloadProgress) => void
): Promise<void> {
  const [landLat, landLon] = landPortCoords;
  const [spotLat, spotLon] = zone.center;

  // Include IMBL boundary points to cover extreme country sea border
  const imblCoords = IMBL_LINE.geometry.coordinates as [number, number][];
  const imblLats   = imblCoords.map(c => c[1]);
  const imblLons   = imblCoords.map(c => c[0]);

  // Compute Land-to-Sea Corridor bounding box with padding
  const padding = 0.2; // ~22 km buffer
  const minLat = Math.min(landLat, spotLat, ...imblLats) - padding;
  const maxLat = Math.max(landLat, spotLat, ...imblLats) + padding;
  const minLon = Math.min(landLon, spotLon, ...imblLons) - padding;
  const maxLon = Math.max(landLon, spotLon, ...imblLons) + padding;

  // Collect tiles for zoom levels 8 to 12
  let allTiles: Array<[number, number, number]> = [];
  for (let z = 8; z <= 12; z++) {
    allTiles = allTiles.concat(
      getBBoxTiles(minLat, maxLat, minLon, maxLon, z)
    );
  }

  // Deduplicate tiles
  const tileMap = new Map<string, [number, number, number]>();
  allTiles.forEach(([z, x, y]) => tileMap.set(`${z}/${x}/${y}`, [z, x, y]));
  const uniqueTiles = Array.from(tileMap.values());

  const total = uniqueTiles.length + 1; // +1 for GeoJSON
  let downloaded = 0;

  // Open tile cache
  const tileCache = await caches.open(TILE_CACHE);

  for (const [z, x, y] of uniqueTiles) {
    const url = TILE_URL(z, x, y);
    try {
      const existing = await tileCache.match(url);
      if (!existing) {
        const res = await fetch(url, { mode: 'cors' });
        if (res.ok) await tileCache.put(url, res);
      }
    } catch { /* skip failed tile */ }
    downloaded++;
    onProgress({ downloaded, total, pct: Math.round((downloaded / total) * 100), done: false });
  }

  // Cache GeoJSON vectors (PFZ polygon + IMBL line)
  const geoCache = await caches.open(GEO_CACHE);
  const geoPayload = JSON.stringify({
    zone,
    landPortCoords,
    imbl: IMBL_LINE,
    cachedAt: new Date().toISOString(),
  });
  await geoCache.put(
    `/offline/geo/${zone.id}`,
    new Response(geoPayload, { headers: { 'Content-Type': 'application/json' } })
  );

  downloaded++;
  onProgress({ downloaded, total, pct: 100, done: true });
}

/** Check if a zone's offline pack is cached */
export async function isZoneCached(zoneId: string): Promise<boolean> {
  const geoCache = await caches.open(GEO_CACHE);
  const match = await geoCache.match(`/offline/geo/${zoneId}`);
  return !!match;
}

/** Get all cached zone IDs */
export async function getCachedZoneIds(): Promise<string[]> {
  const geoCache = await caches.open(GEO_CACHE);
  const keys = await geoCache.keys();
  return keys
    .map(r => r.url.split('/offline/geo/')[1])
    .filter(Boolean);
}
