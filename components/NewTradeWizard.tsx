import React, { useState, useEffect, useMemo } from 'react';
import { Trade, UserProfile, MarketType, TradeImage } from '../types';
import {
  TIMEFRAMES,
  SETUPS_POSITIVE,
  SETUPS_NEGATIVE,
  ASSETS_BY_MARKET,
  SENTIMENT_OPTIONS,
  DOMINANCE_OPTIONS,
  TRADE_MOTIVES,
  MOTIVES_NEGATIVE,
  MENTAL_STATES
} from '../constants';
import {
  ChevronRight,
  ChevronLeft,
  Shield,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  Search,
  Star,
  Activity,
  Brain,
  Briefcase,
  Plus,
  MapPin,
  Laptop,
  Smartphone
} from 'lucide-react';
import { storageService } from '../services/storageService';

interface ScoreImpact {
  regla: string;
  impacto: number;
  severidad: 'roja' | 'amarilla' | 'azul';
  mensaje: string;
}

interface NewTradeWizardProps {
  profile: UserProfile;
  onSave: (trade: Trade) => void;
  onCancel: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  addAlert: (msg: string, type: 'warning' | 'error' | 'info') => void;
}

const LOCATION_OPTIONS: Array<'Casa' | 'Trabajo' | 'Calle'> = ['Casa', 'Trabajo', 'Calle'];
const DEVICE_OPTIONS: Array<'Laptop' | 'Celular'> = ['Laptop', 'Celular'];

