
import { MarketType } from './types';

export const MARKETS: MarketType[] = ['Cripto', 'Forex', 'Índices', 'Acciones', 'Opciones', 'Commodities'];

export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', 'Daily', 'Weekly'];

export const SETUPS_POSITIVE = [
  'Continuación de tendencia',
  'Reversión en nivel mayor',
  'Pullback',
  'Breakout con confirmación'
];

export const SETUPS_NEGATIVE = [
  'Siguiendo a otro trader',
  'Siguiendo a un influencer',
  'Siguiendo el precio',
  'FOMO',
  'Impulso emocional',
  'Sin plan claro'
];

export const BASE_SETUPS = [...SETUPS_POSITIVE, ...SETUPS_NEGATIVE, 'Otro setup'];

export const SENTIMENT_OPTIONS = [
  'Euforia extrema',
  'Euforia',
  'Neutral',
  'Pesimismo',
  'Pesimismo extremo'
];

export const DOMINANCE_OPTIONS = [
  'En soporte',
  'En resistencia',
  'En zona media',
  'No estoy seguro'
];

export const TRADE_MOTIVES = [
  'Siguiendo mi plan',
  'Continuidad del plan',
  'Oportunidad excepcional',
  'Recuperar pérdida',
  'Siguiendo a otro trader',
  'Aburrimiento',
  'FOMO',
  'Impulso emocional',
  'Otro'
];

export const MOTIVES_NEGATIVE = [
  'Recuperar pérdida',
  'Aburrimiento',
  'FOMO',
  'Impulso emocional'
];

export const MENTAL_STATES = [
  'Calma', 'FOMO', 'Revancha', 'Ansiedad', 'Incertidumbre', 'Neutral', 'Euforia', 'Miedo', 'Aburrimiento'
];

export const TRADE_REASONS = [
  { label: 'Estrategia confirmada', color: 'green' },
  { label: 'Aburrimiento', color: 'yellow' },
  { label: 'Siguiendo a un trader', color: 'red' },
  { label: 'Siguiendo a un influencer', color: 'red' },
  { label: 'Recuperar pérdida', color: 'red' },
  { label: 'Intuición', color: 'yellow' },
  { label: 'Noticias', color: 'blue' }
];

export const ASSETS_BY_MARKET: Record<MarketType, string[]> = {
  'Cripto': ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOGE/USDT', 'DOT/USDT', 'LINK/USDT'],
  'Forex': ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'],
  'Índices': ['S&P 500', 'NASDAQ 100', 'DOW JONES', 'DAX 40', 'FTSE 100', 'IBEX 35', 'NIKKEI 225', 'RUSSELL 2000'],
  'Acciones': ['AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT', 'GOOGL', 'META', 'NFLX', 'AMD', 'COIN'],
  'Opciones': ['SPY', 'QQQ', 'IWM', 'VIX'],
  'Commodities': ['GOLD', 'SILVER', 'CRUDE OIL', 'NATURAL GAS', 'COPPER', 'WHEAT']
};

export const TRADER_STYLES = ['Scalper', 'DayTrader', 'SwingTrader', 'PositionTrader', 'Inversor'];

export const STRENGTHS_POOL = [
  'Disciplina férrea', 'Gestión de riesgo', 'Paciencia', 'Análisis técnico', 'Resiliencia', 
  'Control emocional', 'Enfoque HTF', 'Especialización en un activo', 'Uso de Bitácora', 'Adaptabilidad'
];

export const WEAKNESSES_POOL = [
  'Sobreoperar (Overtrading)', 'Cerrar temprano', 'Miedo a perder', 'FOMO', 'Venganza', 
  'Ignorar Stop Loss', 'Tamaño excesivo', 'Falta de plan', 'Operar cansado', 'Sesgo direccional'
];
