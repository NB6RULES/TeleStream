import React, { useEffect, useState } from 'react';

export const DebugOverlay: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const handleLog = (e: any) => {
      setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${e.detail}`].slice(-20));
    };
    window.addEventListener('DEBUG_LOG', handleLog);
    return () => window.removeEventListener('DEBUG_LOG', handleLog);
  }, []);

  if (logs.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      left: 10,
      width: '400px',
      maxHeight: '300px',
      overflowY: 'auto',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: '#0f0',
      fontFamily: 'monospace',
      fontSize: '12px',
      padding: '10px',
      zIndex: 9999,
      borderRadius: '8px',
      pointerEvents: 'none'
    }}>
      {logs.map((log, i) => <div key={i}>{log}</div>)}
    </div>
  );
};
