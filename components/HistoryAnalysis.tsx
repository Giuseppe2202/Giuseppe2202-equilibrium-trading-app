import React, { useState, useMemo, useRef, useEffect } from "react";
import { Trade, UserProfile, TradePnL, PartialExit } from "../types";
import { MARKETS, MOTIVES_NEGATIVE } from "../constants";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  List,
  BarChart2,
  ShieldAlert,
  TrendingUp,
  Clock,
  Target,
  Brain,
  Filter,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  TrendingDown,
  X,
  PieChart,
  Download,
  Share2,
  FileText,
  Table,
  FileJson,
  Image as ImageIcon,
  Sparkles,
  Loader2,
} from "lucide-react";
import { geminiService } from "../services/geminiService";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface HistoryAnalysisProps {
  trades: Trade[];
  profile: UserProfile;
  onUpdateTrades?: (trades: Trade[]) => void;
}

type EquityMode = "usd" | "percent" | "r";

const toLocalDatetimeInputValue = (date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const HistoryAnalysis: React.FC<HistoryAnalysisProps> = ({ trades, profile, onUpdateTrades }) => {
  const [activeTab, setActiveTab] = useState<"summary" | "setup" | "psycho" | "time" | "trades">("summary");
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [equityMode, setEquityMode] = useState<EquityMode>("usd");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const tradeDetailRef = useRef<HTMLDivElement>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [includeOpenInMass, setIncludeOpenInMass] = useState(false);

  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [isClosing, setIsClosing] = useState(false);
  const [closePrice, setClosePrice] = useState<string>("");
  const [closeDate, setCloseDate] = useState<string>(toLocalDatetimeInputValue());
  const [closeNote, setCloseNote] = useState<string>("");
  const [closeError, setCloseError] = useState<string | null>(null);

  const [isPartialClosing, setIsPartialClosing] = useState(false);
  const [partialPercentage, setPartialPercentage] = useState<string>("");
  const [partialPrice, setPartialPrice] = useState<string>("");
  const [partialDate, setPartialDate] = useState<string>(toLocalDatetimeInputValue());
  const [partialNote, setPartialNote] = useState<string>("");
  const [partialError, setPartialError] = useState<string | null>(null);
  const [showManualPercent, setShowManualPercent] = useState(false);

  const [filters, setFilters] = useState({
    limit: 50,
    status: "todos",
    direction: "ambos",
    market: "todos",
    asset: "",
    setup: "todos",
  });

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!showExportMenu) return;
      const target = e.target as Node;
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setShowExportMenu(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [showExportMenu]);

  const setupOptions = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => {
      if (t.setup) set.add(t.setup);
    });
    return ["todos", ...Array.from(set).sort()];
  }, [trades]);

  const realizedDollars = (t: Trade) => {
    const partial = t.partialExits?.reduce((acc, p) => acc + (p.pnlDollars || 0), 0) || 0;
    const closed = t.pnl?.dollars ?? 0;
    return t.status === "Cerrado" ? closed : partial;
  };

  const realizedR = (t: Trade) => {
    const partial = t.partialExits?.reduce((acc, p) => acc + (p.pnlR || 0), 0) || 0;
    const closed = t.pnl?.rMultiple ?? 0;
    return t.status === "Cerrado" ? closed : partial;
  };

  const realizedPercent = (t: Trade) => {
    const closed = t.pnl?.percent ?? 0;
    return t.status === "Cerrado" ? closed : 0;
  };

  const filteredTrades = useMemo(() => {
    let result = [...trades];

    if (filters.status !== "todos") result = result.filter((t) => t.status === filters.status);
    if (filters.direction !== "ambos") result = result.filter((t) => t.direction === filters.direction);
    if (filters.market !== "todos") result = result.filter((t) => t.market === filters.market);
    if (filters.asset) result = result.filter((t) => t.asset.toLowerCase().includes(filters.asset.toLowerCase()));
    if (filters.setup !== "todos") result = result.filter((t) => t.setup === filters.setup);

    const sorted = [...result].sort(
      (a, b) => new Date(a.tradeDateTime).getTime() - new Date(b.tradeDateTime).getTime()
    );

    return sorted.slice(-filters.limit);
  }, [trades, filters]);

  const closedTradesForMetrics = useMemo(() => filteredTrades.filter((t) => t.status === "Cerrado"), [filteredTrades]);

  const selectedTrade = useMemo(() => trades.find((t) => t.id === selectedTradeId), [trades, selectedTradeId]);

  const addExportBranding = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const headerHeight = 60;
    const newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height + headerHeight;

    const newCtx = newCanvas.getContext("2d");
    if (!newCtx) return canvas;

    newCtx.fillStyle = "#020610";
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    newCtx.fillStyle = "#ffffff";
    newCtx.font = "bold 24px Inter, sans-serif";
    newCtx.fillText("Equilibrium Trading Coach", 20, 35);

    newCtx.fillStyle = "#64748b";
    newCtx.font = "12px JetBrains Mono, monospace";
    newCtx.fillText(`Exportado: ${new Date().toLocaleString()}`, 20, 52);

    newCtx.drawImage(canvas, 0, headerHeight);

    newCtx.fillStyle = "rgba(255, 255, 255, 0.1)";
    newCtx.font = "bold 14px Inter, sans-serif";
    const watermarkText = "Equilibrium Trading Coach";
    const textWidth = newCtx.measureText(watermarkText).width;
    newCtx.fillText(watermarkText, newCanvas.width - textWidth - 20, newCanvas.height - 20);

    return newCanvas;
  };

  const exportAsImage = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: "#020610",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const brandedCanvas = addExportBranding(canvas);
      const link = document.createElement("a");
      link.download = `${fileName}.png`;
      link.href = brandedCanvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Export Error:", e);
    }
  };

  const exportAsPDF = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: "#020610",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const brandedCanvas = addExportBranding(canvas);
      const imgData = brandedCanvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: brandedCanvas.width > brandedCanvas.height ? "l" : "p",
        unit: "px",
        format: [brandedCanvas.width, brandedCanvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, brandedCanvas.width, brandedCanvas.height);
      pdf.save(`${fileName}.pdf`);
    } catch (e) {
      console.error("Export Error:", e);
    }
  };

  const shareContent = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, { backgroundColor: "#020610", scale: 2 });
      const brandedCanvas = addExportBranding(canvas);
      brandedCanvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "equilibrium-report.png", { type: "image/png" });
        if (navigator.share) {
          await navigator.share({ title: "Equilibrium Trading Coach Report", files: [file] });
        } else {
          alert("Web Share no soportado. Usa Descargar Imagen.");
        }
      });
    } catch (e) {
      console.error("Share Error:", e);
    }
  };

  const stats = useMemo(() => {
    const total = closedTradesForMetrics.length;
    if (total === 0) return { total: 0, winRate: 0, pnl: 0, avgScore: 0, avgRR: 0, pnlR: 0 };

    const wins = closedTradesForMetrics.filter((t) => (t.pnl?.dollars || 0) > 0).length;
    const totalPnl = closedTradesForMetrics.reduce((acc, t) => acc + (t.pnl?.dollars || 0), 0);
    const totalPnlR = closedTradesForMetrics.reduce((acc, t) => acc + (t.pnl?.rMultiple || 0), 0);
    const totalScore = closedTradesForMetrics.reduce((acc, t) => acc + (t.qualityScore || 0), 0);
    const totalRR = closedTradesForMetrics.reduce((acc, t) => acc + (t.rr || 0), 0);

    return {
      total,
      winRate: (wins / total) * 100,
      pnl: totalPnl,
      pnlR: totalPnlR,
      avgScore: totalScore / total,
      avgRR: totalRR / total,
    };
  }, [closedTradesForMetrics]);

  const exportFullHistoryPDF = () => {
    const pdf = new jsPDF("p", "pt", "a4");
    const margin = 40;
    let y = margin;

    const addHeader = (pageTitle: string) => {
      pdf.setFillColor(2, 6, 16);
      pdf.rect(0, 0, 595, 60, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.text("Equilibrium Trading Coach", margin, 35);
      pdf.setFontSize(10);
      pdf.text(pageTitle, margin, 50);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Fecha: ${new Date().toLocaleString()}`, 400, 35);
      y = 90;
    };

    const addWatermark = () => {
      pdf.setTextColor(200, 200, 200);
      pdf.setFontSize(8);
      pdf.text("Equilibrium Trading Coach", 460, 820);
    };

    addHeader("REPORTE INTEGRAL DE AUDITORÍA");
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`Resumen General. Operador: ${profile.name}`, margin, y);
    y += 20;
    pdf.setFontSize(10);
    pdf.text(`PnL Total: $${stats.pnl.toLocaleString()} (${stats.pnlR.toFixed(2)}R)`, margin, y);
    y += 15;
    pdf.text(`Win Rate: ${stats.winRate.toFixed(1)}% | Trades Totales: ${stats.total}`, margin, y);
    y += 15;
    pdf.text(`Score Promedio: ${stats.avgScore.toFixed(1)}/10`, margin, y);
    y += 30;

    pdf.setFontSize(12);
    pdf.text("Listado de Trades Filtrados", margin, y);
    y += 20;

    const tradesToExport = [...filteredTrades].reverse();
    tradesToExport.forEach((t) => {
      if (y > 750) {
        addWatermark();
        pdf.addPage();
        addHeader("CONTINUACIÓN LISTADO DE TRADES");
        pdf.setTextColor(0, 0, 0);
      }

      pdf.setFontSize(9);
      const statusColor = t.status === "Abierto" ? [0, 180, 216] : [100, 116, 139];
      pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.text(
        `${new Date(t.tradeDateTime).toLocaleDateString()} | ${t.asset} | ${t.direction.toUpperCase()} | Score: ${t.qualityScore}`,
        margin,
        y
      );

      pdf.setTextColor(0, 0, 0);
      pdf.text(`PnL: $${realizedDollars(t).toLocaleString()} | R: ${realizedR(t).toFixed(2)}`, 380, y);
      y += 15;
    });

    addWatermark();
    pdf.save("Equilibrium_Full_History.pdf");
  };

  const exportMassCSV = () => {
    const dataToExport = includeOpenInMass ? trades : trades.filter((t) => t.status === "Cerrado");
    const headers = ["ID", "Fecha", "Activo", "Direccion", "Setup", "Score", "PnL_USD", "PnL_R", "Status", "Tesis"];

    const rows = dataToExport.map((t) => [
      t.id.slice(0, 8),
      t.tradeDateTime,
      t.asset,
      t.direction,
      t.setup,
      t.qualityScore,
      realizedDollars(t),
      realizedR(t),
      t.status,
      `"${(t.thesis || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Equilibrium_Trades_Export.csv";
    link.click();
  };

  const exportMassJSON = () => {
    const dataToExport = includeOpenInMass ? trades : trades.filter((t) => t.status === "Cerrado");
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Equilibrium_Trades_Export.json";
    link.click();
  };

  const handleRequestAiAnalysis = async () => {
    if (!selectedTrade) return;
    setIsAiLoading(true);
    try {
      const result = await geminiService.getTradeCoachNotes(selectedTrade, profile);
      setAiAnalysis(result);
    } finally {
      setIsAiLoading(false);
    }
  };

  const equityData = useMemo(() => {
    let cumulative = 0;
    return filteredTrades.map((t, i) => {
      const val =
        equityMode === "usd"
          ? realizedDollars(t)
          : equityMode === "percent"
          ? realizedPercent(t)
          : realizedR(t);

      cumulative += val;
      const dateObj = new Date(t.tradeDateTime);
      return { index: i + 1, pnl: cumulative, date: `${dateObj.getDate()}/${dateObj.getMonth() + 1}` };
    });
  }, [filteredTrades, equityMode]);

  const setupStats = useMemo(() => {
    const groups: Record<string, any> = {};
    closedTradesForMetrics.forEach((t) => {
      if (!groups[t.setup]) groups[t.setup] = { name: t.setup, count: 0, wins: 0, pnl: 0, score: 0 };
      groups[t.setup].count++;
      if ((t.pnl?.dollars || 0) > 0) groups[t.setup].wins++;
      groups[t.setup].pnl += t.pnl?.dollars || 0;
      groups[t.setup].score += t.qualityScore || 0;
    });
    return Object.values(groups)
      .map((g: any) => ({
        ...g,
        winRate: Math.round((g.wins / g.count) * 100),
        avgScore: Number((g.score / g.count).toFixed(1)),
      }))
      .sort((a: any, b: any) => b.pnl - a.pnl);
  }, [closedTradesForMetrics]);

  const motiveStats = useMemo(() => {
    const groups: Record<string, any> = {};
    closedTradesForMetrics.forEach((t) => {
      if (!groups[t.motive]) groups[t.motive] = { name: t.motive, count: 0, pnl: 0, score: 0 };
      groups[t.motive].count++;
      groups[t.motive].pnl += t.pnl?.dollars || 0;
      groups[t.motive].score += t.qualityScore || 0;
    });
    return Object.values(groups)
      .map((g: any) => ({
        ...g,
        avgScore: g.score / g.count,
        isNegative: MOTIVES_NEGATIVE.includes(g.name) || g.pnl < 0,
      }))
      .sort((a: any, b: any) => b.count - a.count);
  }, [closedTradesForMetrics]);

  const timeGroupings = useMemo(() => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const dayStats = days.map((d) => ({ name: d, pnl: 0, count: 0, wins: 0, score: 0 }));
    const hourStats = Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, pnl: 0, count: 0, wins: 0, score: 0 }));
    const monthStats = months.map((m) => ({ name: m, pnl: 0, count: 0, wins: 0, score: 0 }));
    const weekStats = Array.from({ length: 5 }, (_, i) => ({ name: `Sem ${i + 1}`, pnl: 0, count: 0, wins: 0, score: 0 }));

    closedTradesForMetrics.forEach((t) => {
      const d = new Date(t.tradeDateTime);
      const day = d.getDay();
      const hour = d.getHours();
      const month = d.getMonth();
      const week = Math.floor((d.getDate() - 1) / 7);

      const update = (obj: any) => {
        obj.count++;
        obj.pnl += t.pnl?.dollars || 0;
        obj.score += t.qualityScore || 0;
        if ((t.pnl?.dollars || 0) > 0) obj.wins++;
      };

      update(dayStats[day]);
      update(hourStats[hour]);
      update(monthStats[month]);
      if (weekStats[week]) update(weekStats[week]);
    });

    const finalize = (arr: any[]) =>
      arr.map((item) => ({
        ...item,
        winRate: item.count > 0 ? Math.round((item.wins / item.count) * 100) : 0,
        avgScore: item.count > 0 ? Number((item.score / item.count).toFixed(1)) : 0,
      }));

    return {
      day: finalize(dayStats),
      hour: finalize(hourStats),
      month: finalize(monthStats),
      week: finalize(weekStats),
    };
  }, [closedTradesForMetrics]);

  const handleConfirmClose = () => {
    if (!selectedTrade) return;

    const price = parseFloat(closePrice);
    if (isNaN(price) || price <= 0) {
      setCloseError("El precio de cierre debe ser un valor positivo.");
      return;
    }
    if (!closeNote.trim()) {
      setCloseError("La nota de cierre es obligatoria para el cierre total.");
      return;
    }

    const entry = selectedTrade.entry;
    const units =
      selectedTrade.remainingPositionSizeUnits !== undefined
        ? selectedTrade.remainingPositionSizeUnits
        : selectedTrade.positionSizeUnits;

    if (units <= 0) {
      setCloseError("No queda tamaño de posición para cerrar.");
      return;
    }

    const isLong = selectedTrade.direction === "long";
    const diff = price - entry;
    const multiplier = isLong ? 1 : -1;

    const currentDollars = diff * units * multiplier;
    const partialsTotalDollars = selectedTrade.partialExits?.reduce((acc, p) => acc + p.pnlDollars, 0) || 0;
    const finalDollars = partialsTotalDollars + currentDollars;

    const riskPerUnit = Math.abs(entry - selectedTrade.stopLoss);
    const initialRiskAmount = riskPerUnit * selectedTrade.positionSizeUnits;
    const finalRMultiple = initialRiskAmount === 0 ? 0 : finalDollars / initialRiskAmount;
    const finalPercent = finalRMultiple * (selectedTrade.riskR || 0);

    const updatedPnl: TradePnL = { dollars: finalDollars, percent: finalPercent, rMultiple: finalRMultiple };

    const updatedTrade: Trade = {
      ...selectedTrade,
      status: "Cerrado",
      exitPrice: price,
      exitDateTime: closeDate,
      closingNote: closeNote,
      pnl: updatedPnl,
      remainingPositionSizeUnits: 0,
    };

    const newTrades = trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t));
    onUpdateTrades?.(newTrades);

    setIsClosing(false);
    setClosePrice("");
    setCloseNote("");
    setCloseError(null);
  };

  const handleConfirmPartialClose = () => {
    if (!selectedTrade) return;

    const percentage = parseFloat(partialPercentage);
    const price = parseFloat(partialPrice);

    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      setPartialError("El porcentaje debe estar entre 1 y 100.");
      return;
    }
    if (isNaN(price) || price <= 0) {
      setPartialError("El precio de cierre debe ser un valor positivo.");
      return;
    }

    if (percentage === 100) {
      const entry = selectedTrade.entry;
      const units =
        selectedTrade.remainingPositionSizeUnits !== undefined
          ? selectedTrade.remainingPositionSizeUnits
          : selectedTrade.positionSizeUnits;

      const isLong = selectedTrade.direction === "long";
      const diff = price - entry;
      const multiplier = isLong ? 1 : -1;

      const currentDollars = diff * units * multiplier;
      const partialsTotalDollars = selectedTrade.partialExits?.reduce((acc, p) => acc + p.pnlDollars, 0) || 0;
      const finalDollars = partialsTotalDollars + currentDollars;

      const riskPerUnit = Math.abs(entry - selectedTrade.stopLoss);
      const initialRiskAmount = riskPerUnit * selectedTrade.positionSizeUnits;
      const finalRMultiple = initialRiskAmount === 0 ? 0 : finalDollars / initialRiskAmount;
      const finalPercent = finalRMultiple * (selectedTrade.riskR || 0);

      const updatedPnl: TradePnL = { dollars: finalDollars, percent: finalPercent, rMultiple: finalRMultiple };

      const updatedTrade: Trade = {
        ...selectedTrade,
        status: "Cerrado",
        exitPrice: price,
        exitDateTime: partialDate,
        closingNote: partialNote,
        pnl: updatedPnl,
        remainingPositionSizeUnits: 0,
      };

      const newTrades = trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t));
      onUpdateTrades?.(newTrades);

      setIsPartialClosing(false);
      setPartialPercentage("");
      setPartialPrice("");
      setPartialNote("");
      setPartialError(null);
      return;
    }

    const entry = selectedTrade.entry;
    const originalUnits = selectedTrade.positionSizeUnits;

    const currentRemainingUnits =
      selectedTrade.remainingPositionSizeUnits !== undefined ? selectedTrade.remainingPositionSizeUnits : originalUnits;

    const unitsToClose = (percentage / 100) * originalUnits;

    if (unitsToClose > currentRemainingUnits + 0.0000001) {
      setPartialError(`Solo queda un ${((currentRemainingUnits / originalUnits) * 100).toFixed(1)}% disponible.`);
      return;
    }

    const isLong = selectedTrade.direction === "long";
    const diff = price - entry;
    const multiplier = isLong ? 1 : -1;

    const partialDollars = diff * unitsToClose * multiplier;

    const riskPerUnit = Math.abs(entry - selectedTrade.stopLoss);
    const initialRiskAmount = riskPerUnit * originalUnits;
    const partialR = initialRiskAmount === 0 ? 0 : partialDollars / initialRiskAmount;

    const newPartial: PartialExit = {
      id: crypto.randomUUID(),
      percentage,
      price,
      dateTime: partialDate,
      note: partialNote,
      pnlDollars: partialDollars,
      pnlR: partialR,
    };

    const updatedTrade: Trade = {
      ...selectedTrade,
      remainingPositionSizeUnits: currentRemainingUnits - unitsToClose,
      partialExits: [...(selectedTrade.partialExits || []), newPartial],
    };

    const newTrades = trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t));
    onUpdateTrades?.(newTrades);

    setIsPartialClosing(false);
    setPartialPercentage("");
    setPartialPrice("");
    setPartialNote("");
    setPartialError(null);
  };

  if (selectedTrade) {
    const currentRemainingPercent =
      selectedTrade.remainingPositionSizeUnits !== undefined
        ? (selectedTrade.remainingPositionSizeUnits / selectedTrade.positionSizeUnits) * 100
        : 100;

    const realizedDollarsSelected =
      (selectedTrade.pnl?.dollars || 0) ||
      (selectedTrade.partialExits?.reduce((acc, p) => acc + p.pnlDollars, 0) || 0);

    const realizedRSelected =
      (selectedTrade.pnl?.rMultiple || 0) ||
      (selectedTrade.partialExits?.reduce((acc, p) => acc + p.pnlR, 0) || 0);

    return (
      <div className="min-h-screen bg-navy p-4 md:p-8 animate-fade-in relative">
        {isClosing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-navy-light cyber-border p-6 rounded-2xl space-y-6 animate-slide-in shadow-2xl">
              <div className="flex justify-between items-center border-b border-navy-accent pb-3">
                <h3 className="text-sm font-black italic text-white uppercase tracking-widest">Protocolo de Cierre Final</h3>
                <button onClick={() => setIsClosing(false)} className="text-slate-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Precio de Salida Final</p>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    value={closePrice}
                    onChange={(e) => setClosePrice(e.target.value)}
                    className="w-full bg-navy border border-navy-accent rounded-lg p-3 text-white text-sm outline-none focus:border-cyan transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Fecha y Hora</p>
                  <input
                    type="datetime-local"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                    className="w-full bg-navy border border-navy-accent rounded-lg p-3 text-white text-sm outline-none focus:border-cyan"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-mono text-slate-500 uppercase">Nota de Cierre (Obligatoria)</p>
                    <span className="text-[8px] font-mono text-red-500 uppercase">Requerido</span>
                  </div>
                  <textarea
                    value={closeNote}
                    onChange={(e) => setCloseNote(e.target.value)}
                    placeholder="Describe el desenlace y aprendizajes..."
                    className="w-full bg-navy border border-navy-accent rounded-lg p-3 text-white text-xs outline-none min-h-[80px] focus:border-cyan"
                  />
                </div>

                {closeError && <p className="text-[9px] text-red-500 font-mono mt-1 uppercase text-center">{closeError}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsClosing(false)}
                  className="flex-1 py-3 bg-navy-accent text-slate-300 rounded-lg text-[10px] font-bold uppercase hover:bg-navy-accent/80 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmClose}
                  className="flex-[2] py-3 bg-cyan text-navy rounded-lg text-[10px] font-black uppercase hover:brightness-110 shadow-glow transition-all"
                >
                  Ejecutar Cierre Total
                </button>
              </div>
            </div>
          </div>
        )}

        {isPartialClosing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-navy-light cyber-border p-6 rounded-2xl space-y-6 animate-slide-in shadow-2xl">
              <div className="flex justify-between items-center border-b border-navy-accent pb-3">
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-gold" />
                  <h3 className="text-sm font-black italic text-white uppercase tracking-widest">Salida Parcial</h3>
                </div>
                <button onClick={() => setIsPartialClosing(false)} className="text-slate-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-navy p-3 rounded-xl border border-navy-accent text-[10px] font-mono text-slate-400 flex justify-between">
                <div>
                  <p>
                    ACTIVO: <span className="text-white">{selectedTrade.asset}</span>
                  </p>
                  <p>
                    DISPONIBLE: <span className="text-gold">{currentRemainingPercent.toFixed(1)}%</span>
                  </p>
                </div>
                <div className="text-right">
                  <p>
                    DIRECCIÓN:{" "}
                    <span className={selectedTrade.direction === "long" ? "text-green-500" : "text-red-500"}>
                      {selectedTrade.direction.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Seleccionar Porcentaje</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[25, 50, 75, 100].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setPartialPercentage(p.toString());
                          setShowManualPercent(false);
                        }}
                        className={`py-2 rounded border text-[10px] font-black transition-all ${
                          partialPercentage === p.toString() && !showManualPercent
                            ? "bg-gold text-navy border-gold shadow-md"
                            : "bg-navy border-navy-accent text-slate-400 hover:border-gold/40"
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                    <button
                      onClick={() => setShowManualPercent(true)}
                      className={`py-2 rounded border text-[10px] font-black transition-all ${
                        showManualPercent
                          ? "bg-gold text-navy border-gold shadow-md"
                          : "bg-navy border-navy-accent text-slate-400 hover:border-gold/40"
                      }`}
                    >
                      MAN
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-slate-500 uppercase">Porcentaje (%)</p>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={partialPercentage}
                      onChange={(e) => {
                        setPartialPercentage(e.target.value);
                        if (!showManualPercent) setShowManualPercent(true);
                      }}
                      placeholder="1-100"
                      className="w-full bg-navy border border-navy-accent rounded-lg p-3 text-white text-sm outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-slate-500 uppercase">Precio Cierre</p>
                    <input
                      type="number"
                      step="any"
                      autoFocus
                      value={partialPrice}
                      onChange={(e) => setPartialPrice(e.target.value)}
                      className="w-full bg-navy border border-navy-accent rounded-lg p-3 text-white text-sm outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Fecha y Hora</p>
                  <input
                    type="datetime-local"
                    value={partialDate}
                    onChange={(e) => setPartialDate(e.target.value)}
                    className="w-full bg-navy border border-navy-accent rounded-lg p-3 text-white text-sm outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Nota Parcial (Opcional)</p>
                  <textarea
                    value={partialNote}
                    onChange={(e) => setPartialNote(e.target.value)}
                    placeholder="Comentario sobre esta salida parcial..."
                    className="w-full bg-navy border border-navy-accent rounded-lg p-3 text-white text-xs outline-none min-h-[60px] focus:border-gold"
                  />
                </div>

                {partialError && <p className="text-[9px] text-red-500 font-mono text-center uppercase">{partialError}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsPartialClosing(false)}
                  className="flex-1 py-3 bg-navy-accent text-slate-300 rounded-lg text-[10px] font-bold uppercase hover:bg-navy-accent/80 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmPartialClose}
                  className="flex-[2] py-3 bg-gold text-navy rounded-lg text-[10px] font-black uppercase hover:brightness-110 shadow-lg shadow-gold/20 transition-all"
                >
                  Confirmar Salida
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setSelectedTradeId(null)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase text-[10px] font-mono tracking-widest"
            >
              <ArrowLeft size={16} /> Volver al Historial
            </button>

            <div className="flex gap-3 items-center">
              <button
                onClick={() => exportAsPDF(tradeDetailRef, `Trade_${selectedTrade.asset}_${selectedTrade.id.slice(0, 4)}`)}
                className="p-2 text-slate-400 hover:text-white"
                title="Descargar PDF"
              >
                <FileText size={18} />
              </button>
              <button
                onClick={() => exportAsImage(tradeDetailRef, `Trade_${selectedTrade.asset}_${selectedTrade.id.slice(0, 4)}`)}
                className="p-2 text-slate-400 hover:text-white"
                title="Descargar PNG"
              >
                <ImageIcon size={18} />
              </button>

              {selectedTrade.status === "Abierto" && (
                <>
                  <button
                    onClick={() => {
                      setPartialPercentage("");
                      setPartialPrice("");
                      setPartialError(null);
                      setIsPartialClosing(true);
                      setShowManualPercent(false);
                      setPartialDate(toLocalDatetimeInputValue());
                    }}
                    className="px-6 py-2 border border-gold/40 text-gold rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gold/5 transition-all"
                  >
                    Cerrar parcial
                  </button>
                  <button
                    onClick={() => {
                      setClosePrice("");
                      setCloseNote("");
                      setCloseError(null);
                      setCloseDate(toLocalDatetimeInputValue());
                      setIsClosing(true);
                    }}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-red-500/20 transition-all"
                  >
                    Cerrar total
                  </button>
                </>
              )}
            </div>
          </div>

          <div ref={tradeDetailRef} className="bg-navy-light cyber-border rounded-2xl p-6 md:p-10 space-y-8 shadow-xl">
            <div className="flex justify-between items-start border-b border-navy-accent pb-6">
              <div>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">{selectedTrade.asset}</h2>
                <p className="text-xs font-mono text-slate-500 mt-1 uppercase">
                  ID Operativa: {selectedTrade.id.slice(0, 8)} // {new Date(selectedTrade.tradeDateTime).toLocaleString()}
                </p>

                <div className="grid grid-cols-3 gap-2 mt-4 bg-navy/50 p-3 rounded-xl border border-navy-accent/50 max-w-sm">
                  <div className="text-center">
                    <p className="text-[8px] font-mono text-slate-500 uppercase">Entry</p>
                    <p className="text-xs font-bold text-white">{selectedTrade.entry}</p>
                  </div>
                  <div className="text-center border-x border-navy-accent/50">
                    <p className="text-[8px] font-mono text-slate-500 uppercase">Stop Loss</p>
                    <p className="text-xs font-bold text-red-400">{selectedTrade.stopLoss}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-mono text-slate-500 uppercase">Take Profit</p>
                    <p className="text-xs font-bold text-green-400">{selectedTrade.takeProfits?.[0]}</p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-2xl font-black italic ${
                    selectedTrade.direction === "long" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {selectedTrade.direction.toUpperCase()}
                </span>
                <p
                  className={`text-[10px] font-mono uppercase mt-1 ${
                    selectedTrade.status === "Abierto" ? "text-cyan animate-pulse" : "text-slate-500"
                  }`}
                >
                  Status: {selectedTrade.status.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-navy p-4 rounded-xl border border-navy-accent">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">PNL Realizado</p>
                <p className={`text-xl font-bold ${realizedDollarsSelected >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${realizedDollarsSelected.toLocaleString()}
                </p>
              </div>

              <div className="bg-navy p-4 rounded-xl border border-navy-accent">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Resultado R</p>
                <p className="text-xl font-bold text-white">{realizedRSelected.toFixed(2)}R</p>
              </div>

              <div className="bg-navy p-4 rounded-xl border border-navy-accent">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Remaining Size</p>
                <p className="text-xl font-bold text-cyan">{currentRemainingPercent.toFixed(1)}%</p>
              </div>

              <div className="bg-navy p-4 rounded-xl border border-navy-accent">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Quality Score</p>
                <p className="text-xl font-bold text-gold">{selectedTrade.qualityScore}/10</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] border-b border-navy-accent pb-2">
                  Tesis y Contexto
                </h3>
                <div className="bg-navy p-4 rounded-xl space-y-4 border border-navy-accent/30">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Setup Empleado:</p>
                    <p className="text-sm font-bold text-slate-200">{selectedTrade.setup}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Tesis Técnica:</p>
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      "{selectedTrade.thesis || "Sin tesis registrada"}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-navy-accent pb-2">
                  <h3 className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em]">AI DIAGNOSTIC</h3>
                  <button
                    onClick={handleRequestAiAnalysis}
                    disabled={isAiLoading}
                    className="flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/30 text-gold rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-gold/20 transition-all disabled:opacity-50"
                  >
                    {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generar
                  </button>
                </div>

                {aiAnalysis ? (
                  <div className="bg-navy p-4 rounded-xl border border-gold/20 text-[11px] text-slate-300 font-mono italic leading-relaxed whitespace-pre-wrap">
                    {aiAnalysis}
                  </div>
                ) : (
                  <div className="bg-navy p-4 rounded-xl border border-navy-accent text-slate-600 text-[10px] font-mono italic">
                    Análisis no solicitado.
                  </div>
                )}
              </div>
            </div>

            {selectedTrade.images?.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] border-b border-navy-accent pb-2">
                  Evidencia Gráfica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTrade.images.map((img: any, i: number) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-navy-accent aspect-video bg-navy group relative">
                      <img src={img.base64} alt={`Chart ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 border border-dashed border-navy-accent rounded-xl text-center text-slate-600 text-[10px] font-mono uppercase italic">
                Sin imagen adjunta
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between bg-navy-light cyber-border p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-black italic text-white uppercase tracking-widest">Auditoría Operativa</h2>
          <div className="flex gap-1">
            <button
              onClick={() => exportAsImage(contentRef, `Audit_${activeTab}`)}
              className="p-2 text-slate-400 hover:text-cyan transition-all"
              title="Descargar esta pestaña (PNG)"
            >
              <ImageIcon size={18} />
            </button>
            <button
              onClick={() => exportAsPDF(contentRef, `Audit_${activeTab}`)}
              className="p-2 text-slate-400 hover:text-cyan transition-all"
              title="Descargar esta pestaña (PDF)"
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => shareContent(contentRef)}
              className="p-2 text-slate-400 hover:text-cyan transition-all"
              title="Compartir"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gold/20 transition-all"
            >
              <Download size={14} /> Historial Completo
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-navy-light border border-navy-accent rounded-xl shadow-2xl z-50 p-3 space-y-3 animate-fade-in">
                <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest border-b border-navy-accent pb-1">
                  Opciones Masivas
                </p>

                <button
                  onClick={() => {
                    exportFullHistoryPDF();
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-2 text-white hover:bg-white/5 rounded transition-all text-[10px] font-bold uppercase"
                >
                  <FileText size={14} className="text-red-400" /> Generar Reporte PDF
                </button>

                <button
                  onClick={() => {
                    exportMassCSV();
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-2 text-white hover:bg-white/5 rounded transition-all text-[10px] font-bold uppercase"
                >
                  <Table size={14} className="text-green-400" /> Exportar CSV
                </button>

                <button
                  onClick={() => {
                    exportMassJSON();
                    setShowExportMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-2 text-white hover:bg-white/5 rounded transition-all text-[10px] font-bold uppercase"
                >
                  <FileJson size={14} className="text-blue-400" /> Exportar JSON
                </button>

                <div className="pt-2 border-t border-navy-accent flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeOpen"
                    checked={includeOpenInMass}
                    onChange={(e) => setIncludeOpenInMass(e.target.checked)}
                    className="accent-gold"
                  />
                  <label htmlFor="includeOpen" className="text-[8px] font-mono text-slate-400 uppercase cursor-pointer">
                    Incluir trades abiertos
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-navy-light cyber-border p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-cyan" />
            <h2 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Panel de Auditoría // Filtros Operativos
            </h2>
          </div>
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-tight italic">
            Métricas calculadas solo con trades cerrados
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <div className="space-y-1">
            <p className="text-[9px] font-mono text-slate-600 uppercase ml-1">Límite</p>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
              className="w-full bg-navy border border-navy-accent rounded p-2 text-xs text-white outline-none"
            >
              <option value={10}>Últimos 10</option>
              <option value={20}>Últimos 20</option>
              <option value={50}>Últimos 50</option>
              <option value={100}>Últimos 100</option>
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-[9px] font-mono text-slate-600 uppercase ml-1">Estado</p>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full bg-navy border border-navy-accent rounded p-2 text-xs text-white outline-none"
            >
              <option value="todos">Todos</option>
              <option value="Abierto">Abiertos</option>
              <option value="Cerrado">Cerrados</option>
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-[9px] font-mono text-slate-600 uppercase ml-1">Dirección</p>
            <select
              value={filters.direction}
              onChange={(e) => setFilters({ ...filters, direction: e.target.value as any })}
              className="w-full bg-navy border border-navy-accent rounded p-2 text-xs text-white outline-none"
            >
              <option value="ambos">Ambos</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-[9px] font-mono text-slate-600 uppercase ml-1">Mercado</p>
            <select
              value={filters.market}
              onChange={(e) => setFilters({ ...filters, market: e.target.value as any })}
              className="w-full bg-navy border border-navy-accent rounded p-2 text-xs text-white outline-none"
            >
              <option value="todos">Todos</option>
              {MARKETS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-[9px] font-mono text-slate-600 uppercase ml-1">Activo</p>
            <input
              type="text"
              value={filters.asset}
              onChange={(e) => setFilters({ ...filters, asset: e.target.value })}
              placeholder="Buscar..."
              className="w-full bg-navy border border-navy-accent rounded p-2 text-xs text-white outline-none placeholder:text-slate-700"
            />
          </div>

          <div className="space-y-1">
            <p className="text-[9px] font-mono text-slate-600 uppercase ml-1">Setup</p>
            <select
              value={filters.setup}
              onChange={(e) => setFilters({ ...filters, setup: e.target.value })}
              className="w-full bg-navy border border-navy-accent rounded p-2 text-xs text-white outline-none"
            >
              {setupOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "todos" ? "Todos" : s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({ limit: 50, status: "todos", direction: "ambos", market: "todos", asset: "", setup: "todos" })
              }
              className="w-full py-2 bg-navy-accent text-slate-400 rounded text-[10px] font-bold uppercase border border-navy-accent hover:border-cyan/30 transition-all"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-navy-accent">
        {[
          { id: "summary", label: "Resumen", icon: BarChart2 },
          { id: "setup", label: "Por Setup", icon: Target },
          { id: "psycho", label: "Psicología", icon: Brain },
          { id: "time", label: "Tiempo", icon: Clock },
          { id: "trades", label: "Trades", icon: List },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === tab.id ? "border-cyan text-cyan bg-cyan/5" : "border-transparent text-slate-500 hover:text-white"
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <div ref={contentRef} className="animate-fade-in min-h-[400px]">
        {activeTab === "summary" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryCard
                label="PNL TOTAL"
                value={`$${stats.pnl.toLocaleString()}`}
                sub={`${stats.pnlR.toFixed(1)}R`}
                trend={stats.pnl >= 0 ? "up" : "down"}
              />
              <SummaryCard
                label="WIN RATE"
                value={`${stats.winRate.toFixed(1)}%`}
                sub={`${stats.total} Cerrados`}
                trend="none"
              />
              <SummaryCard label="SCORE AVG" value={stats.avgScore.toFixed(1)} sub="Calidad Ejecución" trend="none" />
              <SummaryCard label="RR PROM" value={`1:${stats.avgRR.toFixed(2)}`} sub="Ratio Riesgo" trend="none" />
              <SummaryCard label="STATUS" value="ESTABLE" sub="Auditoría OK" trend="none" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-navy-light rounded-2xl cyber-border p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Curva de Equidad</p>
                  <div className="flex gap-2 p-1 bg-navy rounded-lg border border-navy-accent">
                    {(["usd", "percent", "r"] as EquityMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setEquityMode(mode)}
                        className={`px-3 py-1 text-[9px] font-black uppercase rounded transition-all ${
                          equityMode === mode ? "bg-cyan text-navy" : "text-slate-500 hover:text-white"
                        }`}
                      >
                        {mode === "usd" ? "USD" : mode === "percent" ? "%" : "R"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityData}>
                      <defs>
                        <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#00b4d8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={10}
                        tick={{ fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={(val) =>
                          equityMode === "usd" ? `$${val}` : equityMode === "percent" ? `${val}%` : `${val}R`
                        }
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#020610", border: "1px solid #1e293b", borderRadius: "8px" }}
                        labelStyle={{ color: "#64748b", fontSize: "10px" }}
                        itemStyle={{ color: "#00b4d8", fontSize: "12px", fontWeight: "bold" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pnl"
                        stroke="#00b4d8"
                        fillOpacity={1}
                        fill="url(#colorPnl)"
                        strokeWidth={3}
                        animationDuration={1000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-navy-light p-6 rounded-2xl cyber-border-gold space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="text-gold" size={18} />
                  <h3 className="text-sm font-black italic text-white uppercase tracking-wider">Diagnóstico Auditoría</h3>
                </div>

                <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-mono">
                  <div className="p-3 bg-navy/40 border-l-2 border-cyan rounded-r-lg">
                    <p className="text-white font-bold mb-1">EFICIENCIA TÉCNICA</p>
                    <p>Tu ventaja se concentra en trades con Score superior al promedio.</p>
                  </div>

                  <div className="p-3 bg-navy/40 border-l-2 border-red-500/50 rounded-r-lg">
                    <p className="text-white font-bold mb-1">RIESGO DETECTADO</p>
                    <p>
                      {(
                        (closedTradesForMetrics.filter((t) => (t.qualityScore || 0) < 5).length /
                          (closedTradesForMetrics.length || 1)) *
                        100
                      ).toFixed(0)}
                      % de operaciones fuera de parámetros.
                    </p>
                  </div>

                  <div className="p-3 bg-navy/40 border-l-2 border-gold rounded-r-lg">
                    <p className="text-white font-bold mb-1">SESgo PSICOLÓGICO</p>
                    <p>Frecuencia elevada de estados negativos en trades cerrados.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "setup" && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-navy-light cyber-border p-6 rounded-2xl">
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-8">Rendimiento por Estrategia</p>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={setupStats} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis type="category" dataKey="name" stroke="#f1f5f9" fontSize={11} width={120} />
                    <Tooltip
                      cursor={{ fill: "#1e293b" }}
                      contentStyle={{ backgroundColor: "#020610", border: "1px solid #1e293b" }}
                    />
                    <Bar dataKey="pnl" name="PnL USD" fill="#00b4d8" radius={[0, 4, 4, 0]}>
                      {setupStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#00b4d8" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "psycho" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-white italic uppercase tracking-widest border-l-2 border-cyan pl-3">
                Correlación Psicológica
              </h3>
              <div className="space-y-3">
                {motiveStats.map((m: any) => (
                  <div
                    key={m.name}
                    className={`p-4 rounded-xl flex justify-between items-center group transition-all border ${
                      m.isNegative ? "bg-red-500/5 border-red-500/20" : "bg-navy-light border-navy-accent hover:border-gold/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Brain
                        size={16}
                        className={`${m.isNegative ? "text-red-500" : "text-slate-500 group-hover:text-gold"} transition-colors`}
                      />
                      <div>
                        <p className={`text-xs font-bold uppercase ${m.isNegative ? "text-red-400" : "text-slate-200"}`}>
                          {m.name}
                        </p>
                        <p className="text-[9px] font-mono text-slate-500 uppercase">{m.count} Operaciones</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${m.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ${m.pnl.toLocaleString()}
                      </p>
                      <p className={`text-[9px] font-mono uppercase ${m.isNegative ? "text-red-500" : "text-gold"}`}>
                        Score {m.avgScore.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-white italic uppercase tracking-widest border-l-2 border-cyan pl-3">
                Distribución
              </h3>
              <div className="h-64 bg-navy-light cyber-border rounded-xl p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={motiveStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" fontSize={8} stroke="#64748b" hide />
                    <YAxis fontSize={8} stroke="#64748b" />
                    <Tooltip
                      cursor={{ fill: "#1e293b" }}
                      contentStyle={{ backgroundColor: "#020610", border: "1px solid #1e293b", borderRadius: "4px" }}
                    />
                    <Bar dataKey="pnl" animationDuration={1000}>
                      {motiveStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.isNegative ? "#ef4444" : "#00b4d8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl">
                <p className="text-[10px] font-mono text-red-500 uppercase font-black mb-1 flex items-center gap-2">
                  <AlertCircle size={12} /> Alerta
                </p>
                <p className="text-[10px] text-slate-400 italic font-mono leading-relaxed">
                  Estados en rojo indican fuga sistemática de capital en trades cerrados.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "time" && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-white italic uppercase tracking-widest border-l-2 border-cyan pl-3">
                  Rendimiento Semanal
                </h3>
                <div className="h-48 bg-navy-light cyber-border rounded-xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeGroupings.day}>
                      <XAxis dataKey="name" fontSize={10} stroke="#64748b" />
                      <YAxis fontSize={10} stroke="#64748b" hide />
                      <Tooltip contentStyle={{ backgroundColor: "#020610" }} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {timeGroupings.day.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#00b4d8" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-white italic uppercase tracking-widest border-l-2 border-cyan pl-3">
                  Distribución Horaria
                </h3>
                <div className="h-48 bg-navy-light cyber-border rounded-xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeGroupings.hour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} stroke="#64748b" interval={3} />
                      <Tooltip contentStyle={{ backgroundColor: "#020610" }} />
                      <Area type="monotone" dataKey="pnl" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-white italic uppercase tracking-widest border-l-2 border-cyan pl-3">
                  Mes del Año
                </h3>
                <div className="h-48 bg-navy-light cyber-border rounded-xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeGroupings.month}>
                      <XAxis dataKey="name" fontSize={10} stroke="#64748b" />
                      <YAxis fontSize={10} stroke="#64748b" hide />
                      <Tooltip contentStyle={{ backgroundColor: "#020610" }} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {timeGroupings.month.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#00b4d8" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-white italic uppercase tracking-widest border-l-2 border-cyan pl-3">
                  Semana del Mes
                </h3>
                <div className="h-48 bg-navy-light cyber-border rounded-xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeGroupings.week}>
                      <XAxis dataKey="name" fontSize={10} stroke="#64748b" />
                      <YAxis fontSize={10} stroke="#64748b" hide />
                      <Tooltip contentStyle={{ backgroundColor: "#020610" }} />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {timeGroupings.week.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#00b4d8" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "trades" && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex justify-between items-center px-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
              <span className="flex-[2]">Fecha / Activo</span>
              <span className="flex-1 text-center">Setup</span>
              <span className="flex-1 text-center">Score</span>
              <span className="flex-1 text-right">Resultado</span>
            </div>

            {[...filteredTrades].reverse().map((t) => {
              const dollars = realizedDollars(t);
              const r = realizedR(t);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTradeId(t.id)}
                  className="bg-navy-light border border-navy-accent p-4 rounded-xl hover:border-cyan/50 hover:bg-navy-accent/10 cursor-pointer transition-all flex items-center group"
                >
                  <div className="flex-[2] flex items-center gap-3">
                    <div className={`w-1 h-8 rounded-full ${t.direction === "long" ? "bg-green-500" : "bg-red-500"}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm uppercase">{t.asset}</p>
                        <span
                          className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-tighter ${
                            t.status === "Abierto"
                              ? "bg-cyan/20 text-cyan border border-cyan/30 animate-pulse"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {t.status === "Abierto" ? "ABIERTO" : "CERRADO"}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase">
                        {new Date(t.tradeDateTime).toLocaleDateString()} • {t.direction.toUpperCase()}
                      </p>
                      <p className="text-[9px] font-mono text-slate-400 uppercase mt-0.5 tracking-tighter">
                        E: {t.entry} | SL: {t.stopLoss} | TP: {t.takeProfits?.[0]}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{t.setup}</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center">
                    <span
                      className={`text-sm font-black ${
                        t.qualityScore >= 8 ? "text-white" : t.qualityScore >= 5 ? "text-gold" : "text-red-500"
                      }`}
                    >
                      {t.qualityScore}
                    </span>
                    <div className="flex gap-0.5 mt-1">
                      {t.alertsTriggered?.map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-red-500" />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 text-right">
                    <p className={`text-sm font-black ${dollars >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ${dollars.toLocaleString()}
                    </p>
                    <p className="text-[9px] font-mono text-slate-600 uppercase">{r.toFixed(2)}R</p>
                  </div>

                  <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={16} className="text-cyan" />
                  </div>
                </div>
              );
            })}

            {filteredTrades.length === 0 && (
              <p className="text-center text-slate-400 font-mono py-12 uppercase text-xs tracking-widest border border-dashed border-navy-accent rounded-2xl">
                Sin registros coincidentes
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  trend: "up" | "down" | "none";
}) => (
  <div className="bg-navy-light border border-navy-accent p-5 rounded-2xl text-center space-y-1 relative overflow-hidden group hover:border-cyan/40 transition-all shadow-md">
    <p className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.3em]">{label}</p>
    <p
      className={`text-xl font-black italic tracking-tighter ${
        trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-white"
      }`}
    >
      {value}
    </p>
    <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest opacity-80">{sub}</p>
    {trend === "up" && <TrendingUp size={40} className="absolute -bottom-2 -right-2 text-green-500/5 rotate-12" />}
    {trend === "down" && <TrendingDown size={40} className="absolute -bottom-2 -right-2 text-red-500/5 -rotate-12" />}
  </div>
);

export default HistoryAnalysis;
