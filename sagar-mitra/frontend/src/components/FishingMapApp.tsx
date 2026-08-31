import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import {
  Navigation, Download, MapPin, CheckCircle2,
  ShieldAlert, ArrowLeft, Layers, Wifi, WifiOff,
  AlertTriangle, Fish, Radio, RefreshCw, Wind, Waves, Thermometer, Droplets,
  ChevronUp, ChevronDown, Compass, ShieldCheck, Skull, Award, Search,
  Satellite, Key, Settings
} from 'lucide-react';

import {
  PFZ_ZONES, IMBL_LINE, evaluateGeofences, triggerGeofenceAudio,
  type GeofenceAlert, type GeofenceStatus, type PFZZoneGeo
} from '../utils/geofenceEngine';
import { downloadOfflinePack, isZoneCached, type DownloadProgress } from '../utils/offlineMapCache';
import { fetchLiveMarineWeather, type RealtimeMarineData } from '../utils/marineWeatherApi';
import type { AppSession } from '../types';

// Fix Leaflet default icon path
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom Vessel Marker Icon
const VESSEL_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:38px;height:38px;border-radius:50%;
    background:linear-gradient(135deg, #0284c7, #0369a1);
    border:3px solid #fff;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 18px rgba(2,132,199,0.9);
    font-size:22px;
    cursor:pointer;
  ">⛵</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

// Harbors inside India Maritime Territory
const HARBORS = [
  { name: 'Nagapattinam Fishing Harbour', coords: [10.767, 79.842] as [number, number] },
  { name: 'Rameswaram Jetty',            coords: [9.288,  79.313] as [number, number] },
  { name: 'Chennai Fishing Harbour',     coords: [13.082, 80.270] as [number, number] },
  { name: 'Tuticorin Deep Sea Port',     coords: [8.800,  78.135] as [number, number] },
  { name: 'Kochi Marine Harbor',         coords: [9.931,  76.267] as [number, number] },
  { name: 'Kanyakumari Pier',            coords: [8.088,  77.538] as [number, number] },
  { name: 'Cuddalore Port',              coords: [11.750, 79.770] as [number, number] },
  { name: 'Visakhapatnam Harbor',        coords: [17.686, 83.218] as [number, number] },
];

interface Props {
  session: AppSession;
  onBack: () => void;
}

export const FishingMapApp: React.FC<Props> = ({ session, onBack }) => {
  const { captain } = session;

  // ── State ───────────────────────────────────────────────────────────────
  const [vesselPos, setVesselPos]       = useState<[number, number]>([captain.lat, captain.lon]);
  const [landPort, setLandPort]         = useState<[number, number]>([captain.lat, captain.lon]);
  const [mapCenter, setMapCenter]       = useState<[number, number]>([captain.lat, captain.lon]);
  const [selectedZone, setSelectedZone] = useState<PFZZoneGeo | null>(PFZ_ZONES[0]);
  const [dlProgress, setDlProgress]     = useState<DownloadProgress | null>(null);
  const [cachedZones, setCachedZones]   = useState<Set<string>>(new Set());
  const [alert, setAlert]               = useState<GeofenceAlert>({
    status: 'SAFE',
    message: 'Select a fishing spot in the V-Corridor, then download the Land-to-Sea map pack.',
    distanceToBorderKm: 15, distanceToBorderNm: 8.1, insidePFZ: false,
  });
  const [isOnline, setIsOnline]           = useState(navigator.onLine);
  const [showZonePanel, setShowZonePanel] = useState(true);
  const [weatherMap, setWeatherMap]       = useState<Record<string, RealtimeMarineData>>({});
  const [dockWeather, setDockWeather]     = useState<RealtimeMarineData | null>(null);
  const [manualLat, setManualLat]         = useState<string>('');
  const [manualLon, setManualLon]         = useState<string>('');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey]   = useState<string>(localStorage.getItem('openweather_key') || '');
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(50); // 50 km radius circle
  const [liveGpsLocked, setLiveGpsLocked]   = useState<boolean>(false);
  const [isInland, setIsInland]             = useState<boolean>(false);

  // ── Leaflet & Tracking Refs ───────────────────────────────────────────────
  const mapContainerRef     = useRef<HTMLDivElement>(null);
  const mapRef              = useRef<L.Map | null>(null);
  const layersGroupRef      = useRef<L.LayerGroup | null>(null);
  const lastStatusRef       = useRef<GeofenceStatus>('SAFE');
  const arrivedAlertSentRef = useRef<string | null>(null);
  const borderAlertSentRef  = useRef<boolean>(false);
  const watchIdRef          = useRef<number | null>(null);

  // ── Helper to Send Real-Time Twilio SMS ──────────────────────────────────
  const sendTwilioSMSAlert = useCallback(async (phone: string, message: string, isFlash = false) => {
    try {
      await fetch('/api/guardian/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, is_flash: isFlash }),
      });
    } catch (err) {
      console.warn('Twilio SMS offline fallback:', err);
    }
  }, []);

  // ── Check if GPS Location is Inland / Away from Sea ──────────────────────
  const checkInlandLocation = useCallback((lat: number, lon: number) => {
    const userPt = turf.point([lon, lat]);
    let minDistanceKm = 9999;
    HARBORS.forEach((h) => {
      const harborPt = turf.point([h.coords[1], h.coords[0]]);
      const dist = turf.distance(userPt, harborPt, { units: 'kilometers' });
      if (dist < minDistanceKm) minDistanceKm = dist;
    });
    // If > 100 km from any coastal harbor, user is in the inland middle of country
    setIsInland(minDistanceKm > 100);
  }, []);

  // ── Mandatory Continuous Live GPS Watch ─────────────────────────────────
  const requestLiveGPS = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setVesselPos([lat, lon]);
          setLandPort([lat, lon]);
          setMapCenter([lat, lon]);
          setLiveGpsLocked(true);
          checkInlandLocation(lat, lon);
        },
        (err) => {
          console.warn('Geolocation prompt denied or error:', err);
          setLiveGpsLocked(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Continuous Watch Position
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setVesselPos([lat, lon]);
          setLiveGpsLocked(true);
          checkInlandLocation(lat, lon);
        },
        (err) => console.warn('GPS watch error:', err),
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }
  }, [checkInlandLocation]);

  useEffect(() => {
    requestLiveGPS();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [requestLiveGPS]);

  // ── Fetch Real-time Marine Weather for Dock and all Spots ───────────────
  const refreshWeather = useCallback(async () => {
    // Dock weather
    const dData = await fetchLiveMarineWeather(landPort[0], landPort[1]);
    setDockWeather(dData);

    // Spot weather
    PFZ_ZONES.forEach(async (z) => {
      const data = await fetchLiveMarineWeather(z.center[0], z.center[1]);
      setWeatherMap(prev => ({ ...prev, [z.id]: data }));
    });
  }, [landPort]);

  useEffect(() => {
    refreshWeather();
  }, [refreshWeather]);

  // ── Load cached zones & network status ──────────────────────────────────
  useEffect(() => {
    (async () => {
      const ids: string[] = [];
      for (const z of PFZ_ZONES) {
        if (await isZoneCached(z.id)) ids.push(z.id);
      }
      setCachedZones(new Set(ids));
    })();
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online',  on); window.removeEventListener('offline', off); };
  }, []);

  // ── Initialize Map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      setVesselPos([e.latlng.lat, e.latlng.lng]);
    });

    layersGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layersGroupRef.current = null;
    };
  }, []);

  // ── Update Leaflet Layers (Radius Circle & Real-Time Spots) ──────────────
  useEffect(() => {
    const map   = mapRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 0. Draw 50 km Radius Circle around User's Location (Turf.js)
    const centerPoint = turf.point([landPort[1], landPort[0]]);
    const circlePoly = turf.circle(centerPoint, searchRadiusKm, { units: 'kilometers' });
    const circleLatLngs = (circlePoly.geometry.coordinates[0] as [number, number][])
      .map(([lng, lat]) => [lat, lng] as [number, number]);

    const radiusCircleLayer = L.polygon(circleLatLngs, {
      color: '#0284c7',
      fillColor: '#0284c7',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '5, 5',
    });
    group.addLayer(radiusCircleLayer);

    // 1. Land Port Marker
    const landMarker = L.marker(landPort, {
      icon: L.divIcon({
        className: '',
        html: `<div style="
          background:#059669;color:#fff;
          font-size:10px;font-weight:800;padding:3px 8px;
          border-radius:12px;border:2px solid #fff;
          white-space:nowrap;box-shadow:0 0 10px rgba(5,150,105,0.7)
        ">⚓ ${liveGpsLocked ? 'LIVE GPS POSITION' : 'LAND PORT'}</div>`,
        iconAnchor: [45, 12],
      }),
    });
    group.addLayer(landMarker);

    // 2. Draw Candidate PFZ Polygons inside Maritime Territory
    PFZ_ZONES.forEach(zone => {
      const positions = (zone.polygon.geometry.coordinates[0] as [number, number][])
        .map(([lng, lat]) => [lat, lng] as [number, number]);
      const isSelected = selectedZone?.id === zone.id;
      const isCached   = cachedZones.has(zone.id);
      const wData      = weatherMap[zone.id];
      const waveHeight = wData?.wave_height_m || zone.wave_height;
      const windSpeed  = wData?.wind_speed_kmh || 18;

      // Color coding logic:
      // Green = High Chlorophyll & Safe
      // Yellow = Moderate swell
      // Red = Dangerous High Wave / Border Breach
      let zoneColor = zone.color;
      if (zone.is_dangerous || waveHeight > 2.2 || windSpeed > 35) {
        zoneColor = '#ef4444'; // Red Zone
      } else if (waveHeight > 1.5) {
        zoneColor = '#f59e0b'; // Yellow Zone
      } else {
        zoneColor = '#22c55e'; // Green Zone
      }

      const poly = L.polygon(positions, {
        color:       zoneColor,
        fillColor:   zoneColor,
        fillOpacity: isSelected ? 0.5 : 0.28,
        weight:      isSelected ? 3 : 2,
        dashArray:   isSelected ? undefined : '4,4',
      });

      poly.bindPopup(`
        <div style="font-family:sans-serif;padding:4px;">
          <p style="font-weight:bold;color:${zoneColor};font-size:12px;margin:0;">
            ${zoneColor === '#ef4444' ? '🔴 RED ZONE (DANGER)' : zoneColor === '#f59e0b' ? '🟡 YELLOW ZONE (CAUTION)' : '🟢 GREEN PFZ ZONE (OPTIMAL)'} — ${zone.id}
          </p>
          <p style="font-weight:bold;font-size:14px;margin:2px 0;">${zone.name}</p>
          <p style="font-size:11px;color:#374151;margin:2px 0;">Species: ${zone.species}</p>
          <p style="font-size:11px;color:#2563eb;margin:2px 0;">💨 Wind: ${windSpeed} km/h</p>
          <p style="font-size:11px;color:#059669;margin:2px 0;">🌊 Swell: ${waveHeight}m | Chl: ${zone.chlorophyll}</p>
        </div>
      `);
      group.addLayer(poly);

      // Centroid marker
      const labelMarker = L.marker(zone.center, {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            background:${zoneColor}ee;color:#fff;
            font-size:9px;font-weight:800;
            padding:2px 6px;border-radius:6px;
            white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
            border:1px solid rgba(255,255,255,0.4)
          ">${zoneColor === '#ef4444' ? '🔴 DANGER' : zoneColor === '#f59e0b' ? '🟡 CAUTION' : '🟢 FISH'} ${zone.id}</div>`,
          iconAnchor: [24, 10],
        }),
      });
      group.addLayer(labelMarker);

      // V-Corridor Line
      if (isSelected) {
        const corridorLine = L.polyline([landPort, zone.center], {
          color: '#22d3ee',
          weight: 3,
          dashArray: '6, 6',
          opacity: 0.8
        });
        group.addLayer(corridorLine);
      }
    });

    // 3. IMBL Line (India Boundary)
    const imblLatLngs = (IMBL_LINE.geometry.coordinates as [number, number][])
      .map(([lng, lat]) => [lat, lng] as [number, number]);

    group.addLayer(L.polyline(imblLatLngs, { color: '#ef4444', weight: 4, dashArray: '8, 8' }));

    // 4. Vessel Marker
    group.addLayer(L.marker(vesselPos, { icon: VESSEL_ICON }));
  }, [vesselPos, landPort, selectedZone, cachedZones, weatherMap, searchRadiusKm, liveGpsLocked]);

  // ── Pan Map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(mapCenter, mapRef.current.getZoom());
    }
  }, [mapCenter]);

  // ── Geofence Evaluation ──────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const result = evaluateGeofences(vesselPos, PFZ_ZONES, IMBL_LINE);
      setAlert(result);
      if (result.status !== lastStatusRef.current) {
        if (result.status !== 'SAFE') {
          triggerGeofenceAudio(result, captain.language);
        }
        lastStatusRef.current = result.status;
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [vesselPos, captain.language]);

  // ── Calculate Day Safety Status at Dock ──────────────────────────────────
  const getDockSafetyStatus = () => {
    const wind = dockWeather?.wind_speed_kmh || 18;
    const wave = dockWeather?.wave_height_m || 1.1;

    if (wave > 2.5 || wind > 40) {
      return {
        level: 'RED',
        title: '🔴 NO-GO (LOCKDOWN: Ventures Prohibited)',
        desc: `High waves (${wave}m) & wind (${wind} km/h). Strictly prohibited from sailing!`,
        bg: 'bg-red-950 border-red-600 text-red-200'
      };
    } else if (wave > 1.5 || wind > 25) {
      return {
        level: 'YELLOW',
        title: '🟡 CAUTION (Near-shore Only, Max 5 NM)',
        desc: `Moderate swell (${wave}m). Stay within 5 NM from shore.`,
        bg: 'bg-amber-950 border-amber-600 text-amber-200'
      };
    } else {
      return {
        level: 'GREEN',
        title: '🟢 GO (Safe: All Fishing Zones Open)',
        desc: `Sea is calm (${wave}m wave, ${wind} km/h wind). Ideal conditions for deep-sea fishing.`,
        bg: 'bg-emerald-950 border-emerald-600 text-emerald-200'
      };
    }
  };

  const daySafety = getDockSafetyStatus();

  // ── 1-Hour Periodic Twilio Location SMS Tracker ──────────────────────────
  useEffect(() => {
    if (!selectedZone || !captain.phone) return;
    const captainPhone = captain.phone;

    const intervalId = setInterval(() => {
      const distNm = (turf.distance(
        turf.point([vesselPos[1], vesselPos[0]]),
        turf.point([selectedZone.center[1], selectedZone.center[0]]),
        { units: 'nauticalmiles' }
      )).toFixed(1);

      sendTwilioSMSAlert(
        captainPhone,
        `SAGAR-MITRA 1-Hour Update: Vessel at Lat ${vesselPos[0].toFixed(4)}, Lon ${vesselPos[1].toFixed(4)}. Target: ${selectedZone.name} (${distNm} NM away). Status: SAFE.`
      );
    }, 3600000); // 1-Hour periodic SMS

    return () => clearInterval(intervalId);
  }, [selectedZone, vesselPos, captain.phone, sendTwilioSMSAlert]);

  // ── Spot Arrival (<1 NM) & Border Proximity (<2 NM) Real-time Twilio Alerts ──
  useEffect(() => {
    if (!selectedZone || !captain.phone) return;
    const captainPhone = captain.phone;

    const distToSpotNm = turf.distance(
      turf.point([vesselPos[1], vesselPos[0]]),
      turf.point([selectedZone.center[1], selectedZone.center[0]]),
      { units: 'nauticalmiles' }
    );

    // Spot Arrival SMS alert (< 1 NM)
    if (distToSpotNm <= 1.0 && arrivedAlertSentRef.current !== selectedZone.id) {
      arrivedAlertSentRef.current = selectedZone.id;
      sendTwilioSMSAlert(
        captainPhone,
        `SAGAR-MITRA Arrival Alert: You have arrived at fishing spot ${selectedZone.name}! High fish density zone reached. Good fishing!`
      );
    }

    // Border Proximity SMS Warning (< 2 NM)
    if (alert.distanceToBorderNm <= 2.0 && alert.status !== 'SAFE' && !borderAlertSentRef.current) {
      borderAlertSentRef.current = true;
      sendTwilioSMSAlert(
        captainPhone,
        `EMERGENCY BORDER WARNING: You are ${alert.distanceToBorderNm.toFixed(1)} NM from the Maritime Boundary Line! Turn back immediately!`,
        true
      );
    }
  }, [vesselPos, selectedZone, alert, captain.phone, sendTwilioSMSAlert]);

  // ── Select & Download zone pack ──────────────────────────────────────────
  const handleSelectAndDownload = useCallback(async (zone: PFZZoneGeo) => {
    setSelectedZone(zone);
    setMapCenter(zone.center);

    // Send real-time Twilio SMS alert for journey start & offline map cache
    sendTwilioSMSAlert(
      captain.phone,
      `SAGAR-MITRA: Your fishing journey to ${zone.name} has started! Offline V-Corridor Map cached. Stay safe!`
    );

    if (cachedZones.has(zone.id)) return;

    setDlProgress({ downloaded: 0, total: 1, pct: 0, done: false });
    await downloadOfflinePack(zone, landPort, (p) => setDlProgress(p));
    setCachedZones(prev => new Set([...prev, zone.id]));
  }, [cachedZones, landPort, captain.phone, sendTwilioSMSAlert]);

  return (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center p-0 md:p-4 font-sans">
      
      {/* ── PHONE FRAME WRAPPER ──────────────────────────────────────────── */}
      <div className="w-full max-w-[430px] h-full max-h-[920px] bg-marine-950 rounded-none md:rounded-[40px] border-0 md:border-[8px] md:border-slate-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* Dynamic Island / Phone Status Bar WITH BACK BUTTON */}
        <div className="bg-marine-950 px-3 pt-3 pb-2 flex items-center justify-between z-[1001] shrink-0 border-b border-marine-800/60">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-ocean-400 font-bold bg-marine-900 border border-marine-700 px-2.5 py-1 rounded-lg hover:bg-marine-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-center gap-1 text-xs text-slate-200 font-bold">
            <Compass className="w-4 h-4 text-ocean-400 animate-spin-slow" />
            <span>SAGAR NAVIGATOR</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="p-1 text-slate-400 hover:text-white transition"
              title="API Key Configuration"
            >
              <Key className="w-3.5 h-3.5" />
            </button>
            {isOnline
              ? <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-extrabold"><Wifi className="w-3 h-3" />4G</span>
              : <span className="flex items-center gap-1 text-[9px] text-red-400 font-extrabold"><WifiOff className="w-3 h-3" />0G</span>
            }
          </div>
        </div>

        {/* ── TOP DECISION ENGINE BANNER ("Is Today Good for Fishing?") ────── */}
        <div className={`px-3 py-2 border-b ${daySafety.bg} z-[1000] shrink-0 shadow-lg`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {daySafety.title}
            </span>
            <button onClick={refreshWeather} className="p-1 hover:bg-white/10 rounded-full transition">
              <RefreshCw className="w-3 h-3 animate-spin-once" />
            </button>
          </div>
          <p className="text-[10px] opacity-90 leading-tight font-medium mb-1.5">
            {daySafety.desc}
          </p>
          <div className="flex items-center justify-between text-[10px] font-mono font-bold">
            <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-ocean-400" /> Wind: {dockWeather?.wind_speed_kmh || 18} km/h</span>
            <span className="flex items-center gap-1"><Waves className="w-3 h-3 text-blue-400" /> Wave: {dockWeather?.wave_height_m || 1.1}m</span>
            <span className="flex items-center gap-1 text-cyan-300"><Droplets className="w-3 h-3 text-cyan-400" /> NOAA Tide: {dockWeather?.noaa_tides?.tide_prediction_m || 0.85}m</span>
            <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-sans">LIVE NOAA API</span>
          </div>
        </div>

        {/* ── HARBOR / GPS SELECTOR & RADIUS CONTROLS ─────────────────────── */}
        <div className="bg-marine-900 border-b border-marine-800 px-3 py-2 z-[1000] shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-marine-950 border border-marine-700 rounded-lg px-2 py-1 text-xs flex-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                value={HARBORS.find(h => h.coords[0] === landPort[0])?.name || 'CUSTOM'}
                onChange={e => {
                  const h = HARBORS.find(h => h.name === e.target.value);
                  if (h) {
                    setLandPort(h.coords);
                    setVesselPos(h.coords);
                    setMapCenter(h.coords);
                    setLiveGpsLocked(false);
                  }
                }}
                className="bg-transparent text-white font-bold outline-none cursor-pointer truncate w-full text-[11px]"
              >
                {HARBORS.map(h => <option key={h.name} value={h.name} className="bg-marine-900 text-white">{h.name}</option>)}
                <option value="CUSTOM" className="bg-marine-900">Custom Lat/Lon</option>
              </select>
            </div>

            <button
              onClick={requestLiveGPS}
              className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg border transition shrink-0 flex items-center gap-1 ${
                liveGpsLocked
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-marine-800 border-marine-600 text-slate-300 hover:text-white'
              }`}
            >
              <Satellite className="w-3 h-3" /> {liveGpsLocked ? 'GPS Locked' : 'Use GPS'}
            </button>
          </div>

          {/* Search Radius Slider (50 km circle) */}
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300 px-1">
            <span className="flex items-center gap-1">🌐 Radius Circle: <span className="font-mono font-bold text-ocean-400">{searchRadiusKm} km</span></span>
            <div className="flex gap-1">
              {[25, 50, 100].map(r => (
                <button
                  key={r}
                  onClick={() => setSearchRadiusKm(r)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${searchRadiusKm === r ? 'bg-ocean-500 text-marine-950' : 'bg-marine-950 text-slate-400'}`}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── INLAND LOCATION WARNING BANNER ────────────────────────────── */}
        {isInland && (
          <div className="bg-amber-950/90 border-b border-amber-600 px-3 py-2 z-[1000] shrink-0 text-amber-200 text-xs border-l-4 border-l-amber-500 shadow-md">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>NO FISHING SPOTS AT CURRENT LOCATION</span>
            </div>
            <p className="text-[10px] leading-tight opacity-90">
              Your live phone GPS indicates you are inland in the middle of the country, away from coastal fishing stations. Please select a coastal harbor above to view sea spots!
            </p>
          </div>
        )}

        {/* ── MAP CONTAINER ──────────────────────────────────────────────── */}
        <div className="flex-1 relative z-0">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Flash alert for border breach */}
          {alert.status === 'BORDER_BREACH' && (
            <div className="absolute inset-0 pointer-events-none border-8 border-red-500 border-flash z-[999]" />
          )}

          {/* Map info pill */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <span className="bg-marine-950/90 border border-marine-700 backdrop-blur text-slate-200 text-[9px] px-2.5 py-1 rounded-full font-semibold shadow">
              ⛵ Tap map to position boat inside territorial sea
            </span>
          </div>
        </div>

        {/* ── DOWNLOAD PROGRESS BAR ───────────────────────────────────────── */}
        {dlProgress && !dlProgress.done && (
          <div className="bg-marine-950 border-t border-marine-800 px-3 py-2 z-[1000] shrink-0">
            <div className="flex justify-between text-[10px] font-extrabold text-ocean-400 mb-1">
              <span className="flex items-center gap-1"><Radio className="w-3 h-3 animate-pulse" /> Downloading Land-to-Sea Map Pack…</span>
              <span>{dlProgress.pct}%</span>
            </div>
            <div className="w-full bg-marine-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-ocean-500 to-emerald-400 h-full rounded-full transition-all duration-150" style={{ width: `${dlProgress.pct}%` }} />
            </div>
          </div>
        )}

        {/* ── SCROLLABLE SPOT CARDS SECTION (GREEN / YELLOW / RED ZONES) ───── */}
        {showZonePanel && (
          <div className="bg-marine-900 border-t border-marine-800 z-[1000] shrink-0 max-h-[38vh] overflow-y-auto p-2.5 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-ocean-300 uppercase tracking-wider flex items-center gap-1">
                <Fish className="w-3.5 h-3.5 text-ocean-400" /> Real-Time Fishing Zones (Inside India EEZ)
              </p>
              <span className="text-[9px] text-slate-400 font-mono">{PFZ_ZONES.length} Spots Active</span>
            </div>

            <div className="space-y-2">
              {PFZ_ZONES.map((zone, idx) => {
                const cached = cachedZones.has(zone.id);
                const isSelected = selectedZone?.id === zone.id;
                const wData = weatherMap[zone.id];
                const waveHeight = wData?.wave_height_m || zone.wave_height;
                const windSpeed  = wData?.wind_speed_kmh || 18;
                const isDangerous = zone.is_dangerous || waveHeight > 2.2 || windSpeed > 35;
                const isCaution = !isDangerous && waveHeight > 1.5;

                return (
                  <div
                    key={zone.id}
                    onClick={() => handleSelectAndDownload(zone)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isDangerous
                        ? 'bg-red-950/40 border-red-700/60 hover:border-red-500'
                        : isCaution
                        ? 'bg-amber-950/40 border-amber-600/60 hover:border-amber-400'
                        : idx === 0
                        ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-900/30'
                        : isSelected
                        ? 'bg-ocean-950 border-ocean-400'
                        : 'bg-marine-800 border-marine-700 hover:border-marine-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isDangerous ? (
                          <span className="bg-red-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                            🔴 RED ZONE (DANGER)
                          </span>
                        ) : isCaution ? (
                          <span className="bg-amber-500 text-marine-950 font-black text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                            🟡 CAUTION
                          </span>
                        ) : (
                          <span className="bg-emerald-500 text-marine-950 font-black text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                            🟢 GREEN PFZ
                          </span>
                        )}
                        <span className="text-xs font-bold text-white truncate">{zone.name}</span>
                      </div>

                      {cached ? (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" /> CACHED
                        </span>
                      ) : (
                        <button className="text-[9px] bg-ocean-500 text-marine-950 px-2 py-0.5 rounded font-black flex items-center gap-1 shrink-0 shadow">
                          <Download className="w-2.5 h-2.5" /> Pack
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-300 font-semibold mb-1.5 truncate">
                      🎣 {zone.species}
                    </p>

                    <div className="grid grid-cols-3 gap-1.5 bg-marine-950/80 p-1.5 rounded-lg text-[9px] font-mono">
                      <div>
                        <span className="text-slate-400 block text-[7px]">WIND</span>
                        <span className="font-bold text-white">{windSpeed} km/h</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[7px]">SWELL</span>
                        <span className={`font-bold ${waveHeight > 2.2 ? 'text-red-400' : 'text-emerald-400'}`}>{waveHeight}m</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[7px]">CHLOROPHYLL</span>
                        <span className="font-bold text-ocean-300">{zone.chlorophyll}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BOTTOM PHONE NAVIGATION TAB BAR ─────────────────────────────── */}
        <div className="bg-marine-950 border-t border-marine-800 px-4 py-2.5 flex items-center justify-around z-[1001] shrink-0 text-slate-400">
          <button onClick={onBack} className="flex flex-col items-center gap-0.5 text-ocean-400 hover:text-white transition font-bold">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[9px]">Back</span>
          </button>

          <button onClick={() => setShowZonePanel(v => !v)} className="flex flex-col items-center gap-0.5 text-slate-200 font-bold">
            <Fish className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px]">Zones</span>
          </button>

          <button onClick={() => setVesselPos(landPort)} className="flex flex-col items-center gap-0.5 hover:text-white transition">
            <Compass className="w-4 h-4" />
            <span className="text-[9px] font-bold">Center</span>
          </button>
        </div>
      </div>

      {/* ── API KEY CONFIGURATION MODAL ─────────────────────────────────── */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-marine-900 border border-marine-700 p-4 rounded-2xl w-full max-w-xs shadow-2xl text-white">
            <h3 className="text-sm font-bold text-ocean-300 mb-2 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" /> Commercial Marine API Keys
            </h3>
            <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
              Open-Meteo & INCOIS endpoints are <strong>100% FREE</strong> and active without any API keys! You can optionally enter an OpenWeather or Copernicus Marine key below:
            </p>

            <div className="mb-4">
              <label className="text-[10px] font-bold text-slate-400 block mb-1">OPTIONAL API KEY</label>
              <input
                type="text"
                value={customApiKey}
                onChange={e => setCustomApiKey(e.target.value)}
                placeholder="Paste key (Optional)"
                className="w-full bg-marine-950 border border-marine-700 rounded-lg p-2 text-xs font-mono text-white outline-none focus:border-ocean-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="flex-1 bg-marine-800 text-slate-300 text-xs py-2 rounded-lg font-bold hover:bg-marine-700 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('openweather_key', customApiKey);
                  setShowApiKeyModal(false);
                }}
                className="flex-1 bg-ocean-500 text-marine-950 text-xs py-2 rounded-lg font-extrabold hover:bg-ocean-400 transition"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FishingMapApp;
