import React from 'react';
import { AlertTriangle, Navigation, Phone, Waves } from 'lucide-react';
import type { AppSession } from '../types';
import { bearingDeg, haversineKm, kmToNm } from '../utils/geoMath';
import { speakAdvisory } from '../utils/speech';

// Nearest safe harbors
const SAFE_HARBORS = [
  { name: 'Nagapattinam', lat: 10.767, lon: 79.842 },
  { name: 'Rameswaram',   lat: 9.288,  lon: 79.313 },
  { name: 'Kochi',        lat: 9.931,  lon: 76.267 },
];

interface Props {
  session: AppSession;
  onDismiss: () => void;
}

export const WeatherAlert: React.FC<Props> = ({ session, onDismiss }) => {
  const { zone } = session.recommendation;
  const { captain } = session;

  // Find nearest harbor from captain's last known position
  let nearestHarbor = SAFE_HARBORS[0];
  let minDist = Infinity;
  SAFE_HARBORS.forEach(h => {
    const d = haversineKm(captain.lat, captain.lon, h.lat, h.lon);
    if (d < minDist) { minDist = d; nearestHarbor = h; }
  });
  const returnBearing = bearingDeg(captain.lat, captain.lon, nearestHarbor.lat, nearestHarbor.lon);
  const returnNm = kmToNm(minDist);

  const handleVoiceAlert = () => {
    const texts: Record<string, string> = {
      ta: `ஆபத்து! அலை உயரம் ${zone.wave_height} மீட்டர். உடனே கரை திரும்புங்கள். திசை ${Math.round(returnBearing)} டிகிரி. தூரம் ${returnNm.toFixed(1)} கடல் மைல்.`,
      te: `ప్రమాదం! అలల ఎత్తు ${zone.wave_height} మీటర్. వెంటనే తీరానికి రండి. దిశ ${Math.round(returnBearing)} డిగ్రీలు. దూరం ${returnNm.toFixed(1)} నాటికల్.`,
      hi: `खतरा! लहर ${zone.wave_height} मीटर ऊंची है। तुरंत किनारे लौटें। दिशा ${Math.round(returnBearing)} डिग्री। दूरी ${returnNm.toFixed(1)} नॉटिकल मील।`,
      ml: `അപകടം! തിര ${zone.wave_height} മീറ്റർ. ഉടൻ കരയ്ക്ക് മടങ്ങുക. ദിശ ${Math.round(returnBearing)} ഡിഗ്രി. ദൂരം ${returnNm.toFixed(1)} നോട്ടിക്കൽ.`,
      bn: `বিপদ! ঢেউ ${zone.wave_height} মিটার। তৎক্ষণাৎ তীরে ফিরুন। দিক ${Math.round(returnBearing)} ডিগ্রি। দূরত্ব ${returnNm.toFixed(1)} নটিক্যাল।`,
    };
    speakAdvisory(texts[captain.language] || texts.ta, captain.language);
  };

  return (
    <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-6 text-white">
      {/* Flashing warning icon */}
      <div className="w-24 h-24 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center mb-6 animate-pulse">
        <AlertTriangle className="w-12 h-12 text-red-400" />
      </div>

      <h1 className="text-2xl font-black text-red-300 text-center uppercase tracking-wide mb-2">
        ⚠ SEVERE WEATHER LOCKOUT
      </h1>
      <p className="text-sm text-red-400 text-center mb-6">
        Catch zones are blocked. Navigate to nearest safe haven immediately.
      </p>

      {/* Hazard stats */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-6">
        <div className="bg-red-900/40 border border-red-700 rounded-2xl p-4 text-center">
          <Waves className="w-6 h-6 text-red-400 mx-auto mb-1" />
          <p className="text-3xl font-black text-white">{zone.wave_height}m</p>
          <p className="text-xs text-red-400 uppercase tracking-wide">Wave Height</p>
        </div>
        <div className="bg-red-900/40 border border-red-700 rounded-2xl p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <p className="text-3xl font-black text-white">{zone.wind_kmh ?? '40+'}km/h</p>
          <p className="text-xs text-red-400 uppercase tracking-wide">Wind Speed</p>
        </div>
      </div>

      {/* Safe return compass */}
      <div className="w-full max-w-sm bg-red-900/30 border border-red-700 rounded-2xl p-5 mb-6 text-center">
        <p className="text-xs text-red-400 uppercase tracking-wide font-bold mb-3">SAFE RETURN HEADING</p>
        <div className="flex items-baseline justify-center gap-2 mb-1">
          <Navigation className="w-8 h-8 text-orange-400" style={{ transform: `rotate(${returnBearing}deg)` }} />
          <span className="text-5xl font-black text-white">{Math.round(returnBearing)}°</span>
        </div>
        <p className="text-lg font-bold text-orange-300">→ {nearestHarbor.name}</p>
        <p className="text-sm text-red-400 mt-1">{returnNm.toFixed(1)} NM away</p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleVoiceAlert}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition"
        >
          🔊 Play Voice Alert ({captain.language.toUpperCase()})
        </button>
        <a
          href="tel:1551"
          className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition"
        >
          <Phone className="w-5 h-5" /> Call Coast Guard (1551)
        </a>
        <button
          onClick={onDismiss}
          className="w-full text-red-500 text-sm font-semibold py-2 underline underline-offset-4"
        >
          ⚠ Override (Conditions Improved) — Return to HUD
        </button>
      </div>
    </div>
  );
};
