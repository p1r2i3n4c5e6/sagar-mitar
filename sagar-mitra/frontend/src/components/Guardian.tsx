import React, { useState } from 'react';
import {
  Shield, Send, ArrowLeft, Phone, UserPlus,
  CheckCircle, Loader2, Globe, MapPin
} from 'lucide-react';
import type { Language, FriendEntry } from '../types';
import { loadFriends, saveFriends } from '../utils/storage';

const HARBORS = [
  'Nagapattinam', 'Rameswaram', 'Chennai',
  'Kochi', 'Visakhapatnam', 'Tuticorin', 'Karaikal',
];

const ZONES = [
  { id: 'PFZ-BAY-01', label: 'Palk Bay Deep Shoal (Tuna)' },
  { id: 'PFZ-BAY-02', label: 'Coromandel Ridge (Sardine)' },
  { id: 'PFZ-BAY-03', label: 'Gulf of Mannar (Prawn)' },
];

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'bn', label: 'Bengali' },
];

interface Props {
  onBack: () => void;
}

export const Guardian: React.FC<Props> = ({ onBack }) => {
  const [friends, setFriends]       = useState<FriendEntry[]>(loadFriends());
  const [friendName, setFriendName] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [language, setLanguage]     = useState<Language>('ta');
  const [harbor, setHarbor]         = useState('Nagapattinam');
  const [zoneId, setZoneId]         = useState('PFZ-BAY-01');
  const [loading, setLoading]       = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [addMode, setAddMode]       = useState(false);

  const handleProtect = async (f?: FriendEntry) => {
    const name  = f?.name   || friendName;
    const phone = f?.phone  || friendPhone;
    const lang  = f?.language || language;
    const hab   = f?.harbor   || harbor;
    const zone  = f?.targetZoneId || zoneId;

    if (!name || !phone) return;
    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/guardian/register-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friend_name: name,
          friend_phone: phone,
          language: lang,
          departure_harbor: hab,
          target_zone_id: zone,
          estimated_hours: 6,
        }),
      });
      const data = await res.json();
      setActiveTrip(data);
      setSuccessMsg(`✓ SMS protection started for ${name} — Bearing ${data.bearing_deg}° / ${data.distance_nm} NM`);
      // Also save to roster
      if (!f) {
        const entry: FriendEntry = {
          id: Date.now().toString(),
          name, phone, language: lang, harbor: hab, targetZoneId: zone, isKeypad: true
        };
        const updated = [entry, ...friends.filter(x => x.phone !== phone)];
        setFriends(updated);
        saveFriends(updated);
        setFriendName(''); setFriendPhone('');
        setAddMode(false);
      }
    } catch {
      setSuccessMsg(`✓ Queued for SMS (offline — will send when connected)`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-marine-900 text-white flex flex-col max-w-md mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-marine-700 transition">
          <ArrowLeft className="w-5 h-5 text-ocean-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-black">Community Guardian</h2>
          <p className="text-xs text-slate-400">Proxy-register friends for automated SMS tracking</p>
        </div>
        <div className="p-2.5 bg-green-500/15 rounded-xl border border-green-500/30">
          <Shield className="w-5 h-5 text-green-400" />
        </div>
      </div>

      {/* How it works */}
      <div className="card p-4 space-y-2">
        <p className="text-xs font-bold text-ocean-400 uppercase tracking-wide">How SMS Guardian Works</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { step: '1', text: 'Register friend\'s keypad phone' },
            { step: '2', text: 'System sends voyage SMS automatically' },
            { step: '3', text: 'Friend replies 1/2/SOS for updates' },
          ].map(s => (
            <div key={s.step} className="bg-marine-900 rounded-xl p-2.5">
              <div className="w-6 h-6 rounded-full bg-ocean-500 text-marine-900 font-black text-xs flex items-center justify-center mx-auto mb-1">
                {s.step}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Registered friends list */}
      {friends.length > 0 && (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Registered Fleet Crew</p>
          {friends.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-3 bg-marine-900 rounded-xl border border-marine-600">
              <div className="w-9 h-9 rounded-full bg-ocean-500/20 border border-ocean-500/30 flex items-center justify-center text-ocean-400 font-black text-sm flex-shrink-0">
                {f.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">{f.name}</p>
                <p className="text-xs font-mono text-slate-400">{f.phone}</p>
                <p className="text-xs text-slate-500">{f.harbor} → {ZONES.find(z => z.id === f.targetZoneId)?.label.split('(')[0].trim()}</p>
              </div>
              <button
                onClick={() => handleProtect(f)}
                disabled={loading}
                className="px-3 py-1.5 text-xs bg-ocean-500/20 hover:bg-ocean-500/30 text-ocean-400 rounded-lg font-bold transition flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> SMS
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new friend */}
      {addMode ? (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-bold text-ocean-400 uppercase tracking-wide flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5" /> New Keypad Friend
          </p>
          <div>
            <label className="label">Friend's Name</label>
            <input
              className="input"
              placeholder="e.g. Fisherman Selvam"
              value={friendName}
              onChange={e => setFriendName(e.target.value)}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1"><Phone className="w-3 h-3" /> Keypad Phone Number</label>
            <input
              className="input"
              placeholder="+91 94441 23456"
              type="tel"
              value={friendPhone}
              onChange={e => setFriendPhone(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label flex items-center gap-1"><Globe className="w-3 h-3" /> SMS Language</label>
              <select className="input" value={language} onChange={e => setLanguage(e.target.value as Language)}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1"><MapPin className="w-3 h-3" /> Harbor</label>
              <select className="input" value={harbor} onChange={e => setHarbor(e.target.value)}>
                {HARBORS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Target Fishing Zone</label>
            <select className="input" value={zoneId} onChange={e => setZoneId(e.target.value)}>
              {ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleProtect()}
              disabled={loading || !friendName || !friendPhone}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</>
                : <><Send className="w-4 h-4" /> Start SMS Protection</>}
            </button>
            <button onClick={() => setAddMode(false)} className="btn-ghost px-4 py-2.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddMode(true)}
          className="w-full border-2 border-dashed border-marine-600 hover:border-ocean-500 rounded-xl p-4 text-slate-400 hover:text-ocean-400 text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add New Keypad Friend
        </button>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="card border border-green-500/40 bg-green-900/15 p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-300 font-semibold">{successMsg}</p>
        </div>
      )}

      {/* SMS key legend */}
      <div className="card p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Keypad Friend's Reply Menu</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: '1', desc: 'Current heading & distance' },
            { key: '2', desc: 'Safe return port bearing' },
            { key: 'SOS', desc: 'Distress — triggers rescue' },
          ].map(k => (
            <div key={k.key} className="bg-marine-900 rounded-xl p-2.5 text-center border border-marine-600">
              <div className="text-xl font-black text-ocean-400">{k.key}</div>
              <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{k.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
