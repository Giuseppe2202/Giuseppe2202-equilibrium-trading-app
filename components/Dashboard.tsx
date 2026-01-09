
import React from 'react';
import { PlusCircle, History, MessageSquare, User, Activity } from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const cards = [
    { id: 'new-trade', title: 'Nuevo Trade', icon: PlusCircle, color: 'text-cyan', bg: 'bg-cyan/10', border: 'border-cyan/20' },
    { id: 'history', title: 'Historial y Análisis', icon: History, icon2: Activity, color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/20' },
    { id: 'coach', title: 'Coach AI', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { id: 'profile', title: 'Mi Perfil', icon: User, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' },
  ];

  return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center gap-8 max-w-5xl mx-auto">
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          <span className="text-white">Equilibrium</span> <span className="text-blue-500">Trading Coach</span>
        </h1>
        <p className="text-slate-400 font-mono tracking-[0.2em] text-[10px] uppercase">
          OPERATING SYSTEM // ELITE ACADEMY
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full h-full">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => onNavigate(card.id)}
            className={`group relative flex flex-col items-center justify-center p-12 h-64 rounded-2xl border ${card.border} ${card.bg} hover:bg-opacity-20 hover:scale-[1.02] transition-all duration-300 overflow-hidden`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
              {card.icon2 && <card.icon2 size={80} />}
            </div>
            
            <card.icon className={`${card.color} mb-4 group-hover:scale-110 transition-transform`} size={40} />
            <span className={`text-xl font-semibold ${card.color}`}>{card.title}</span>
            <div className={`mt-3 h-0.5 w-8 bg-current ${card.color} rounded-full opacity-30 group-hover:w-16 transition-all`}></div>
          </button>
        ))}
      </div>
      
      <div className="mt-12 text-[10px] font-mono text-slate-500 flex items-center gap-4">
        <span>SISTEMA: ESTABLE</span>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        <span>LATENCIA: 12ms</span>
      </div>
    </div>
  );
};

export default Dashboard;
