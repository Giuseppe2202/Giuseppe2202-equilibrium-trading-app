import { UserProfile, Trade, ChatMessage, TradeLocation, TradeDevice } from '../types';

const KEYS = {
  PROFILE: 'eq_profile',
  TRADES: 'eq_trades',
  CHATS: 'eq_chats'
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function ensureProfileDefaults(profile: any): UserProfile {
  const p = (profile || {}) as UserProfile;

  return {
    name: p.name ?? '',
    traderStyle: p.traderStyle ?? 'DayTrader',
    secondaryStyles: Array.isArray(p.secondaryStyles) ? p.secondaryStyles : [],
    primaryMarkets: Array.isArray(p.primaryMarkets) ? p.primaryMarkets : [],
    secondaryMarkets: Array.isArray(p.secondaryMarkets) ? p.secondaryMarkets : [],
    accounts: Array.isArray(p.accounts) ? p.accounts : [],
    strengths: Array.isArray(p.strengths) ? p.strengths : [],
    weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses : [],
    setupsByAccount: p.setupsByAccount && typeof p.setupsByAccount === 'object' ? p.setupsByAccount : {},
    assetsByAccount: p.assetsByAccount && typeof p.assetsByAccount === 'object' ? p.assetsByAccount : {}
  };
}

function ensureTradeDefaults(trade: any): Trade {
  const t = (trade || {}) as Trade;

  const location: TradeLocation | undefined =
    t.tradeLocation === 'Casa' || t.tradeLocation === 'Trabajo' || t.tradeLocation === 'Calle'
      ? t.tradeLocation
      : undefined;

  const device: TradeDevice | undefined =
    t.tradeDevice === 'Laptop' || t.tradeDevice === 'Celular'
      ? t.tradeDevice
      : undefined;

  return {
    ...t,

    id: t.id ?? crypto.randomUUID(),
    createdAt: t.createdAt ?? new Date().toISOString(),
    tradeDateTime: t.tradeDateTime ?? new Date().toISOString().slice(0, 16),
    status: t.status ?? 'Abierto',

    accountId: t.accountId ?? '',
    market: t.market ?? 'Forex',
    asset: t.asset ?? '',
    direction: t.direction ?? 'long',
    timeframe: t.timeframe ?? '1h',

    setup: t.setup ?? '',
    customSetupName: t.customSetupName,

    marketSentiment: t.marketSentiment ?? 'Neutral',
    assetSentiment: t.assetSentiment ?? 'Neutral',
    cryptoDominance: t.cryptoDominance,

    notesUser: t.notesUser ?? '',
    thesis: t.thesis ?? '',
    images: Array.isArray(t.images) ? t.images : [],

    macroTrend: t.macroTrend ?? {
      macro: 'No seguro',
      micro: 'No seguro',
      reversalEvidence: 'no seguro',
      htfLevelsChecked: 'no seguro'
    },

    riskR: typeof t.riskR === 'number' ? t.riskR : 1,
    entry: typeof t.entry === 'number' ? t.entry : 0,
    stopLoss: typeof t.stopLoss === 'number' ? t.stopLoss : 0,
    takeProfits: Array.isArray(t.takeProfits) ? t.takeProfits : [0],

    positionSizeUnits: typeof t.positionSizeUnits === 'number' ? t.positionSizeUnits : 0,
    remainingPositionSizeUnits: typeof t.remainingPositionSizeUnits === 'number' ? t.remainingPositionSizeUnits : undefined,

    rr: typeof t.rr === 'number' ? t.rr : 0,

    pnl: t.pnl,
    partialExits: Array.isArray(t.partialExits) ? t.partialExits : undefined,

    executionQuality: t.executionQuality ?? 'C',
    qualityScore: typeof t.qualityScore === 'number' ? t.qualityScore : 0,
    coachNotes: t.coachNotes,

    mentalState: t.mentalState ?? 'Neutral',
    reason: t.reason ?? '',
    motive: t.motive ?? '',
    alertsTriggered: Array.isArray(t.alertsTriggered) ? t.alertsTriggered : [],

    tradeLocation: location,
    tradeDevice: device,

    exitPrice: t.exitPrice,
    exitDateTime: t.exitDateTime,
    closingNote: t.closingNote
  };
}

function migrateTradesIfNeeded(trades: Trade[]): Trade[] {
  let changed = false;

  const migrated = (trades || []).map((t: any) => {
    const beforeLoc = t?.tradeLocation;
    const beforeDev = t?.tradeDevice;

    const fixed = ensureTradeDefaults(t);

    if (beforeLoc !== fixed.tradeLocation) changed = true;
    if (beforeDev !== fixed.tradeDevice) changed = true;

    return fixed;
  });

  if (changed) {
    try {
      localStorage.setItem(KEYS.TRADES, JSON.stringify(migrated));
    } catch {
      // ignore
    }
  }

  return migrated;
}

export const storageService = {
  saveProfile: (profile: UserProfile) => {
    const safe = ensureProfileDefaults(profile);
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(safe));
  },

  getProfile: (): UserProfile | null => {
    const data = safeJsonParse<UserProfile | null>(localStorage.getItem(KEYS.PROFILE), null);
    if (!data) return null;

    const safe = ensureProfileDefaults(data);

    // re guarda para normalizar
    try {
      localStorage.setItem(KEYS.PROFILE, JSON.stringify(safe));
    } catch {
      // ignore
    }

    return safe;
  },

  saveTrades: (trades: Trade[]) => {
    localStorage.setItem(KEYS.TRADES, JSON.stringify(trades));
  },

  getTrades: (): Trade[] => {
    const raw = safeJsonParse<Trade[]>(localStorage.getItem(KEYS.TRADES), []);
    return migrateTradesIfNeeded(raw);
  },

  saveChats: (chats: ChatMessage[]) => {
    localStorage.setItem(KEYS.CHATS, JSON.stringify(chats));
  },

  getChats: (): ChatMessage[] => {
    return safeJsonParse<ChatMessage[]>(localStorage.getItem(KEYS.CHATS), []);
  },

  clearAll: () => {
    localStorage.removeItem(KEYS.PROFILE);
    localStorage.removeItem(KEYS.TRADES);
    localStorage.removeItem(KEYS.CHATS);
  }
};
