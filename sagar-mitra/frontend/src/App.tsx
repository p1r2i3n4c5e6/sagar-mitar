import React, { useState, useEffect } from 'react';
import { Registration }    from './components/Registration';
import { CompassHUD }      from './components/CompassHUD';
import { SMSConsole }      from './components/SMSConsole';
import { WeatherAlert }    from './components/WeatherAlert';
import { FishingMapApp }   from './components/FishingMapApp';
import type { AppSession, AppView } from './types';
import { loadSession, clearSession } from './utils/storage';

export const App: React.FC = () => {
  const [session, setSession]   = useState<AppSession | null>(null);
  const [view, setView]         = useState<AppView>('REGISTER');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Restore persisted session
  useEffect(() => {
    const saved = loadSession();
    if (saved) { setSession(saved); setView('HUD'); }
  }, []);

  // Online/offline listener
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handleRegistrationComplete = (s: AppSession) => {
    setSession(s);
    setView('HUD');
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setView('REGISTER');
  };

  return (
    <div className="bg-marine-900 min-h-screen relative font-sans">

      {/* ── Online / Offline badge (hidden on map & weather views) ── */}
      {view !== 'MAP' && view !== 'WEATHER' && (
        <div className={`fixed top-2 right-2 z-50 text-[10px] font-bold px-2 py-1 rounded-full transition-all pointer-events-none ${
          isOnline
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {isOnline ? '● ONLINE' : '● OFFLINE'}
        </div>
      )}

      {/* ── Logout / Captain badge ── */}
      {session && view !== 'WEATHER' && view !== 'MAP' && (
        <button
          onClick={handleLogout}
          className="fixed top-2 left-2 z-50 text-[10px] text-slate-500 hover:text-slate-300 font-bold px-2 py-1 rounded-full border border-marine-600 bg-marine-800/80 backdrop-blur transition"
        >
          ⚓ {session.captain.name.split(' ')[0]}
        </button>
      )}

      {/* ── VIEW ROUTER ── */}
      {view === 'REGISTER' && (
        <Registration onComplete={handleRegistrationComplete} />
      )}

      {view === 'HUD' && session && (
        <>
          <CompassHUD
            session={session}
            onOpenMap={()     => setView('MAP')}
            onWeatherLockout={() => setView('WEATHER')}
          />
          <SMSConsole />
        </>
      )}

      {view === 'MAP' && session && (
        <FishingMapApp
          session={session}
          onBack={() => setView('HUD')}
        />
      )}

      {view === 'WEATHER' && session && (
        <WeatherAlert
          session={session}
          onDismiss={() => setView('HUD')}
        />
      )}
    </div>
  );
};

export default App;
