
import React, { useState } from 'react';
import { UserProfile, Account, MarketType, TraderStyleType } from '../types';
import { MARKETS, TRADER_STYLES, STRENGTHS_POOL, WEAKNESSES_POOL } from '../constants';
import { ChevronRight, ChevronLeft, Save, Plus, X, Trash2, Edit2, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  initialProfile?: UserProfile;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, initialProfile }) => {
  const [step, setStep] = useState(1);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<Partial<UserProfile>>(initialProfile || {
    name: '',
    traderStyle: 'DayTrader',
    secondaryStyles: [],
    primaryMarkets: [],
    secondaryMarkets: [],
    accounts: [],
    strengths: [],
    weaknesses: [],
    setupsByAccount: {}
  });

  const [tempAccount, setTempAccount] = useState<Partial<Account>>({
    name: '',
    currency: 'USD',
    startingCapital: 1000,
    currentCapital: 1000,
    markets: []
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const toggleMarketInAccount = (m: MarketType) => {
    const current = tempAccount.markets || [];
    if (current.includes(m)) {
      setTempAccount({ ...tempAccount, markets: current.filter(item => item !== m) });
    } else {
      setTempAccount({ ...tempAccount, markets: [...current, m] });
    }
  };

  const toggleMarket = (m: MarketType, list: 'primary' | 'secondary') => {
    const key = list === 'primary' ? 'primaryMarkets' : 'secondaryMarkets';
    const current = profile[key] || [];
    if (current.includes(m)) {
      setProfile({ ...profile, [key]: current.filter(item => item !== m) });
    } else {
      if (list === 'primary' && current.length >= 2) return;
      if (list === 'secondary' && current.length >= 1) return;
      setProfile({ ...profile, [key]: [...current, m] });
    }
  };

  const setPrimaryStyle = (style: TraderStyleType) => {
    const newSecondary = (profile.secondaryStyles || []).filter(s => s !== style);
    setProfile({ ...profile, traderStyle: style, secondaryStyles: newSecondary });
  };

  const toggleSecondaryStyle = (style: TraderStyleType) => {
    if (profile.traderStyle === style) return;
    const current = profile.secondaryStyles || [];
    if (current.includes(style)) {
      setProfile({ ...profile, secondaryStyles: current.filter(s => s !== style) });
    } else {
      if (current.length >= 2) return;
      setProfile({ ...profile, secondaryStyles: [...current, style] });
    }
  };

  const toggleTag = (tag: string, list: 'strengths' | 'weaknesses') => {
    const key = list === 'strengths' ? 'strengths' : 'weaknesses';
    const current = profile[key] || [];
    if (current.includes(tag)) {
      setProfile({ ...profile, [key]: current.filter(item => item !== tag) });
    } else {
      setProfile({ ...profile, [key]: [...current, tag] });
    }
  };

  const addOrUpdateAccount = () => {
    if (!tempAccount.name || (tempAccount.markets?.length === 0)) return;

    if (editingAccountId) {
      const updatedAccounts = (profile.accounts || []).map(acc => 
        acc.id === editingAccountId ? { ...tempAccount, id: editingAccountId } as Account : acc
      );
      setProfile({ ...profile, accounts: updatedAccounts });
      setEditingAccountId(null);
    } else {
      const id = crypto.randomUUID();
      const newAccount: Account = {
        ...(tempAccount as Account),
        id,
      };
      setProfile({
        ...profile,
        accounts: [...(profile.accounts || []), newAccount]
      });
    }
    
    // Reset form
    setTempAccount({
      name: '',
      currency: 'USD',
      startingCapital: 1000,
      currentCapital: 1000,
      markets: []
    });
  };

  const removeAccount = (id: string) => {
    setProfile({
      ...profile,
      accounts: (profile.accounts || []).filter(acc => acc.id !== id)
    });
  };

  const startEditAccount = (acc: Account) => {
    setTempAccount(acc);
    setEditingAccountId(acc.id);
  };

  const isEditing = !!initialProfile;

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 text-slate-200">
      <div className="mb-8 text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-white">Equilibrium</span> <span className="text-blue-500">Trading Coach</span>
        </h1>
      </div>

      <div className="w-full max-w-xl bg-navy-light cyber-border rounded-2xl p-8 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-navy-accent">
          <div 
            className="h-full bg-cyan transition-all duration-500" 
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white">Perfil del trader</h2>
            <div className="space-y-6">
              <label className="block">
                <span className="text-xs font-mono text-slate-400 uppercase">Nombre / Alias</span>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={e => setProfile({...profile, name: e.target.value})}
                  className="w-full mt-2 bg-navy border border-navy-accent rounded-lg p-3 text-white focus:border-cyan outline-none transition-all text-sm"
                  placeholder="Ej: AlphaTrader"
                />
              </label>
              
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase mb-2 block">Estrategia Principal (1)</span>
                <div className="grid grid-cols-2 gap-2">
                  {TRADER_STYLES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPrimaryStyle(s as TraderStyleType)}
                      className={`p-2 rounded-lg border text-xs font-semibold transition-all ${profile.traderStyle === s ? 'bg-cyan border-cyan text-navy' : 'border-navy-accent text-slate-400 hover:border-cyan/50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 uppercase mb-2 block">Estrategias Secundarias (Opcional, Máx 2)</span>
                <div className="grid grid-cols-3 gap-2">
                  {TRADER_STYLES.map(s => (
                    <button
                      key={s}
                      type="button"
                      disabled={profile.traderStyle === s}
                      onClick={() => toggleSecondaryStyle(s as TraderStyleType)}
                      className={`p-2 rounded-lg border text-[10px] font-semibold transition-all disabled:opacity-20 ${profile.secondaryStyles?.includes(s as TraderStyleType) ? 'bg-gold border-gold text-navy' : 'border-navy-accent text-slate-400 hover:border-gold/50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button 
              disabled={!profile.name || !profile.traderStyle}
              onClick={nextStep} 
              className="w-full py-4 bg-cyan text-navy font-bold rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              SIGUIENTE <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white">Zona de Combate</h2>
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase mb-2 block">Mercados Principales (Máx 2)</span>
              <div className="grid grid-cols-2 gap-3">
                {MARKETS.map(m => (
                  <button
                    key={m}
                    onClick={() => toggleMarket(m, 'primary')}
                    className={`p-3 rounded-lg border text-sm font-semibold transition-all ${profile.primaryMarkets?.includes(m) ? 'bg-cyan border-cyan text-navy' : 'border-navy-accent text-slate-400 hover:border-cyan/50'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase mb-2 block">Mercado Secundario (Máx 1)</span>
              <div className="grid grid-cols-2 gap-3">
                {MARKETS.map(m => (
                  <button
                    key={m}
                    onClick={() => toggleMarket(m, 'secondary')}
                    disabled={profile.primaryMarkets?.includes(m)}
                    className={`p-3 rounded-lg border text-sm font-semibold transition-all disabled:opacity-20 ${profile.secondaryMarkets?.includes(m) ? 'bg-gold border-gold text-navy' : 'border-navy-accent text-slate-400 hover:border-gold/50'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={prevStep} className="flex-1 py-4 bg-navy-accent text-slate-300 rounded-lg text-sm font-semibold hover:bg-navy-accent/80 transition-all uppercase">ATRÁS</button>
              <button 
                onClick={nextStep} 
                disabled={profile.primaryMarkets?.length === 0}
                className="flex-[2] py-4 bg-cyan text-navy font-bold rounded-lg text-sm disabled:opacity-50 hover:brightness-110 transition-all"
              >
                SIGUIENTE
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white">Gestión de Cuentas</h2>
            
            {/* Formulario de Cuenta */}
            <div className="space-y-4 bg-navy-accent/10 p-5 rounded-xl border border-navy-accent/30">
              <div className="flex justify-between items-center mb-1">
                 <h3 className="text-xs font-mono text-slate-400 uppercase tracking-widest">{editingAccountId ? 'Editando Cuenta' : 'Configurar Nueva Cuenta'}</h3>
                 {editingAccountId && (
                   <button onClick={() => { setEditingAccountId(null); setTempAccount({name:'', markets:[], currency:'USD', startingCapital:1000, currentCapital:1000}); }} className="text-[10px] text-red-400 hover:underline uppercase">Cancelar edición</button>
                 )}
              </div>
              
              <input 
                type="text" 
                placeholder="Nombre de Cuenta (ej: Personal, Fondos...)" 
                className="w-full bg-navy border border-navy-accent rounded-lg p-3 text-white text-sm focus:border-gold outline-none transition-all"
                value={tempAccount.name}
                onChange={e => setTempAccount({...tempAccount, name: e.target.value})}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] text-slate-500 uppercase ml-1">Capital Inicial</span>
                  <input 
                    type="number" 
                    className="w-full mt-1 bg-navy border border-navy-accent rounded-lg p-3 text-white text-sm focus:border-gold outline-none"
                    value={tempAccount.startingCapital}
                    onChange={e => setTempAccount({...tempAccount, startingCapital: Number(e.target.value), currentCapital: Number(e.target.value)})}
                  />
                </label>
                <label className="block">
                   <span className="text-[10px] text-slate-500 uppercase ml-1">Moneda Base</span>
                   <select 
                    className="w-full mt-1 bg-navy border border-navy-accent rounded-lg p-3 text-white text-sm outline-none"
                    value={tempAccount.currency}
                    onChange={e => setTempAccount({...tempAccount, currency: e.target.value})}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="BTC">BTC</option>
                  </select>
                </label>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase ml-1 mb-2 block">Mercados Operados en esta cuenta</span>
                <div className="flex flex-wrap gap-1.5">
                  {MARKETS.map(m => (
                    <button
                      key={m}
                      onClick={() => toggleMarketInAccount(m)}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${tempAccount.markets?.includes(m) ? 'bg-gold text-navy border-gold' : 'bg-navy border-navy-accent text-slate-500'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={addOrUpdateAccount} 
                disabled={!tempAccount.name || !tempAccount.markets?.length}
                className={`w-full py-4 ${editingAccountId ? 'bg-cyan text-navy' : 'bg-gold/10 border border-gold/40 text-gold'} font-bold rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 text-xs uppercase disabled:opacity-30`}
              >
                {editingAccountId ? <Save size={16}/> : <Plus size={16}/>}
                {editingAccountId ? 'ACTUALIZAR DATOS' : 'AGREGAR CUENTA'}
              </button>
            </div>

            {/* Listado de Cuentas */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-1">Cuentas Agregadas ({profile.accounts?.length || 0})</span>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {profile.accounts?.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-4 bg-navy-accent/5 border border-navy-accent rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white italic">{acc.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {acc.startingCapital.toLocaleString()} {acc.currency} • {acc.markets.join(', ')}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEditAccount(acc)} className="p-2 text-slate-500 hover:text-cyan transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => removeAccount(acc.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {(!profile.accounts || profile.accounts.length === 0) && (
                  <div className="p-8 border border-dashed border-navy-accent rounded-xl text-center text-slate-600 text-[10px] font-mono uppercase italic">
                    Sin cuentas registradas
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-navy-accent">
              <button onClick={prevStep} className="flex-1 py-4 bg-navy-accent text-slate-300 rounded-lg text-sm font-semibold hover:bg-navy-accent/80 transition-all uppercase">ATRÁS</button>
              <button 
                onClick={nextStep} 
                disabled={!profile.accounts || profile.accounts.length === 0}
                className="flex-[2] py-4 bg-cyan text-navy font-bold rounded-lg text-sm uppercase hover:brightness-110 transition-all disabled:opacity-50"
              >
                CONTINUAR
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-semibold text-white">Psicología de Base</h2>
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase mb-2 block">Tus Fortalezas</span>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-navy-accent rounded-lg custom-scrollbar">
                {STRENGTHS_POOL.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleTag(s, 'strengths')}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${profile.strengths?.includes(s) ? 'bg-green-600 text-white' : 'bg-navy-accent text-slate-400'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase mb-2 block">Tus Debilidades</span>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-navy-accent rounded-lg custom-scrollbar">
                {WEAKNESSES_POOL.map(w => (
                  <button
                    key={w}
                    onClick={() => toggleTag(w, 'weaknesses')}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold transition-all ${profile.weaknesses?.includes(w) ? 'bg-red-600 text-white' : 'bg-navy-accent text-slate-400'}`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={prevStep} className="flex-1 py-4 bg-navy-accent text-slate-300 rounded-lg text-sm font-semibold hover:bg-navy-accent/80 transition-all uppercase">ATRÁS</button>
              <button onClick={nextStep} className="flex-[2] py-4 bg-cyan text-navy font-bold rounded-lg text-sm uppercase hover:brightness-110 transition-all">SIGUIENTE</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-fade-in text-center">
            <div className="inline-block p-4 bg-white/10 rounded-full mb-2">
              <Save size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">{isEditing ? 'Actualizando Protocolo' : 'Iniciando Protocolo'}</h2>
            <p className="text-slate-400 font-normal text-sm leading-relaxed max-w-sm mx-auto">
              {isEditing 
                ? 'Se aplicarán los cambios a tu perfil operativo de Equilibrium.' 
                : 'Has configurado los cimientos de tu carrera. El sistema Equilibrium está listo para analizar tu desempeño.'
              }
            </p>
            <div className="bg-navy-accent/20 p-4 rounded-lg border border-navy-accent text-left">
              <p className="text-[10px] text-slate-400 font-mono uppercase mb-2 tracking-widest">Resumen del Perfil:</p>
              <ul className="text-xs space-y-1 text-slate-300 font-mono">
                <li>• OPERADOR: {profile.name}</li>
                <li>• ESTRATEGIA: {profile.traderStyle} {profile.secondaryStyles?.length ? `(+${profile.secondaryStyles.join(', ')})` : ''}</li>
                <li>• MERCADOS FOCO: {profile.primaryMarkets?.join(', ')}</li>
                <li>• CUENTAS: {profile.accounts?.length} operativas registradas</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => onComplete(profile as UserProfile)} 
                className="w-full py-4 bg-white text-navy font-bold rounded-lg shadow-lg hover:brightness-90 transition-all uppercase tracking-wide text-sm"
              >
                {isEditing ? 'GUARDAR CAMBIOS' : 'ACCEDER AL TERMINAL'}
              </button>
              <button 
                onClick={prevStep} 
                className="w-full py-2 text-slate-500 font-mono text-[10px] uppercase hover:text-slate-300 transition-colors"
              >
                [ REVISAR DATOS ]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
