import React from 'react';
import { useBoard } from '@/contexts/board-context';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

export function RealtimeStatus() {
  const { realtimeStatus } = useBoard();

  // Determine color and icon based on status
  const getStatusInfo = () => {
    switch (realtimeStatus) {
      case 'CONNECTED':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          icon: <Wifi className="h-4 w-4" />,
          label: 'Connected'
        };
      case 'CONNECTING':
        return {
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          icon: <Wifi className="h-4 w-4 animate-pulse" />,
          label: 'Connecting'
        };
      case 'ERROR':
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          icon: <WifiOff className="h-4 w-4" />,
          label: 'Error'
        };
      case 'DISCONNECTED':
      default:
        return {
          color: 'text-slate-500',
          bgColor: 'bg-slate-100',
          icon: <WifiOff className="h-4 w-4" />,
          label: 'Disconnected'
        };
    }
  };

  const { color, bgColor, icon, label } = getStatusInfo();

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        bgColor, color
      )}
      title="Realtime connection status"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}