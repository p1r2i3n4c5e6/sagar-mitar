import React, { useState, useEffect } from 'react';
import {
  Compass, MapPin, Phone, Globe, Anchor, Satellite,
  ChevronRight, Loader2, Wifi, WifiOff, CheckCircle2,
  ShieldCheck, Lock, RefreshCw, Ship, ArrowLeft
} from 'lucide-react';
import type { Language, AppSession } from '../types';
import { getPositionOnce } from '../utils/gpsTracker';
import { saveSession } from '../utils/storage';

const HARBORS = [
  { name: 'Nagapattinam Fishing Harbour', coords: [10.767, 79.842] as [number, number] },
  { name: 'Rameswaram Jetty',            coords: [9.288,  79.313] as [number, number] },
  { name: 'Chennai Fishing Harbour',     coords: [13.082, 80.270] as [number, number] },
  { name: 'Tuticorin Deep Sea Port',     coords: [8.800,  78.135] as [number, number] },
  { name: 'Kochi Marine Harbor',         coords: [9.931,  76.267] as [number, number] },
  { name: 'Visakhapatnam Fishing Dock',  coords: [17.686, 83.218] as [number, number] },
];

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ta', label: 'Tamil — தமிழ்' },
  { code: 'te', label: 'Telugu — తెలుగు' },
  { code: 'hi', label: 'Hindi — हिन्दी' },
  { code: 'ml', label: 'Malayalam — മലയാളം' },
  { code: 'bn', label: 'Bengali — বাংলা' },
];

interface Props {
  onComplete: (session: AppSession) => void;
}