const NewTradeWizard: React.FC<NewTradeWizardProps> = ({
  profile,
  onSave,
  onCancel,
  onUpdateProfile,
  addAlert
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [customSetupInput, setCustomSetupInput] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [customAssetInput, setCustomAssetInput] = useState('');
  const [showManualAsset, setShowManualAsset] = useState(false);

  const [customMotiveInput, setCustomMotiveInput] = useState('');
  const [isManualRisk, setIsManualRisk] = useState(false);

  const [trade, setTrade] = useState<Partial<Trade>>({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    tradeDateTime: new Date().toISOString().slice(0, 16),

    status: 'Abierto',
    accountId: profile.accounts[0]?.id || '',
    market: profile.accounts[0]?.markets[0] || 'Forex',

    asset: '',
    direction: undefined,
    timeframe: '1h',

    setup: SETUPS_POSITIVE[0],

    marketSentiment: SENTIMENT_OPTIONS[2],
    assetSentiment: SENTIMENT_OPTIONS[2],

    notesUser: '',
    thesis: '',
    images: [],

    macroTrend: {
      macro: 'Rango',
      micro: 'Rango',
      reversalEvidence: 'no seguro',
      htfLevelsChecked: 'no seguro'
    },

    cryptoDominance: { usdtD: 'No estoy seguro', btcD: 'No estoy seguro' },

    riskR: 1,
    entry: 0,
    stopLoss: 0,
    takeProfits: [0],
    positionSizeUnits: 0,

    rr: 0,
    alertsTriggered: [],

    mentalState: 'Neutral',
    reason: 'Estrategia confirmada',
    motive: TRADE_MOTIVES[0],

    tradeLocation: 'Casa',
    tradeDevice: 'Laptop'
  });

  const selectedAccount = useMemo(
    () => profile.accounts.find(a => a.id === trade.accountId),
    [profile.accounts, trade.accountId]
  );

  const availableSetups = useMemo(() => {
    const accId = trade.accountId || '';
    const customSetups = accId ? (profile.setupsByAccount?.[accId] || []) : [];
    return [...SETUPS_POSITIVE, ...SETUPS_NEGATIVE, ...customSetups, 'Otro setup'];
  }, [profile.setupsByAccount, trade.accountId]);

  const availableAssets = useMemo(() => {
    const base = ASSETS_BY_MARKET[trade.market as MarketType] || [];
    const accId = trade.accountId || '';
    const custom = accId ? (profile.assetsByAccount?.[accId] || []) : [];
    const combined = [...new Set([...base, ...custom])];
    return combined.filter(a => a.toLowerCase().includes(assetSearch.toLowerCase()));
  }, [trade.market, trade.accountId, profile.assetsByAccount, assetSearch]);

  const isStopLossValid = useMemo(() => {
    if (!trade.entry || !trade.stopLoss || !trade.direction) return true;
    if (trade.direction === 'long') return trade.stopLoss < trade.entry;
    if (trade.direction === 'short') return trade.stopLoss > trade.entry;
    return true;
  }, [trade.entry, trade.stopLoss, trade.direction]);

  const isTakeProfitValid = useMemo(() => {
    const tp1 = trade.takeProfits?.[0];
    if (!trade.entry || !tp1 || !trade.direction) return true;
    if (trade.direction === 'long') return tp1 > trade.entry;
    if (trade.direction === 'short') return tp1 < trade.entry;
    return true;
  }, [trade.entry, trade.takeProfits, trade.direction]);

  const rrRatio = useMemo(() => {
    const tp1 = trade.takeProfits?.[0];
    if (!trade.entry || !trade.stopLoss || !tp1 || !isStopLossValid || !isTakeProfitValid || !trade.direction) return 0;
    const risk = Math.abs(trade.entry - trade.stopLoss);
    const reward = Math.abs(tp1 - trade.entry);
    return risk === 0 ? 0 : reward / risk;
  }, [trade.entry, trade.stopLoss, trade.takeProfits, isStopLossValid, isTakeProfitValid, trade.direction]);

  const positionSize = useMemo(() => {
    if (!selectedAccount || !trade.entry || !trade.stopLoss || !isStopLossValid) return 0;
    const riskPercent = trade.riskR || 0;
    const riskAmount = (selectedAccount.currentCapital * riskPercent) / 100;
    const distance = Math.abs(trade.entry - trade.stopLoss);
    return distance === 0 ? 0 : riskAmount / distance;
  }, [selectedAccount, trade.entry, trade.stopLoss, trade.riskR, isStopLossValid]);

  const handleAddCustomAsset = () => {
    const val = customAssetInput.trim().toUpperCase();
    if (!val) return;

    const accId = trade.accountId || '';
    if (!accId) {
      addAlert('Primero selecciona una cuenta.', 'error');
      return;
    }

    const currentAccountAssets = profile.assetsByAccount?.[accId] || [];
    const isDuplicate = [...availableAssets].some(a => a.toUpperCase() === val);

    if (isDuplicate) {
      setTrade(prev => ({ ...prev, asset: val }));
      setCustomAssetInput('');
      setShowManualAsset(false);
      return;
    }

    const updatedAssets = [...currentAccountAssets, val];
    const newProfile: UserProfile = {
      ...profile,
      assetsByAccount: {
        ...(profile.assetsByAccount || {}),
        [accId]: updatedAssets
      }
    };

    onUpdateProfile(newProfile);
    setTrade(prev => ({ ...prev, asset: val }));
    setCustomAssetInput('');
    setShowManualAsset(false);
    addAlert(`Activo ${val} guardado en tu perfil.`, 'info');
  };

  const handleAddCustomSetup = () => {
    const val = customSetupInput.trim();
    if (!val) return;

    const accId = trade.accountId || '';
    if (!accId) {
      addAlert('Primero selecciona una cuenta.', 'error');
      return;
    }

    const currentCustom = profile.setupsByAccount?.[accId] || [];
    const exists = [...SETUPS_POSITIVE, ...SETUPS_NEGATIVE, ...currentCustom].some(s => s.toLowerCase() === val.toLowerCase());

    if (exists) {
      setTrade(prev => ({
        ...prev,
        setup: val,
        customSetupName: val
      }));
      setCustomSetupInput('');
      addAlert('Ese setup ya existe. Lo seleccioné.', 'info');
      return;
    }

    const updatedSetups = [...currentCustom, val];
    const newProfile: UserProfile = {
      ...profile,
      setupsByAccount: {
        ...(profile.setupsByAccount || {}),
        [accId]: updatedSetups
      }
    };

    onUpdateProfile(newProfile);

    setTrade(prev => ({
      ...prev,
      setup: val,
      customSetupName: val
    }));

    setCustomSetupInput('');
    addAlert(`Setup "${val}" guardado en esta cuenta.`, 'info');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).slice(0, 3).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newImg: TradeImage = { name: file.name, type: file.type, base64: base64String };
        setTrade(prev => ({ ...prev, images: [...(prev.images || []), newImg] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const qualityEvaluation = useMemo(() => {
    let score = 7.0;
    const breakdown: ScoreImpact[] = [];
    let redAlertsCount = 0;
    let riskOrPsychRed = false;

    const addImpact = (regla: string, impacto: number, severidad: 'roja' | 'amarilla' | 'azul', mensaje: string) => {
      score += impacto;

      if (severidad === 'roja') {
        redAlertsCount++;
        if (
          [
            'Risk Reward',
            'Riesgo en R',
            'Psicología',
            'Motivo',
            'Patrón Repetido',
            'Configuración Cripto',
            'Setup',
            'Tendencia'
          ].includes(regla)
        ) {
          riskOrPsychRed = true;
        }
      }

      breakdown.push({ regla, impacto, severidad, mensaje });
    };

    if (trade.riskR) {
      if (trade.riskR > 5) addImpact('Riesgo en R', 0 - 2.2, 'roja', 'Alerta: Riesgo mayor a 5R. Esto es agresivo para tu cuenta.');
      else if (trade.riskR > 4) addImpact('Riesgo en R', 0 - 1.2, 'amarilla', 'Riesgo elevado (4 a 5R).');
      else if (trade.riskR > 3) addImpact('Riesgo en R', 0 - 0.5, 'amarilla', 'Riesgo por encima del estándar (3R o más).');
    }

    if (trade.direction && rrRatio > 0) {
      if (rrRatio < 1.0) addImpact('Risk Reward', 0 - 2.0, 'roja', 'Alerta: RR menor a 1. Este trade no tiene sentido estadístico.');
      else if (rrRatio < 1.5) addImpact('Risk Reward', 0 - 1.0, 'amarilla', 'RR bajo (1.0 a 1.5).');
      else if (rrRatio < 2.0) addImpact('Risk Reward', 0 - 0.3, 'amarilla', 'RR aceptable pero ajustado (menor a 2.0).');
      else if (rrRatio >= 2.0 && rrRatio <= 8.0) addImpact('Risk Reward', 0.2, 'azul', 'Buen ratio riesgo beneficio.');
      else if (rrRatio > 8.0 && profile.traderStyle !== 'SwingTrader' && profile.traderStyle !== 'PositionTrader') {
        addImpact('Risk Reward', 0 - 0.6, 'amarilla', 'Alerta: RR mayor a 8. Podría ser poco realista, revisa tus niveles.');
      }
    }

    if (step > 7 && trade.images && trade.images.length === 0) {
      addImpact('Evidencia', 0 - 0.8, 'amarilla', 'Alerta: Falta evidencia gráfica. Registrar el chart mejora tu disciplina.');
    }

    if (step === 10 && (!trade.thesis || trade.thesis.trim().length === 0)) {
      addImpact('Planificación', 0 - 0.9, 'amarilla', 'Alerta: Sin tesis clara. Un plan débil suele llevar a malos resultados.');
    }

    if (trade.direction) {
      const macro = trade.macroTrend?.macro;
      const micro = trade.macroTrend?.micro;
      const isLong = trade.direction === 'long';
      const isShort = trade.direction === 'short';

      const macroAgainst = (isLong && macro === 'Bajista') || (isShort && macro === 'Alcista');
      const microAgainst = (isLong && micro === 'Bajista') || (isShort && micro === 'Alcista');

      if (macroAgainst && microAgainst) {
        addImpact('Tendencia', 0 - 1.4, 'roja', 'Alerta: Estás en contra de macro y micro tendencia. Alto riesgo.');
        if (trade.macroTrend?.reversalEvidence !== 'sí') {
          addImpact('Evidencia Reversa', 0 - 0.6, 'amarilla', 'Sin evidencia clara de reversa operando contra tendencia.');
        }
      } else if (macroAgainst || microAgainst) {
        addImpact('Tendencia', 0 - 0.3, 'amarilla', 'Operando contra una de las estructuras principales.');
        if (macroAgainst && trade.macroTrend?.reversalEvidence !== 'sí') {
          addImpact('Evidencia Reversa', 0 - 0.6, 'amarilla', 'Contra tendencia macro sin evidencia clara de reversa.');
        }
      } else if (macro !== 'No seguro' && micro !== 'No seguro') {
        addImpact('Tendencia', 0.2, 'azul', 'Estructura de mercado alineada.');
      }
    }

    if (trade.direction) {
      const mktS = trade.marketSentiment;
      const isLong = trade.direction === 'long';

      if (isLong) {
        if (mktS === 'Euforia extrema') addImpact('Sentimiento Mercado', 0 - 1.0, 'roja', 'Extrema euforia en long. Riesgo de entrar en el techo.');
        else if (mktS === 'Euforia') addImpact('Sentimiento Mercado', 0 - 0.5, 'amarilla', 'Mercado eufórico. Cuidado con la distribución.');
        else if (mktS === 'Pesimismo') addImpact('Sentimiento Mercado', 0.1, 'azul', 'Sentimiento pesimista favorece compras.');
        else if (mktS === 'Pesimismo extremo') addImpact('Sentimiento Mercado', 0.2, 'azul', 'Pánico en el mercado. Oportunidad de valor.');
      } else {
        if (mktS === 'Pesimismo extremo') addImpact('Sentimiento Mercado', 0 - 1.0, 'roja', 'Pánico extremo en short. Riesgo de vender el suelo.');
        else if (mktS === 'Pesimismo') addImpact('Sentimiento Mercado', 0 - 0.5, 'amarilla', 'Mercado pesimista. Cuidado con rebotes violentos.');
        else if (mktS === 'Euforia') addImpact('Sentimiento Mercado', 0.1, 'azul', 'Mercado eufórico favorece ventas.');
        else if (mktS === 'Euforia extrema') addImpact('Sentimiento Mercado', 0.2, 'azul', 'Euforia irracional. Oportunidad de corto.');
      }
    }

    if (trade.direction) {
      const astS = trade.assetSentiment;
      const isLong = trade.direction === 'long';

      if (isLong) {
        if (astS === 'Euforia extrema') addImpact('Sentimiento Activo', 0 - 0.7, 'roja', 'Activo en euforia extrema.');
        else if (astS === 'Euforia') addImpact('Sentimiento Activo', 0 - 0.3, 'amarilla', 'Activo eufórico.');
        else if (astS === 'Pesimismo extremo') addImpact('Sentimiento Activo', 0.1, 'azul', 'Activo en pánico.');
      } else {
        if (astS === 'Pesimismo extremo') addImpact('Sentimiento Activo', 0 - 0.7, 'roja', 'Activo en pánico extremo.');
        else if (astS === 'Pesimismo') addImpact('Sentimiento Activo', 0 - 0.3, 'amarilla', 'Activo pesimista.');
        else if (astS === 'Euforia extrema') addImpact('Sentimiento Activo', 0.1, 'azul', 'Activo en euforia.');
      }
    }

    if (trade.setup) {
      if (SETUPS_NEGATIVE.includes(trade.setup)) addImpact('Setup', 0 - 1.2, 'roja', 'Alerta: Setup negativo seleccionado. Estás operando por influencia, no por plan.');
      else if (trade.setup === 'Otro setup') addImpact('Setup', 0 - 0.4, 'amarilla', 'Setup no tipificado. Podría ser falta de sistema.');
      else addImpact('Setup', 0.1, 'azul', 'Estrategia tipificada detectada.');
    }

    if (trade.motive) {
      if (MOTIVES_NEGATIVE.includes(trade.motive)) addImpact('Motivo', 0 - 1.0, 'roja', 'Alerta: Motivo de trade riesgoso detectado (emocional).');
    }

    if (trade.mentalState) {
      if (['FOMO', 'Revancha'].includes(trade.mentalState)) addImpact('Psicología', 0 - 1.2, 'roja', 'Alerta: Estado psicológico crítico (FOMO o revancha). Alto riesgo de error.');
      else if (['Ansiedad', 'Incertidumbre', 'Miedo'].includes(trade.mentalState)) addImpact('Psicología', 0 - 0.5, 'amarilla', 'Estado mental inestable detectado.');
      else if (['Calma', 'Seguro'].includes(trade.mentalState)) addImpact('Psicología', 0.1, 'azul', 'Estado mental óptimo para operar.');
    }

    const history = storageService.getTrades().filter(t => t.status === 'Cerrado').slice(0 - 10);
    if (history.length > 0) {
      const motiveCount = history.filter(t => t.motive === trade.motive && MOTIVES_NEGATIVE.includes(t.motive)).length;
      const psychCount = history.filter(t => t.mentalState === trade.mentalState && ['FOMO', 'Revancha', 'Ansiedad'].includes(t.mentalState)).length;

      if (motiveCount >= 3 || psychCount >= 3) addImpact('Patrón Repetido', 0 - 0.8, 'roja', 'Alerta: Patrón repetido en tus últimos trades. Corrige antes de seguir.');
      else if (motiveCount === 2 || psychCount === 2) addImpact('Patrón Repetido', 0 - 0.4, 'amarilla', 'Indicio de patrón negativo recurrente.');
    }

    if (trade.market === 'Cripto' && trade.direction) {
      const isLong = trade.direction === 'long';
      if (isLong) {
        if (trade.cryptoDominance?.usdtD === 'En soporte') addImpact('Configuración Cripto', 0 - 0.8, 'roja', 'Alerta: USDT.D en soporte. Riesgo de caída general en cripto.');
        else if (trade.cryptoDominance?.usdtD === 'En resistencia') addImpact('Configuración Cripto', 0.1, 'azul', 'USDT.D en resistencia favorece longs.');

        if (trade.asset !== 'BTC/USDT' && trade.cryptoDominance?.btcD === 'En soporte') {
          addImpact('Configuración Cripto', 0 - 0.8, 'roja', 'Alerta: BTC.D en soporte. Riesgo alto para altcoins.');
        } else if (trade.asset !== 'BTC/USDT' && trade.cryptoDominance?.btcD === 'En resistencia') {
          addImpact('Configuración Cripto', 0.1, 'azul', 'BTC.D en resistencia favorece altcoins.');
        }
      } else {
        if (trade.cryptoDominance?.usdtD === 'En soporte') addImpact('Configuración Cripto', 0.1, 'azul', 'USDT.D en soporte favorece shorts.');
      }
    }

    const loc = trade.tradeLocation || 'Casa';
    const dev = trade.tradeDevice || 'Laptop';

    if (loc === 'Trabajo') addImpact('Contexto Operativo', 0 - 0.6, 'amarilla', 'Operaste desde el trabajo. Menos foco, más riesgo de ejecución.');
    if (loc === 'Calle') addImpact('Contexto Operativo', 0 - 0.4, 'amarilla', 'Operaste en la calle. Riesgo de distracción.');

    if (dev === 'Celular') addImpact('Dispositivo', 0 - 0.2, 'amarilla', 'Operaste desde el celular. Riesgo leve de mala ejecución.');

    let finalScore = Math.max(1.0, Math.min(10.0, score));

    if (redAlertsCount >= 2) {
      finalScore = Math.min(7.0, finalScore);
    } else if (redAlertsCount >= 1 && riskOrPsychRed) {
      finalScore = Math.min(8.0, finalScore);
    }

    return { score: Number(finalScore.toFixed(1)), breakdown };
  }, [trade, rrRatio, profile.traderStyle, step]);

  const getStepValidation = () => {
    if (step === 3 && !trade.asset) return 'Debes seleccionar o agregar un activo.';
    if (step === 7 && !trade.direction) return 'Debes seleccionar la dirección (long o short).';

    if (step === 8 && trade.setup === 'Otro setup') {
      const val = customSetupInput.trim();
      if (!val) return 'Escribe el nombre del setup para guardarlo.';
    }

    if (step === 9) {
      if (!trade.entry) return 'El precio de entrada es obligatorio.';
      if (!trade.stopLoss) return 'El stop loss es obligatorio.';
      if (!isStopLossValid) return 'El stop loss no es coherente con la dirección.';
      if (!isTakeProfitValid) return 'El take profit no es coherente con la dirección.';
    }

    return null;
  };

  const nextStep = () => {
    const error = getStepValidation();
    if (error) {
      addAlert(error, 'error');
      return;
    }

    if (step === 8 && trade.setup === 'Otro setup') {
      handleAddCustomSetup();
    }

    if (step === 5) {
      if (trade.market === 'Cripto') setStep(6);
      else setStep(7);
      return;
    }

    setStep(s => s + 1);
  };

  const prevStep = () => {
    if (step === 7 && trade.market !== 'Cripto') setStep(5);
    else setStep(s => s - 1);
  };

  const handleSave = () => {
    setLoading(true);

    const computedPositionSizeUnits = positionSize;

    const finalTrade: Trade = {
      ...(trade as Trade),

      // ✅ Base para cierres parciales y totales
      positionSizeUnits: computedPositionSizeUnits,
      remainingPositionSizeUnits: computedPositionSizeUnits,
      partialExits: (trade.partialExits || []) as any,

      qualityScore: qualityEvaluation.score,
      alertsTriggered: qualityEvaluation.breakdown.filter(b => b.severidad !== 'azul').map(b => b.mensaje),
      executionQuality:
        qualityEvaluation.score >= 8 ? 'A' : qualityEvaluation.score >= 6 ? 'B' : qualityEvaluation.score >= 4 ? 'C' : 'F',

      rr: rrRatio,
      motive: (trade.motive === 'Otro' ? customMotiveInput : trade.motive) || 'Sin motivo',
      thesis: trade.thesis && trade.thesis.trim() ? trade.thesis : 'Sin tesis',
      tradeLocation: trade.tradeLocation || 'Casa',
      tradeDevice: trade.tradeDevice || 'Laptop'
    };

    setTimeout(() => {
      setLoading(false);
      onSave(finalTrade);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy overflow-y-auto custom-scrollbar p-4 md:p-8">
      <div className="max-w-3xl mx-auto bg-navy-light rounded-2xl cyber-border p-6 md:p-10 space-y-8 min-h-[80vh]">

        <div className="flex justify-between items-center border-b border-navy-accent pb-4">
          <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight">Registro de Ejecución</h2>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Fase: Operativa Técnica</span>
            <span className="text-xs font-mono text-cyan uppercase font-bold">Paso {step} / 10</span>
          </div>
        </div>

        {step < 10 && qualityEvaluation.breakdown.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {qualityEvaluation.breakdown
              .filter(b => b.impacto < 0)
              .map((b, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase border animate-fade-in ${
                    b.severidad === 'roja'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  }`}
                >
                  <AlertTriangle size={12} /> {b.regla}: {b.mensaje}
                </div>
              ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <Shield className="text-cyan" /> Origen de Fondos
            </h3>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Cuenta Operativa</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {profile.accounts.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setTrade(prev => ({ ...prev, accountId: a.id }))}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-start ${
                        trade.accountId === a.id
                          ? 'bg-cyan/10 border-cyan shadow-glow'
                          : 'bg-navy border-navy-accent text-slate-500'
                      }`}
                    >
                      <span className="text-sm font-black italic uppercase text-white">{a.name}</span>
                      <span className="text-[10px] font-mono mt-1 opacity-70">
                        Balance: {a.currentCapital.toLocaleString()} {a.currency}
                      </span>
                    </button>
                  ))}
                </div>
              </label>

              {selectedAccount && (
                <div className="animate-fade-in pt-4">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Mercado Seleccionado</span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedAccount.markets.map(m => (
                      <button
                        key={m}
                        onClick={() => setTrade(prev => ({ ...prev, market: m }))}
                        className={`p-2 text-[10px] font-bold rounded border transition-all uppercase ${
                          trade.market === m
                            ? 'bg-cyan text-navy border-cyan shadow-glow'
                            : 'border-navy-accent text-slate-400'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-white">Contexto de Mercado</h3>
            <div className="grid grid-cols-1 gap-2">
              {SENTIMENT_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setTrade(prev => ({ ...prev, marketSentiment: opt }))}
                  className={`p-4 rounded-xl border-2 text-sm font-bold transition-all text-left flex justify-between items-center ${
                    trade.marketSentiment === opt
                      ? 'bg-cyan/10 border-cyan text-white shadow-glow'
                      : 'bg-navy border-navy-accent text-slate-500 hover:border-cyan/30'
                  }`}
                >
                  {opt}
                  {trade.marketSentiment === opt && <CheckCircle size={16} className="text-cyan" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="text-cyan" /> Selección de Activo
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Buscar ticker..."
                className="w-full bg-navy border border-navy-accent p-3 pl-10 rounded-xl focus:border-cyan outline-none text-white text-sm"
                value={assetSearch}
                onChange={e => setAssetSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
              {availableAssets.map(a => (
                <button
                  key={a}
                  onClick={() => setTrade(prev => ({ ...prev, asset: a }))}
                  className={`px-3 py-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                    trade.asset === a ? 'bg-cyan text-navy border-cyan' : 'border-navy-accent text-slate-500 hover:border-cyan/30'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-navy-accent/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">¿No encuentras el activo?</span>
                {!showManualAsset && (
                  <button
                    onClick={() => setShowManualAsset(true)}
                    className="flex items-center gap-1 text-[9px] font-bold text-cyan uppercase hover:underline"
                  >
                    <Plus size={12} /> Agregar manual
                  </button>
                )}
              </div>

              {showManualAsset && (
                <div className="flex gap-2 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Ej: XAUUSD, SPY, SOL..."
                    className="flex-1 bg-navy border border-navy-accent p-3 rounded-lg text-white text-xs outline-none focus:border-cyan transition-all uppercase"
                    value={customAssetInput}
                    onChange={e => setCustomAssetInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCustomAsset()}
                  />
                  <button
                    onClick={handleAddCustomAsset}
                    disabled={!customAssetInput.trim()}
                    className="px-4 bg-cyan text-navy font-black rounded-lg text-[10px] uppercase hover:brightness-110 disabled:opacity-50"
                  >
                    Agregar
                  </button>
                  <button
                    onClick={() => {
                      setShowManualAsset(false);
                      setCustomAssetInput('');
                    }}
                    className="px-3 text-slate-500 hover:text-white text-xs uppercase font-mono"
                  >
                    [X]
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-white">Sentimiento de {trade.asset}</h3>
            <div className="grid grid-cols-1 gap-2">
              {SENTIMENT_OPTIONS.map(sent => (
                <button
                  key={sent}
                  onClick={() => setTrade(prev => ({ ...prev, assetSentiment: sent }))}
                  className={`p-4 rounded-xl border-2 text-sm font-bold transition-all text-left flex justify-between items-center ${
                    trade.assetSentiment === sent
                      ? 'bg-cyan/10 border-cyan text-white shadow-glow'
                      : 'bg-navy border-navy-accent text-slate-500 hover:border-cyan/30'
                  }`}
                >
                  {sent}
                  {trade.assetSentiment === sent && <CheckCircle size={16} className="text-cyan" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-cyan" /> Estructura de Tendencia
            </h3>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-3">Tendencia Macro (HTF)</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Alcista', 'Bajista', 'Rango', 'No estoy seguro'].map(t => (
                    <button
                      key={t}
                      onClick={() =>
                        setTrade(prev => ({
                          ...prev,
                          macroTrend: {
                            ...(prev.macroTrend as any),
                            macro: (t === 'No estoy seguro' ? 'No seguro' : t) as any
                          }
                        }))
                      }
                      className={`p-3 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                        (trade.macroTrend?.macro === t || (t === 'No estoy seguro' && trade.macroTrend?.macro === 'No seguro'))
                          ? 'bg-cyan border-cyan text-navy shadow-glow'
                          : 'bg-navy border-navy-accent text-slate-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-3">Tendencia Micro (LTF)</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Alcista', 'Bajista', 'Rango', 'No estoy seguro'].map(t => (
                    <button
                      key={t}
                      onClick={() =>
                        setTrade(prev => ({
                          ...prev,
                          macroTrend: {
                            ...(prev.macroTrend as any),
                            micro: (t === 'No estoy seguro' ? 'No seguro' : t) as any
                          }
                        }))
                      }
                      className={`p-3 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                        (trade.macroTrend?.micro === t || (t === 'No estoy seguro' && trade.macroTrend?.micro === 'No seguro'))
                          ? 'bg-cyan border-cyan text-navy shadow-glow'
                          : 'bg-navy border-navy-accent text-slate-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-8 animate-fade-in">
            <h3 className="text-xl font-bold text-white">Contexto Cripto</h3>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-3">USDT Dominance (USDT.D)</span>
                <div className="grid grid-cols-2 gap-2">
                  {DOMINANCE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() =>
                        setTrade(prev => ({
                          ...prev,
                          cryptoDominance: { ...(prev.cryptoDominance as any), usdtD: opt as any }
                        }))
                      }
                      className={`p-3 rounded-lg border text-[10px] font-bold uppercase ${
                        trade.cryptoDominance?.usdtD === opt ? 'bg-cyan/10 border-cyan text-cyan' : 'bg-navy border-navy-accent text-slate-500'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {trade.asset !== 'BTC/USDT' && (
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-3">Bitcoin Dominance (BTC.D)</span>
                  <div className="grid grid-cols-2 gap-2">
                    {DOMINANCE_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        onClick={() =>
                          setTrade(prev => ({
                            ...prev,
                            cryptoDominance: { ...(prev.cryptoDominance as any), btcD: opt as any }
                          }))
                        }
                        className={`p-3 rounded-lg border text-[10px] font-bold uppercase ${
                          trade.cryptoDominance?.btcD === opt ? 'bg-cyan/10 border-cyan text-cyan' : 'bg-navy border-navy-accent text-slate-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-8 animate-fade-in">
            <h3 className="text-xl font-bold text-white">Evidencia y Dirección</h3>

            <div className="grid grid-cols-3 gap-4 h-32">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="relative aspect-video bg-navy rounded-xl border-2 border-dashed border-navy-accent flex items-center justify-center overflow-hidden"
                >
                  {trade.images?.[i] ? (
                    <img src={trade.images[i].base64} className="w-full h-full object-cover" />
                  ) : (
                    <label className="cursor-pointer text-slate-500">
                      <PlusCircle size={24} />
                      <input type="file" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setTrade(prev => ({ ...prev, direction: 'long' }))}
                className={`p-6 rounded-2xl border-2 font-black italic text-xl transition-all ${
                  trade.direction === 'long' ? 'bg-green-500/10 border-green-500 text-green-500 shadow-glow' : 'border-navy-accent text-slate-600 hover:border-green-500/30'
                }`}
              >
                LONG
              </button>
              <button
                onClick={() => setTrade(prev => ({ ...prev, direction: 'short' }))}
                className={`p-6 rounded-2xl border-2 font-black italic text-xl transition-all ${
                  trade.direction === 'short' ? 'bg-red-500/10 border-red-500 text-red-500 shadow-glow' : 'border-navy-accent text-slate-600 hover:border-red-500/30'
                }`}
              >
                SHORT
              </button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-white">Estrategia e Intención</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-navy border border-navy-accent rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <MapPin className="text-cyan" size={16} /> Dónde estabas tradeando
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {LOCATION_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTrade(prev => ({ ...prev, tradeLocation: opt }))}
                      className={`p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                        trade.tradeLocation === opt ? 'bg-cyan text-navy border-cyan shadow-glow' : 'border-navy-accent text-slate-500 hover:border-cyan/30'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-navy border border-navy-accent rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Laptop className="text-cyan" size={16} /> Dispositivo
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEVICE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTrade(prev => ({ ...prev, tradeDevice: opt }))}
                      className={`p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                        trade.tradeDevice === opt ? 'bg-cyan text-navy border-cyan shadow-glow' : 'border-navy-accent text-slate-500 hover:border-cyan/30'
                      }`}
                    >
                      {opt === 'Laptop' ? (
                        <span className="inline-flex items-center gap-2"><Laptop size={14} /> Laptop</span>
                      ) : (
                        <span className="inline-flex items-center gap-2"><Smartphone size={14} /> Celular</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-3">Setup Técnico</span>
                <div className="grid grid-cols-2 gap-2">
                  {availableSetups.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setTrade(prev => ({ ...prev, setup: s }));
                        if (s !== 'Otro setup') setCustomSetupInput('');
                      }}
                      className={`p-2 text-[9px] font-bold rounded border uppercase ${
                        trade.setup === s ? 'bg-cyan text-navy' : 'border-navy-accent text-slate-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {trade.setup === 'Otro setup' && (
                  <div className="mt-3 space-y-2 animate-fade-in">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Nombre del setup</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customSetupInput}
                        onChange={e => setCustomSetupInput(e.target.value)}
                        placeholder="Ej: Sweep and reclaim, PO3, etc"
                        className="flex-1 bg-navy border border-navy-accent p-3 rounded-lg text-white text-xs outline-none focus:border-cyan transition-all"
                      />
                      <button
                        onClick={handleAddCustomSetup}
                        disabled={!customSetupInput.trim()}
                        className="px-4 bg-cyan text-navy font-black rounded-lg text-[10px] uppercase hover:brightness-110 disabled:opacity-50"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-3">Motivación</span>
                  <div className="grid grid-cols-1 gap-1">
                    {TRADE_MOTIVES.map(m => (
                      <button
                        key={m}
                        onClick={() => setTrade(prev => ({ ...prev, motive: m }))}
                        className={`p-2 text-[8px] font-bold rounded border uppercase text-left flex justify-between items-center ${
                          trade.motive === m ? 'bg-gold text-navy' : 'border-navy-accent text-slate-500'
                        }`}
                      >
                        {m}
                        {trade.motive === m && <CheckCircle size={12} />}
                      </button>
                    ))}
                  </div>

                  {trade.motive === 'Otro' && (
                    <div className="mt-2">
                      <input
                        className="w-full bg-navy border border-navy-accent p-3 rounded-lg text-white text-xs outline-none focus:border-gold transition-all"
                        placeholder="Escribe tu motivo"
                        value={customMotiveInput}
                        onChange={e => setCustomMotiveInput(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-3">Estado Mental</span>
                  <div className="grid grid-cols-1 gap-1">
                    {MENTAL_STATES.map(st => (
                      <button
                        key={st}
                        onClick={() => setTrade(prev => ({ ...prev, mentalState: st }))}
                        className={`p-2 text-[8px] font-bold rounded border uppercase text-left flex justify-between items-center ${
                          trade.mentalState === st ? 'bg-cyan text-navy' : 'border-navy-accent text-slate-500'
                        }`}
                      >
                        {st}
                        {trade.mentalState === st && <Brain size={12} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {step === 9 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-white">Parámetros y Riesgo</h3>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Precio Entrada</span>
                <input
                  type="number"
                  step="any"
                  className="w-full mt-2 bg-navy border border-navy-accent p-4 rounded-xl text-white font-bold"
                  value={trade.entry || ''}
                  onChange={e => setTrade(prev => ({ ...prev, entry: Number(e.target.value) }))}
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Stop Loss</span>
                <input
                  type="number"
                  step="any"
                  className="w-full mt-2 bg-navy border border-navy-accent p-4 rounded-xl text-white font-bold"
                  value={trade.stopLoss || ''}
                  onChange={e => setTrade(prev => ({ ...prev, stopLoss: Number(e.target.value) }))}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Take Profit (TP1)</span>
              <input
                type="number"
                step="any"
                className="w-full mt-2 bg-navy border border-navy-accent p-4 rounded-xl text-white font-bold"
                value={trade.takeProfits?.[0] || ''}
                onChange={e => setTrade(prev => ({ ...prev, takeProfits: [Number(e.target.value)] }))}
              />
            </label>

            {!isStopLossValid && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold uppercase">
                Stop loss no coherente con la dirección.
              </div>
            )}

            {!isTakeProfitValid && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold uppercase">
                Take profit no coherente con la dirección.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-navy border border-navy-accent rounded-2xl p-4">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Risk Reward</div>
                <div className="text-2xl font-black text-white mt-2">
                  {rrRatio ? rrRatio.toFixed(2) : '0.00'}
                </div>
                <div className="text-[10px] font-mono text-slate-600 mt-1 uppercase">
                  Calculado con Entry, SL, TP1
                </div>
              </div>

              <div className="bg-navy border border-navy-accent rounded-2xl p-4">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Position Size</div>
                <div className="text-2xl font-black text-white mt-2">
                  {positionSize ? positionSize.toFixed(2) : '0.00'}
                </div>
                <div className="text-[10px] font-mono text-slate-600 mt-1 uppercase">
                  Según riesgo y balance
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-navy-accent space-y-4">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Riesgo por Operación (porcentaje de balance)</span>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 5].map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setTrade(prev => ({ ...prev, riskR: r }));
                      setIsManualRisk(false);
                    }}
                    className={`flex-1 py-2 rounded-lg border font-bold text-xs transition-all ${
                      !isManualRisk && trade.riskR === r ? 'bg-gold text-navy border-gold' : 'border-navy-accent text-slate-500'
                    }`}
                  >
                    {r}R
                  </button>
                ))}
                <button
                  onClick={() => setIsManualRisk(true)}
                  className={`flex-1 py-2 rounded-lg border font-bold text-xs transition-all ${
                    isManualRisk ? 'bg-gold text-navy border-gold shadow-glow' : 'border-navy-accent text-slate-500'
                  }`}
                >
                  MANUAL
                </button>
              </div>

              {isManualRisk && (
                <div className="animate-fade-in space-y-2">
                  <span className="text-[10px] font-mono text-gold uppercase tracking-widest block">Introducir manual (porcentaje)</span>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-navy border border-gold/30 p-3 rounded-lg text-white font-bold focus:border-gold outline-none"
                      placeholder="Ej: 0.5 o 1.25"
                      value={trade.riskR || ''}
                      onChange={e => setTrade(prev => ({ ...prev, riskR: parseFloat(e.target.value) || 0 }))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-gold font-bold">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Protocolo de Finalización</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Tesis del trade</span>
                  <textarea
                    className="w-full bg-navy border border-navy-accent p-3 rounded-lg text-white text-xs outline-none min-h-[100px]"
                    value={trade.thesis}
                    onChange={e => setTrade(prev => ({ ...prev, thesis: e.target.value }))}
                    placeholder="Describe tu ventaja estadística aquí..."
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Notas adicionales</span>
                  <textarea
                    className="w-full bg-navy border border-navy-accent p-3 rounded-lg text-white text-xs outline-none min-h-[60px]"
                    value={trade.notesUser}
                    onChange={e => setTrade(prev => ({ ...prev, notesUser: e.target.value }))}
                  />
                </label>
              </div>

              <div className="space-y-4">
                <div className="bg-navy-accent/20 border border-navy-accent p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-2xl">
                  <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">SCORE DE CALIDAD</p>
                  <div className="relative">
                    <Star
                      size={72}
                      className={qualityEvaluation.score >= 8 ? 'text-cyan' : qualityEvaluation.score >= 6 ? 'text-gold' : 'text-red-500'}
                      fill="currentColor"
                      fillOpacity={0.1}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-3xl font-black text-white">
                      {qualityEvaluation.score}
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-slate-600 mt-2 uppercase tracking-widest">Diagnóstico Operativo</p>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                  {qualityEvaluation.breakdown
                    .sort((a, b) => a.impacto - b.impacto)
                    .slice(0, 8)
                    .map((b, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center gap-2 ${
                          b.impacto < 0
                            ? b.severidad === 'roja'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {b.impacto < 0 ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                        <span className="flex-1">{b.mensaje}</span>
                        <span className="font-mono">{b.impacto > 0 ? `+${b.impacto}` : `${b.impacto}`}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="bg-navy p-3 rounded-xl border border-navy-accent text-[10px] font-mono text-slate-500 uppercase">
              Contexto: <span className="text-white">{trade.tradeLocation || 'Casa'}</span> ,{' '}
              <span className="text-white">{trade.tradeDevice || 'Laptop'}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-8 border-t border-navy-accent">
          <button
            onClick={step === 1 ? onCancel : prevStep}
            className="px-6 py-4 bg-navy-accent text-white rounded-xl font-black text-xs uppercase"
          >
            <ChevronLeft size={18} />
          </button>

          {step < 10 ? (
            <button
              onClick={nextStep}
              disabled={step === 7 && !trade.direction}
              className="px-12 py-4 bg-cyan text-navy font-black rounded-xl text-xs uppercase disabled:opacity-30 disabled:cursor-not-allowed"
            >
              SIGUIENTE
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-12 py-4 bg-white text-navy font-black rounded-xl text-xs uppercase"
            >
              {loading ? 'Sincronizando...' : 'Finalizar Registro'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default NewTradeWizard;
