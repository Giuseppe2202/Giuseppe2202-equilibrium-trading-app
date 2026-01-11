import { UserProfile, Trade, ChatMessage, TradeLocation, TradeDevice } from "../types";

const KEYS = {
  PROFILE: "eq_profile",
  TRADES: "eq_trades",
  CHATS: "eq_chats",
} as const;

/* =========================
   Utils
========================= */

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isFiniteNumber(v: any): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function toNumberOr(v: any, fallback: number): number {
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return isFiniteNumber(v) ? v : fallback;
}

function normalizeStatus(v: any): "Abierto" | "Cerrado" {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "cerrado" || s === "closed" || s === "c" || s === "done" || s === "final") return "Cerrado";
  return "Abierto";
}

function safeUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

/* =========================
   Profile Normalization
========================= */

function ensureProfileDefaults(profile: any): UserProfile {
  const p = (profile || {}) as UserProfile;

  return {
    name: p.name ?? "",
    traderStyle: p.traderStyle ?? "DayTrader",
    secondaryStyles: Array.isArray(p.secondaryStyles) ? p.secondaryStyles : [],
    primaryMarkets: Array.isArray(p.primaryMarkets) ? p.primaryMarkets : [],
    secondaryMarkets: Array.isArray(p.secondaryMarkets) ? p.secondaryMarkets : [],
    accounts: Array.isArray(p.accounts) ? p.accounts : [],
    strengths: Array.isArray(p.strengths) ? p.strengths : [],
    weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses : [],
    setupsByAccount: p.setupsByAccount && typeof p.setupsByAccount === "object" ? p.setupsByAccount : {},
    assetsByAccount: p.assetsByAccount && typeof p.assetsByAccount === "object" ? p.assetsByAccount : {},
  };
}

/* =========================
   Trade Normalization
========================= */

function normalizeLocation(v: any): TradeLocation | undefined {
  return v === "Casa" || v === "Trabajo" || v === "Calle" ? v : undefined;
}

function normalizeDevice(v: any): TradeDevice | undefined {
  return v === "Laptop" || v === "Celular" ? v : undefined;
}

function normalizeTakeProfits(v: any): number[] {
  if (Array.isArray(v)) {
    const arr = v.map((x) => toNumberOr(x, 0));
    return arr.length ? arr : [0];
  }
  return [0];
}

function normalizeImages(v: any) {
  if (!Array.isArray(v)) return [];
  return v.filter(Boolean).map((img) => {
    if (typeof img === "string") return { base64: img };
    if (img && typeof img === "object") return img;
    return null;
  }).filter(Boolean);
}

function normalizePnl(v: any) {
  if (!v || typeof v !== "object") return undefined;
  return {
    dollars: toNumberOr((v as any).dollars, 0),
    percent: toNumberOr((v as any).percent, 0),
    rMultiple: toNumberOr((v as any).rMultiple, 0),
  };
}

function normalizePartialExits(v: any) {
  if (!Array.isArray(v)) return undefined;
  const normalized = v
    .filter(Boolean)
    .map((p: any) => ({
      id: p?.id ? String(p.id) : safeUUID(),
      percentage: toNumberOr(p?.percentage, 0),
      price: toNumberOr(p?.price, 0),
      dateTime: p?.dateTime ? String(p.dateTime) : new Date().toISOString(),
      note: p?.note ? String(p.note) : "",
      pnlDollars: toNumberOr(p?.pnlDollars, 0),
      pnlR: toNumberOr(p?.pnlR, 0),
    }))
    .filter((p: any) => p.percentage > 0 && p.price > 0);

  return normalized.length ? normalized : undefined;
}

