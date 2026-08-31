import React, { useEffect, useState } from 'react';
import { Radio, Terminal, AlertTriangle } from 'lucide-react';
import type { SMSLog } from '../types';

export const SMSConsole: React.FC = () => {
  const [logs, setLogs] = useState<SMSLog[]>([]);

  useEffect(() => {
    const fetch_logs = async () => {
      try {
        const res = await fetch('/api/guardian/logs');
        const data: SMSLog[] = await res.json();
        setLogs(data);
      } catch { /* offline */ }
    };

    fetch_logs();
    const id = setInterval(fetch_logs, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-black/90 backdrop-blur rounded-2xl border border-green-500/25 mx-4 my-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-green-900/60">
        <Radio className="w-3.5 h-3.5 text-green-400 animate-pulse" />
        <span className="text-[11px] font-bold text-green-400 font-mono tracking-wider uppercase">
          Telecom SMS Dispatch Terminal
        </span>
        <span className="ml-auto text-[9px] text-slate-600 font-mono">↻ 2.5s</span>
      </div>

      {/* Log stream */}
      <div className="max-h-44 overflow-y-auto p-3 space-y-2 font-mono">
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-700 text-xs py-2">
            <Terminal className="w-4 h-4" />
            <span>Waiting for voyage pings… Start a guardian trip above.</span>
          </div>
        ) : (
          logs.map((log, idx) => (
            <LogEntry key={idx} log={log} />
          ))
        )}
      </div>
    </div>
  );
};

const LogEntry: React.FC<{ log: SMSLog }> = ({ log }) => {
  const time = log.timestamp
    ? new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  if (log.is_flash) {
    return (
      <div className="rounded-lg border border-red-500/60 bg-red-950/30 p-2.5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">FLASH CLASS-0 ▸ {log.to}</span>
          <span className="ml-auto text-[10px] text-slate-600">{time}</span>
        </div>
        <p className="text-[11px] text-red-300 leading-snug">{log.message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-900/50 bg-slate-900/80 p-2.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-green-600 font-bold">SMS ▸</span>
        <span className="text-[10px] text-green-400 font-mono">{log.to}</span>
        <span className="ml-auto text-[10px] text-slate-600">{time}</span>
      </div>
      <p className="text-[11px] text-green-300 leading-snug">{log.message}</p>
      <span className="text-[9px] text-slate-600">{log.status}</span>
    </div>
  );
};
