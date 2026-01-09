
import React, { useEffect, useState } from 'react';
import { AlertCircle, XCircle, Info } from 'lucide-react';

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
}

interface AlertOverlayProps {
  alerts: Alert[];
  onRemove: (id: string) => void;
}

const AlertOverlay: React.FC<AlertOverlayProps> = ({ alerts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className={`pointer-events-auto p-4 rounded-lg shadow-2xl flex items-start gap-3 min-w-[300px] max-w-md animate-slide-in
            ${alert.type === 'error' ? 'bg-red-900/90 border border-red-500' : 
              alert.type === 'warning' ? 'bg-yellow-900/90 border border-yellow-500' : 
              'bg-blue-900/90 border border-blue-500'}
          `}
        >
          {alert.type === 'error' ? <XCircle className="text-red-400 shrink-0" /> : 
           alert.type === 'warning' ? <AlertCircle className="text-yellow-400 shrink-0" /> : 
           <Info className="text-blue-400 shrink-0" />}
          
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{alert.message}</p>
          </div>
          
          <button 
            onClick={() => onRemove(alert.id)}
            className="text-white/50 hover:text-white transition-colors"
          >
            <XCircle size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AlertOverlay;
