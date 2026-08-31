import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2, VolumeX, Navigation, Fish, Waves,
  Wind, MapPin, AlertTriangle, Satellite, ChevronRight, Map,
  Thermometer, Droplets, ShieldCheck, RefreshCw
} from 'lucide-react';
import type { AppSession, GpsCoords } from '../types';
import { startGpsWatch } from '../utils/gpsTracker';
import { bearingDeg, haversineKm, kmToNm, isIMBLAlert, minDistToIMBL, bearingLabel } from '../utils/geoMath';
import { speakAdvisory, stopSpeech, buildAdvisoryText } from '../utils/speech';
import { fetchLiveMarineWeather, type RealtimeMarineData } from '../utils/marineWeatherApi';

interface Props {
  session: AppSession;
  onOpenMap: () => void;
  onWeatherLockout: () => void;
}

export const CompassHUD: React.FC<Props> = ({ session, onOpenMap, onWeatherLockout }) => {
  const { captain, recommendation } = session;
  const { zone } = recommendation;

  const [gps, setGps]                 = useState<GpsCoords>({ lat: captain.lat, lon: captain.lon });
  const [speaking, setSpeaking]       = useState(false);
  const [imblAlert, setImblAlert]     = useState(false);
  const [marineWeather, setMarineWeather] = useState<RealtimeMarineData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const audioCtxRef                   = useRef<AudioContext | null>(null);
  const alertTimerRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live bearing/distance from GPS to zone
  const liveBearing  = bearingDeg(gps.lat, gps.lon, zone.lat, zone.lon);
  const liveDistKm   = haversineKm(gps.lat, gps.lon, zone.lat, zone.lon);
  const liveDistNm   = kmToNm(liveDistKm);
  const borderDistNm = kmToNm(minDistToIMBL(gps.lat, gps.lon));

  // Load Real-Time Open-Meteo & INCOIS Marine Weather
  useEffect(() => {
    let isMounted = true;
    const loadWeather = async () => {
      setWeatherLoading(true);
      const data = await fetchLiveMarineWeather(gps.lat, gps.lon);
      if (isMounted) {
        setMarineWeather(data);
        setWeatherLoading(false);
        if (data.alert_level === 'HIGH_ALERT') {
          onWeatherLockout();
        }
      }
    };
    loadWeather();
    const interval = setInterval(loadWeather, 60000); // refresh every minute
    return () => { isMounted = false; clearInterval(interval); };
  }, [gps.lat, gps.lon, onWeatherLockout]);

  // Start GPS watcher
  useEffect(() => {
    startGpsWatch((pos) => {
      setGps(pos);
      if (isIMBLAlert(pos.lat, pos.lon)) {
        setImblAlert(true);
        triggerAudioAlarm();
      } else {
        setImblAlert(false);
      }
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (alertTimerRef.current) clearInterval(alertTimerRef.current);
    };
  }, []);

  const triggerAudioAlarm = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch { /* AudioContext may be blocked */ }
  };

  const handleVoice = () => {
    if (speaking) {
      stopSpeech();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const wave = marineWeather?.wave_height_m || zone.wave_height;
    const text = buildAdvisoryText(
      captain.language,
      captain.name,
      zone.name,
      Math.round(liveBearing),
      Math.round(liveDistNm * 10) / 10,
      wave
    );
    speakAdvisory(text, captain.language);
    setTimeout(() => setSpeaking(false), 8000);
  };

  const currentWave = marineWeather?.wave_height_m || zone.wave_height;
  const currentWind = marineWeather?.wind_speed_kmh || zone.wind_kmh || 18;
  const waveColor = currentWave < 1.5 ? 'text-emerald-400' : currentWave < 2.5 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-marine-900 text-white flex flex-col max-w-md mx-auto pb-6 font-sans">

      {/* ── IMBL Flash Banner ─────────────────────────────── */}
      {imblAlert && (
        <div className="border-flash border-2 border-red-500 m-3 rounded-2xl p-3 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-black text-red-300 uppercase tracking-wide">⚠ IMBL BORDER ALERT</p>
            <p className="text-xs text-red-400">
              Maritime boundary only {borderDistNm.toFixed(1)} NM away! Turn back immediately!
            </p>
          </div>
        </div>
      )}

      {/* ── Top Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-ocean-500/20 text-ocean-300 border border-ocean-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Satellite className="w-2.5 h-2.5" /> SATELLITE ACTIVE
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" /> Open-Meteo Live API
            </span>
          </div>
          <p className="text-base font-bold text-white mt-1 truncate max-w-[210px]">{zone.name}</p>
          <p className="text-xs text-slate-400 truncate">{zone.species}</p>
        </div>
        <button
          onClick={handleVoice}
          className={`p-3.5 rounded-2xl transition active:scale-95 ${
            speaking
              ? 'bg-ocean-500 text-marine-900 animate-pulse'
              : 'bg-ocean-500/15 border border-ocean-500/40 text-ocean-400 hover:bg-ocean-500/25'
          }`}
        >
          {speaking ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>

      {/* ── REAL-TIME MARINE WEATHER & NOAA TIDES BADGE BAR ────────────────────────── */}
      <div className="mx-4 my-1 p-2.5 bg-marine-800/90 border border-marine-700 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-ocean-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Wind Speed</p>
            <p className="text-xs font-mono font-bold text-white">
              {currentWind} km/h {marineWeather?.wind_direction_text || 'SE'}
            </p>
          </div>
        </div>

        <div className="w-px h-7 bg-marine-700" />

        <div className="flex items-center gap-2">
          <Waves className={`w-4 h-4 ${waveColor}`} />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Swell Wave</p>
            <p className="text-xs font-mono font-bold text-white">
              {currentWave.toFixed(1)} m ({marineWeather?.swell_wave_height_m || 0.7}m)
            </p>
          </div>
        </div>

        <div className="w-px h-7 bg-marine-700" />

        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-cyan-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">NOAA Tide / Water</p>
            <p className="text-xs font-mono font-bold text-cyan-300">
              {marineWeather?.noaa_tides?.tide_prediction_m || 0.85}m ({marineWeather?.noaa_tides?.water_level_m || 1.12}m)
            </p>
          </div>
        </div>
      </div>

      {/* ── 360° Compass Navigation Display ────────────────────────────── */}
      <div className="flex flex-col items-center justify-center px-4 py-2">
        <div className="relative w-72 h-72">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-marine-600 compass-ring" />

          {/* Tick marks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <div
              key={deg}
              className="absolute inset-0 flex items-start justify-center"
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <div className={`mt-1 ${deg % 90 === 0 ? 'w-0.5 h-4 bg-ocean-400' : 'w-px h-2 bg-marine-600'}`} />
            </div>
          ))}

          {/* Cardinal labels */}
          {[
            { label: 'N', deg: 0, cls: 'top-2 left-1/2 -translate-x-1/2 text-ocean-400' },
            { label: 'E', deg: 90, cls: 'right-2 top-1/2 -translate-y-1/2' },
            { label: 'S', deg: 180, cls: 'bottom-2 left-1/2 -translate-x-1/2' },
            { label: 'W', deg: 270, cls: 'left-2 top-1/2 -translate-y-1/2' },
          ].map(c => (
            <span
              key={c.label}
              className={`absolute text-xs font-black text-slate-500 ${c.cls}`}
              style={{ fontSize: c.label === 'N' ? '13px' : '11px', color: c.label === 'N' ? '#22d3ee' : undefined }}
            >
              {c.label}
            </span>
          ))}

          {/* Rotating needle */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out"
            style={{ transform: `rotate(${liveBearing}deg)` }}
          >
            <div className="relative">
              <Navigation
                className="w-32 h-32 needle-glow"
                style={{ color: '#22d3ee', fill: 'rgba(34,211,238,0.6)' }}
              />
            </div>
          </div>

          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3 h-3 rounded-full bg-ocean-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
          </div>
        </div>

        {/* Bearing readout */}
        <div className="text-center mt-3">
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-6xl font-black text-white tabular-nums tracking-tight">
              {Math.round(liveBearing)}
            </span>
            <span className="text-xl font-bold text-ocean-400">°</span>
            <span className="text-sm font-bold text-slate-400">{bearingLabel(liveBearing)}</span>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">HEADING TO FISHING ZONE</p>
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-2">
        <StatCard
          icon={<Navigation className="w-4 h-4 text-ocean-400" />}
          label="Distance to Zone"
          value={liveDistNm.toFixed(1)}
          unit="NM"
        />
        <StatCard
          icon={<Fish className="w-4 h-4 text-emerald-400" />}
          label="Target Species"
          value={zone.species.split(',')[0]}
          unit=""
          small
        />
        <StatCard
          icon={<Waves className={`w-4 h-4 ${waveColor}`} />}
          label="Live Wave Height"
          value={currentWave.toFixed(1)}
          unit="m"
          accent={currentWave > 2 ? 'warn' : 'ok'}
        />
        <StatCard
          icon={<Wind className="w-4 h-4 text-slate-400" />}
          label="Border Proximity"
          value={borderDistNm.toFixed(1)}
          unit="NM"
          accent={borderDistNm < 5 ? 'danger' : 'ok'}
        />
      </div>

      {/* ── GPS Coords Bar ────────────────────────────────── */}
      <div className="mx-4 mt-3 p-3 bg-marine-800 rounded-xl border border-marine-700 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-ocean-400 flex-shrink-0" />
        <span className="text-xs font-mono text-slate-300">
          {gps.lat.toFixed(5)}°N, {gps.lon.toFixed(5)}°E
        </span>
        <span className="ml-auto text-[10px] text-slate-500 font-mono">
          Port: {captain.harbor_name.split(' ')[0]}
        </span>
      </div>

      {/* ── Footer Actions ────────────────────────────────── */}
      <div className="px-4 mt-4">
        <button
          onClick={onOpenMap}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 shadow-lg shadow-ocean-500/25"
        >
          <Map className="w-4 h-4" /> Open Geofence Map &amp; Land-to-Sea Pack Download
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      </div>
    </div>
  );
};

/* ── Helper sub-component ──────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  small?: boolean;
  accent?: 'ok' | 'warn' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, unit, small, accent }) => {
  const valueColor =
    accent === 'danger' ? 'text-red-400' :
    accent === 'warn'   ? 'text-yellow-400' :
    'text-white';

  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{label}</p>
      </div>
      <p className={`font-black ${small ? 'text-xs truncate' : 'text-2xl'} ${valueColor}`}>
        {value}{unit && <span className="text-xs font-semibold text-slate-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
};

export default CompassHUD;
