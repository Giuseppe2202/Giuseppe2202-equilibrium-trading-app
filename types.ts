export type MarketType =
  | 'Cripto'
  | 'Forex'
  | 'Índices'
  | 'Acciones'
  | 'Opciones'
  | 'Commodities';

export type TraderStyleType =
  | 'Scalper'
  | 'DayTrader'
  | 'SwingTrader'
  | 'PositionTrader'
  | 'Inversor';

export type TradeLocation = 'Casa' | 'Trabajo' | 'Calle';
export type TradeDevice = 'Laptop' | 'Celular';

export interface CryptoDominance {
  usdtD: 'En soporte' | 'En resistencia' | 'En zona media' | 'No estoy seguro';
  btcD?: 'En soporte' | 'En resistencia' | 'En zona media' | 'No estoy seguro';
}

export interface MacroTrend {
  macro: 'Alcista' | 'Bajista' | 'Rango' | 'No seguro';
  micro: 'Alcista' | 'Bajista' | 'Rango' | 'No seguro';
  reversalEvidence: 'sí' | 'no' | 'no seguro';
  htfLevelsChecked: 'sí' | 'no' | 'no seguro';
}

export interface TradeImage {
  name: string;
  type: string;
  base64: string;
}

export interface TradePnL {
  dollars: number;
  percent: number;
  rMultiple: number;
}

export interface PartialExit {
  id: string;
  percentage: number; // 1–100
  price: number;
  dateTime: string;
  note?: string;
  pnlDollars: number;
  pnlR: number;
}

export interface Trade {
  id: string;
  createdAt: string;
  tradeDateTime: string;

  status: 'Abierto' | 'Cerrado';

  accountId: string;
  market: MarketType;
  asset: string;
  direction: 'long' | 'short';
  timeframe: string;

  setup: string;
  customSetupName?: string;

  marketSentiment: string;
  assetSentiment: string;
  cryptoDominance?: CryptoDominance;

  notesUser: string;
  thesis: string;
  images: TradeImage[];

  macroTrend: MacroTrend;

  // Riesgo y precios
  riskR: number;
  entry: number;
  stopLoss: number;
  takeProfits: number[];

  // Tamaño de posición
  positionSizeUnits: number;
  remainingPositionSizeUnits?: number;

  // Métricas
  rr: number;

  // Resultados
  pnl?: TradePnL;
  partialExits?: PartialExit[];

  executionQuality: 'A' | 'B' | 'C' | 'F';
  qualityScore: number;
  coachNotes?: string;

  mentalState: string;
  reason: string;
  motive: string;

  alertsTriggered: string[];

  // Contexto operativo
  tradeLocation?: TradeLocation;
  tradeDevice?: TradeDevice;

  // Cierre
  exitPrice?: number;
  exitDateTime?: string;
  closingNote?: string;
}

export interface Account {
  id: string;
  name: string;
  currency: string;
  startingCapital: number;
  currentCapital: number;
  markets: MarketType[];
}

export interface UserProfile {
  name: string;
  traderStyle: TraderStyleType;
  secondaryStyles: TraderStyleType[];
  primaryMarkets: MarketType[];
  secondaryMarkets: MarketType[];
  accounts: Account[];
  strengths: string[];
  weaknesses: string[];

  setupsByAccount: Record<string, string[]>;
  assetsByAccount: Record<string, string[]>;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
  timestamp: string;
}