function ensureTradeDefaults(trade: any): Trade {
  const t = (trade || {}) as Trade;

  const createdAt = t.createdAt ?? new Date().toISOString();

  const tradeDateTime =
    t.tradeDateTime ??
    new Date().toISOString().slice(0, 16);

  const status = normalizeStatus((t as any).status);

  const positionSizeUnits = toNumberOr((t as any).positionSizeUnits, 0);

  const remainingPositionSizeUnitsRaw = (t as any).remainingPositionSizeUnits;
  const remainingPositionSizeUnits =
    remainingPositionSizeUnitsRaw === undefined || remainingPositionSizeUnitsRaw === null
      ? undefined
      : toNumberOr(remainingPositionSizeUnitsRaw, 0);

  const normalizedPartialExits = normalizePartialExits((t as any).partialExits);

  const pnl = normalizePnl((t as any).pnl);

  const location = normalizeLocation((t as any).tradeLocation);
  const device = normalizeDevice((t as any).tradeDevice);

  const takeProfits = normalizeTakeProfits((t as any).takeProfits);

  return {
    ...t,

    /* Identidad */
    id: (t as any).id ?? safeUUID(),
    createdAt,
    tradeDateTime,

    /* Estado */
    status,

    /* Mercado */
    accountId: (t as any).accountId ?? "",
    market: (t as any).market ?? "Forex",
    asset: (t as any).asset ?? "",
    direction: (t as any).direction ?? "long",
    timeframe: (t as any).timeframe ?? "1h",

    /* Setup */
    setup: (t as any).setup ?? "",
    customSetupName: (t as any).customSetupName,

    /* Sentimiento */
    marketSentiment: (t as any).marketSentiment ?? "Neutral",
    assetSentiment: (t as any).assetSentiment ?? "Neutral",
    cryptoDominance: (t as any).cryptoDominance,

    /* Contenido */
    notesUser: (t as any).notesUser ?? "",
    thesis: (t as any).thesis ?? "",
    images: normalizeImages((t as any).images),

    /* Macro */
    macroTrend: (t as any).macroTrend ?? {
      macro: "No seguro",
      micro: "No seguro",
      reversalEvidence: "no seguro",
      htfLevelsChecked: "no seguro",
    },

    /* Riesgo */
    riskR: toNumberOr((t as any).riskR, 1),
    entry: toNumberOr((t as any).entry, 0),
    stopLoss: toNumberOr((t as any).stopLoss, 0),
    takeProfits,

    /* Position sizing */
    positionSizeUnits,
    remainingPositionSizeUnits,

    rr: toNumberOr((t as any).rr, 0),

    /* Resultados */
    pnl,
    partialExits: normalizedPartialExits,

    /* Calidad */
    executionQuality: (t as any).executionQuality ?? "C",
    qualityScore: toNumberOr((t as any).qualityScore, 0),
    coachNotes: (t as any).coachNotes,

    /* Psicología */
    mentalState: (t as any).mentalState ?? "Neutral",
    reason: (t as any).reason ?? "",
    motive: (t as any).motive ?? "",
    alertsTriggered: Array.isArray((t as any).alertsTriggered) ? (t as any).alertsTriggered : [],

    /* Contexto */
    tradeLocation: location,
    tradeDevice: device,

    /* Cierre */
    exitPrice: isFiniteNumber((t as any).exitPrice) ? (t as any).exitPrice : undefined,
    exitDateTime: (t as any).exitDateTime ?? undefined,
    closingNote: (t as any).closingNote ?? undefined,
  };
}

/* =========================
   Migration
========================= */

function migrateTradesIfNeeded(trades: Trade[]): Trade[] {
  let changed = false;

  const migrated = (trades || []).map((t: any) => {
    const fixed = ensureTradeDefaults(t);

    const keysToCheck: Array<keyof Trade> = [
      "id",
      "createdAt",
      "tradeDateTime",
      "status",
      "riskR",
      "entry",
      "stopLoss",
      "takeProfits",
      "positionSizeUnits",
      "remainingPositionSizeUnits",
      "rr",
      "qualityScore",
      "tradeLocation",
      "tradeDevice",
    ];

    for (const k of keysToCheck) {
      if ((t as any)[k] !== (fixed as any)[k]) {
        changed = true;
        break;
      }
    }

    const hadBadPnl = !!(t as any).pnl && (t as any).pnl !== (fixed as any).pnl;
    const hadBadPartials = !!(t as any).partialExits && (t as any).partialExits !== (fixed as any).partialExits;
    const hadBadImages = !!(t as any).images && (t as any).images !== (fixed as any).images;
    if (hadBadPnl || hadBadPartials || hadBadImages) changed = true;

    return fixed;
  });

  if (changed) {
    try {
      localStorage.setItem(KEYS.TRADES, JSON.stringify(migrated));
    } catch {
      /* ignore */
    }
  }

  return migrated;
}

/* =========================
   Storage API
========================= */

export const storageService = {
  /* Profile */
  saveProfile: (profile: UserProfile) => {
    const safe = ensureProfileDefaults(profile);
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(safe));
  },

  getProfile: (): UserProfile | null => {
    const raw = safeJsonParse<UserProfile | null>(localStorage.getItem(KEYS.PROFILE), null);
    if (!raw) return null;

    const safe = ensureProfileDefaults(raw);

    try {
      localStorage.setItem(KEYS.PROFILE, JSON.stringify(safe));
    } catch {
      /* ignore */
    }

    return safe;
  },

  /* Trades */
  saveTrades: (trades: Trade[]) => {
    const safeTrades = (trades || []).map((t: any) => ensureTradeDefaults(t));
    localStorage.setItem(KEYS.TRADES, JSON.stringify(safeTrades));
  },

  getTrades: (): Trade[] => {
    const raw = safeJsonParse<Trade[]>(localStorage.getItem(KEYS.TRADES), []);
    return migrateTradesIfNeeded(raw);
  },

  /* Chat */
  saveChats: (chats: ChatMessage[]) => {
    localStorage.setItem(KEYS.CHATS, JSON.stringify(Array.isArray(chats) ? chats : []));
  },

  getChats: (): ChatMessage[] => {
    return safeJsonParse<ChatMessage[]>(localStorage.getItem(KEYS.CHATS), []);
  },

  /* Reset */
  clearAll: () => {
    localStorage.removeItem(KEYS.PROFILE);
    localStorage.removeItem(KEYS.TRADES);
    localStorage.removeItem(KEYS.CHATS);
  },
};
