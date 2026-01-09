import { GoogleGenAI } from "@google/genai";
import { Trade, ChatMessage, UserProfile } from "../types";

/**
 * Detecta si hay API key disponible
 * En local normalmente NO hay, en producción sí
 */
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Inicializamos Gemini SOLO si existe API key
 * Esto evita que la app crashee en local
 */
const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

// Instrucción para análisis rápido de trades
const HISTORY_SYSTEM_INSTRUCTION = `
Eres el Coach AI de Equilibrium. Tu tono es profesional y breve.
Analiza trades específicos basándote en psicología y gestión de riesgo.
No des señales. Máximo 3 frases.
`;

// Instrucción estricta para el chat interactivo
const CHAT_SYSTEM_INSTRUCTION = `
Eres el Coach AI de Equilibrium. Tu rol es coaching psicológico y de proceso.
NO das señales, NO analizas gráficos en vivo, NO das predicciones.

FORMATO DE RESPUESTA OBLIGATORIO:
1) Diagnóstico rápido
2) Lo más importante ahora
3) Acción mínima
4) Pregunta

REGLAS:
Tono profesional, empático, estilo Slack
Máximo 10 líneas
Responde siempre en español
`;

export const geminiService = {
  /**
   * Feedback rápido para un trade específico
   */
  async getTradeCoachNotes(
    trade: Trade,
    profile: UserProfile
  ): Promise<string> {
    if (!ai) {
      return "Coach AI no disponible en este entorno.";
    }

    const prompt = `Analiza este trade de ${trade.asset} (${trade.qualityScore}/10).
Motivo: ${trade.motive}.
Estado mental: ${trade.mentalState}.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: HISTORY_SYSTEM_INSTRUCTION
        }
      });

      return response.text || "Sin feedback disponible.";
    } catch (error) {
      console.error("Gemini trade analysis error:", error);
      return "Error de conexión con el Coach AI.";
    }
  },

  /**
   * Chat interactivo del Coach AI
   */
  async startChat(
    history: ChatMessage[],
    message: string,
    profile: UserProfile,
    trades: Trade[]
  ): Promise<string> {
    if (!ai) {
      return (
        "Diagnóstico rápido: Coach AI desactivado.\n" +
        "Lo más importante ahora: Estás en entorno local.\n" +
        "Acción mínima: Prueba el chat en producción."
      );
    }

    const closedTrades = trades.filter(t => t.status === "Cerrado");
    const last10 = closedTrades.slice(-10);

    const total = closedTrades.length;
    const wins = closedTrades.filter(
      t => (t.pnl?.dollars || 0) > 0
    ).length;

    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0";
    const avgScore =
      total > 0
        ? (
            closedTrades.reduce((acc, t) => acc + t.qualityScore, 0) / total
          ).toFixed(1)
        : "0";
    const avgRR =
      total > 0
        ? (
            closedTrades.reduce((acc, t) => acc + (t.rr || 0), 0) / total
          ).toFixed(2)
        : "0";

    const statsContext = `
ESTADÍSTICAS OPERADOR (${profile.name})
Estilo: ${profile.traderStyle}
Mercados: ${profile.primaryMarkets.join(", ")}
Trades cerrados: ${total}
Win rate: ${winRate}%
Score promedio: ${avgScore}/10
RR promedio: ${avgRR}
Fortalezas: ${profile.strengths.join(", ")}
Debilidades: ${profile.weaknesses.join(", ")}
`;

    const historyMapped = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.parts }]
    }));

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `${CHAT_SYSTEM_INSTRUCTION}\n\nCONTEXTO REAL:\n${statsContext}`
      },
      history: historyMapped
    });

    try {
      const result = await chat.sendMessage({ message });
      return result.text || "No se pudo procesar la respuesta.";
    } catch (error) {
      console.error("Gemini chat error:", error);
      return (
        "Diagnóstico rápido: Error de conexión.\n" +
        "Lo más importante ahora: Mantén la calma.\n" +
        "Acción mínima: Reintenta el envío."
      );
    }
  }
};
