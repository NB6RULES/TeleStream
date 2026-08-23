import React, { useEffect, useState } from 'react';
import { X, Network } from 'lucide-react';

interface NetworkStatusOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  totalSize: number;
}

export const NetworkStatusOverlay: React.FC<NetworkStatusOverlayProps> = ({ isOpen, onClose, totalSize }) => {
  const [stats, setStats] = useState({ speed: 0, downloaded: 0 });

  useEffect(() => {
    const handleStats = (e: any) => {
      setStats(e.detail);
    };
    window.addEventListener('STREAM_STATS', handleStats);
    return () => window.removeEventListener('STREAM_STATS', handleStats);
  }, []);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  const percentage = totalSize > 0 ? ((stats.downloaded / totalSize) * 100).toFixed(2) : '0.00';

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0F111A] text-white p-6 rounded-2xl shadow-2xl z-50 min-w-[280px] border border-white/10">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>

      <div className="flex flex-col items-center justify-center mb-6 mt-2">
        <Network size={48} className="text-white mb-4" />
        <h3 className="text-xl font-semibold">Network status</h3>
      </div>

      <div className="space-y-1 text-gray-300 font-medium text-sm">
        <div className="flex justify-between">
          <span>Stream speed:</span>
          <span className="text-white">{formatBytes(stats.speed)}/s</span>
        </div>
        <div className="flex justify-between">
          <span>Buffered:</span>
          <span className="text-white">{formatBytes(stats.downloaded)} / {percentage}%</span>
        </div>
      </div>
    </div>
  );
};