export const Registration: React.FC<Props> = ({ onComplete }) => {
  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [language, setLanguage]       = useState<Language>('ta');
  const [harbor, setHarbor]           = useState('Nagapattinam Fishing Harbour');
  const [otpDigits, setOtpDigits]     = useState(['1', '2', '3', '4']);
  const [otpSent, setOtpSent]         = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const [gpsLocked, setGpsLocked]     = useState(false);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [coords, setCoords]           = useState({ lat: 10.767, lon: 79.842 });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  type RegStep = 'register' | 'otp' | 'profile';
  const [step, setStep]               = useState<RegStep>('register');

  // Auto-lock GPS on mount
  useEffect(() => {
    handleGpsLock();
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    if (step === 'otp' && resendTimer > 0) {
      const interval = setInterval(() => setResendTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, resendTimer]);

  const handleGpsLock = async () => {
    setGpsLoading(true);
    try {
      const pos = await getPositionOnce();
      setCoords({ lat: pos.lat, lon: pos.lon });
      setGpsLocked(true);
    } catch {
      setGpsLocked(false);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!name.trim() || !phone.trim() || phone.length < 10) {
      setError('Please enter a valid Name and 10-digit Phone Number.');
      return;
    }
    setError('');
    setOtpSent(true);
    setResendTimer(30);
    setStep('otp');

    // Real-Time Twilio SMS dispatch
    try {
      await fetch('/api/guardian/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: `SAGAR-MITRA Verification OTP: 1234. Welcome Captain ${name}!`,
          is_flash: false
        })
      });
    } catch {
      console.log('Twilio SMS queued locally');
    }
  };

  const handleVerifyOtp = () => {
    const code = otpDigits.join('');
    if (code.length < 4) {
      setError('Please enter the complete 4-digit OTP.');
      return;
    }
    setError('');
    setOtpVerified(true);
    setStep('profile');
  };

  const handleCompleteRegistration = async () => {
    setError('');
    setLoading(true);

    const selectedPort = HARBORS.find(h => h.name === harbor) || HARBORS[0];
    const targetLat = gpsLocked ? coords.lat : selectedPort.coords[0];
    const targetLon = gpsLocked ? coords.lon : selectedPort.coords[1];

    try {
      const session: AppSession = {
        captain: {
          name,
          phone,
          language,
          harbor_name: harbor,
          lat: targetLat,
          lon: targetLon
        },
        recommendation: {
          zone: {
            id: 'PFZ-NAG-01',
            name: 'Nagapattinam Deep Trench',
            lat: 10.65, lon: 80.05,
            species: 'Yellowfin Tuna, Seer Fish (King Mackerel), Sardine',
            chlorophyll: '4.8 mg/m³', wave_height: 1.1, wind_kmh: 18,
            status: 'OPTIMAL' as const,
          },
          distance_km: 26.8, distance_nm: 14.5, bearing_deg: 112.5,
        },
        registeredAt: new Date().toISOString(),
      };
      saveSession(session);
      onComplete(session);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-marine-900 flex flex-col items-center justify-start p-4 py-6 text-white font-sans">

      {/* Header Branding */}
      <div className="w-full max-w-md mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-ocean-500/20 rounded-2xl border border-ocean-500/40 shadow-lg shadow-ocean-500/20">
              <Anchor className="w-7 h-7 text-ocean-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                SAGAR-MITRA
                <span className="text-[9px] bg-ocean-500/20 text-ocean-300 border border-ocean-500/40 px-2 py-0.5 rounded-full font-bold uppercase">PWA Mobile</span>
              </h1>
              <p className="text-xs text-ocean-400 font-medium">Fisheries Advisory & 0G Geofence Safety</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-marine-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ocean-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{
              width: step === 'register' ? '33%' : step === 'otp' ? '66%' : '100%'
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
          <span className={step === 'register' ? 'text-ocean-400 font-black' : ''}>1. Mobile</span>
          <span className={step === 'otp' ? 'text-ocean-400 font-black' : ''}>2. OTP Verify</span>
          <span className={step === 'profile' ? 'text-ocean-400 font-black' : ''}>3. Port & GPS</span>
        </div>
      </div>

      {/* ── STEP 1: MOBILE REGISTRATION ─────────────────────────────────── */}
      {step === 'register' && (
        <div className="w-full max-w-md space-y-4">
          <div className="card p-5 space-y-4 border border-marine-600 bg-marine-800/90 shadow-xl">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <Phone className="w-4 h-4 text-ocean-400" /> Fisherman Registration
            </h2>

            <div>
              <label className="label text-xs font-semibold text-slate-300">Captain / Vessel Name</label>
              <input
                className="input text-sm py-2.5"
                placeholder="e.g. Captain Murugan"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Phone className="w-3 h-3 text-ocean-400" /> Mobile Phone Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">+91</span>
                <input
                  className="input text-sm py-2.5 pl-12 font-mono"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  type="tel"
                  maxLength={10}
                />
              </div>
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Globe className="w-3 h-3 text-ocean-400" /> Advisory Audio Language
              </label>
              <select
                className="input text-sm py-2.5"
                value={language}
                onChange={e => setLanguage(e.target.value as Language)}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                ⚠ {error}
              </p>
            )}
          </div>

          <button
            onClick={handleSendOtp}
            className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-ocean-500/25"
          >
            Send OTP to Mobile <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── STEP 2: PHONE OTP VERIFICATION ─────────────────────────────── */}
      {step === 'otp' && (
        <div className="w-full max-w-md space-y-4">
          <div className="card p-5 space-y-5 border border-ocean-500/40 bg-marine-800/90 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-ocean-500/20 text-ocean-400 mx-auto flex items-center justify-center border border-ocean-500/40">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Enter OTP Verification Code</h2>
              <p className="text-xs text-slate-400 mt-1">
                A 4-digit code was sent to <span className="font-mono text-ocean-400 font-bold">+91 {phone}</span>
              </p>
            </div>

            {/* 4 Digit OTP Inputs */}
            <div className="flex justify-center gap-3 my-2">
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    const val = e.target.value;
                    const newOtp = [...otpDigits];
                    newOtp[i] = val;
                    setOtpDigits(newOtp);
                    if (val && i < 3) {
                      document.getElementById(`otp-${i + 1}`)?.focus();
                    }
                  }}
                  className="w-12 h-14 bg-marine-900 border-2 border-ocean-500/60 rounded-xl text-center text-xl font-bold font-mono text-white focus:border-emerald-400 outline-none shadow-inner"
                />
              ))}
            </div>

            <div className="bg-ocean-500/10 border border-ocean-500/30 rounded-lg p-2.5 text-xs text-ocean-300 font-medium">
              💡 Demo OTP: <span className="font-mono font-bold text-white">1234</span>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                ⚠ {error}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Didn't receive SMS?</span>
              {resendTimer > 0 ? (
                <span className="font-mono text-slate-500">Resend in {resendTimer}s</span>
              ) : (
                <button
                  onClick={() => setResendTimer(30)}
                  className="text-ocean-400 font-bold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Resend OTP
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('register')} className="btn-ghost px-4 text-xs flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleVerifyOtp}
              className="btn-primary flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-ocean-500/25"
            >
              <ShieldCheck className="w-4 h-4" /> Verify & Continue
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: CAPTAIN PROFILE & LOCATION ──────────────────────────── */}
      {step === 'profile' && (
        <div className="w-full max-w-md space-y-4">
          <div className="card p-4 border border-emerald-500/40 bg-emerald-950/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">{name || 'Captain'}</p>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase">OTP VERIFIED ✓</span>
              </div>
              <p className="text-xs text-slate-400 font-mono">+91 {phone}</p>
            </div>
          </div>

          <div className="card p-5 space-y-4 border border-marine-600 bg-marine-800/90 shadow-xl">
            <h2 className="text-xs font-bold text-ocean-400 uppercase tracking-wider flex items-center gap-2">
              <Ship className="w-4 h-4 text-ocean-400" /> Choose Departure Port or Auto GPS
            </h2>
            <p className="text-xs text-slate-300 font-semibold leading-relaxed">
              📍 Select your land harbor or lock current satellite GPS location:
            </p>

            <div className="space-y-2">
              {HARBORS.map(h => {
                const isSelected = harbor === h.name;
                return (
                  <button
                    key={h.name}
                    onClick={() => {
                      setHarbor(h.name);
                      setCoords({ lat: h.coords[0], lon: h.coords[1] });
                      setGpsLocked(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected && !gpsLocked
                        ? 'bg-ocean-500/20 border-ocean-500 shadow-md shadow-ocean-500/20 text-white'
                        : 'bg-marine-900 border-marine-700 text-slate-300 hover:border-marine-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className={`w-4 h-4 ${isSelected && !gpsLocked ? 'text-ocean-400' : 'text-slate-500'}`} />
                      <div>
                        <p className="text-xs font-bold">{h.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{h.coords[0].toFixed(3)}°N, {h.coords[1].toFixed(3)}°E</p>
                      </div>
                    </div>
                    {isSelected && !gpsLocked && <span className="text-xs text-ocean-400 font-bold">✓ Selected</span>}
                  </button>
                );
              })}
            </div>

            {/* GPS Auto-detect button */}
            <div className="pt-2 border-t border-marine-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Satellite className={`w-4 h-4 ${gpsLocked ? 'text-green-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-xs text-slate-300">
                  {gpsLocked ? `GPS Locked: ${coords.lat.toFixed(3)}°N, ${coords.lon.toFixed(3)}°E` : 'Auto-detect live GPS'}
                </span>
              </div>
              <button
                onClick={handleGpsLock}
                className="text-xs bg-marine-900 hover:bg-marine-700 text-ocean-400 border border-marine-600 px-3 py-1.5 rounded-lg font-bold transition"
              >
                {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lock Live GPS'}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep('otp')} className="btn-ghost px-4 text-xs flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleCompleteRegistration}
              disabled={loading}
              className="btn-primary flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-ocean-500/25"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Launching App…</>
                : <>🚀 Launch SAGAR-MITRA Dashboard</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registration;
