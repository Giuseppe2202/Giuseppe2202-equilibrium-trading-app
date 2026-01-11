import React, { useEffect, useState } from "react";
import { UserProfile, Trade } from "./types";
import { storageService } from "./services/storageService";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import NewTradeWizard from "./components/NewTradeWizard";
import HistoryAnalysis from "./components/HistoryAnalysis";
import CoachChat from "./components/CoachChat";
import AlertOverlay, { Alert } from "./components/AlertOverlay";
import { ArrowLeft, LogOut, Edit, Briefcase } from "lucide-react";
import { AuthGate } from "./components/AuthGate";
import { supabase } from "./services/supabaseClient";

type View =
  | "dashboard"
  | "new-trade"
  | "history"
  | "coach"
  | "editing-profile"
  | "profile";

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const savedProfile = storageService.getProfile();
    const savedTrades = storageService.getTrades();

    if (savedProfile) setProfile(savedProfile);
    setTrades(savedTrades && savedTrades.length > 0 ? savedTrades : []);
  }, []);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const addAlert = (
    message: string,
    type: "warning" | "error" | "info" = "info"
  ) => {
    const id = crypto.randomUUID();
    setAlerts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeAlert(id), 5000);
  };

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    storageService.saveProfile(newProfile);
    setProfile(newProfile);

    const currentTrades = storageService.getTrades();
    setTrades(currentTrades && currentTrades.length > 0 ? currentTrades : []);

    if (currentView === "editing-profile") {
      setCurrentView("profile");
      addAlert("Perfil actualizado correctamente", "info");
      return;
    }

    setCurrentView("dashboard");
    addAlert(`Bienvenido de vuelta, ${newProfile.name}`, "info");
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    storageService.saveProfile(updatedProfile);
    setProfile(updatedProfile);
  };

  const handleSaveTrade = (newTrade: Trade) => {
    const updatedTrades = [...trades, newTrade];
    setTrades(updatedTrades);
    storageService.saveTrades(updatedTrades);
    setCurrentView("dashboard");
    addAlert("Protocolo de Trade Registrado Correctamente", "info");
  };

  const handleUpdateTrades = (nextTrades: Trade[]) => {
    setTrades(nextTrades);
    storageService.saveTrades(nextTrades);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      window.location.href = "/";
    }
  };

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const showNav =
    currentView !== "dashboard" && currentView !== "editing-profile";

  return (
    <div className="min-h-screen bg-navy selection:bg-cyan/30">
      <AlertOverlay alerts={alerts} onRemove={removeAlert} />

      {showNav && (
        <nav className="sticky top-0 z-[60] bg-navy/80 backdrop-blur-md border-b border-navy-accent px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => setCurrentView("dashboard")}
            className="flex items-center gap-2 text-white font-black italic hover:scale-105 transition-all uppercase text-sm tracking-tight"
          >
            <ArrowLeft size={18} /> Volver
          </button>

          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              {currentView.replace("-", " ")}
            </span>
            <div className="w-1 h-1 rounded-full bg-cyan shadow-[0_0_8px_rgba(0,180,216,0.6)]" />
            <span className="text-[10px] font-mono text-white uppercase tracking-wider">
              {profile.name}
            </span>
          </div>
        </nav>
      )}

      <main className="pb-20">
        {currentView === "dashboard" && (
          <>
            <Dashboard onNavigate={setCurrentView} />
            <button
              onClick={handleLogout}
              className="fixed bottom-6 right-6 p-3 bg-navy-accent text-slate-500 hover:text-red-400 rounded-full transition-all border border-transparent hover:border-red-500/30 shadow-xl"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </>
        )}

        {currentView === "new-trade" && (
          <NewTradeWizard
            profile={profile}
            onSave={handleSaveTrade}
            onCancel={() => setCurrentView("dashboard")}
            onUpdateProfile={handleUpdateProfile}
            addAlert={addAlert}
          />
        )}

        {currentView === "history" && (
          <HistoryAnalysis
            trades={trades}
            profile={profile}
            onUpdateTrades={(nextTrades) => {
              setTrades(nextTrades);
              storageService.saveTrades(nextTrades);
            }}
          />
        )}

        {currentView === "coach" && (
          <CoachChat profile={profile} trades={trades} />
        )}

        {currentView === "editing-profile" && (
          <Onboarding
            initialProfile={profile}
            onComplete={handleOnboardingComplete}
          />
        )}

        {currentView === "profile" && (
          <div className="max-w-2xl mx-auto p-8 animate-fade-in text-center space-y-6">
            <h2 className="text-4xl font-black italic text-white tracking-tight uppercase">
              Configuración de Perfil
            </h2>

            <div className="bg-navy-light cyber-border p-8 rounded-2xl space-y-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    Nombre
                  </p>
                  <p className="text-xl font-bold text-white">{profile.name}</p>
                </div>

                <div>
                  <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    Estrategia Principal
                  </p>
                  <p className="text-xl font-bold text-white">
                    {profile.traderStyle}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Estrategias Secundarias
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.secondaryStyles?.length > 0 ? (
                    profile.secondaryStyles.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 bg-gold/5 border border-gold/10 text-gold text-[10px] font-bold uppercase rounded-full tracking-wide"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      Ninguna seleccionada
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Mercados Foco Globales
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.primaryMarkets.map((m) => (
                    <span
                      key={m}
                      className="px-3 py-1 bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold uppercase rounded-full tracking-wide"
                    >
                      {m}
                    </span>
                  ))}
                  {profile.secondaryMarkets.map((m) => (
                    <span
                      key={m}
                      className="px-3 py-1 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold uppercase rounded-full tracking-wide opacity-60"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-navy-accent">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-4">
                  Cuentas de Trading ({profile.accounts.length})
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {profile.accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-4 bg-navy rounded-xl border border-navy-accent hover:border-gold/30 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 bg-gold/10 rounded-lg text-gold shrink-0">
                        <Briefcase size={18} />
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-bold text-white leading-tight italic">
                          {acc.name}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase mt-1">
                          Cap: {acc.currentCapital.toLocaleString()}{" "}
                          {acc.currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-navy-accent flex flex-col gap-3">
                <button
                  onClick={() => setCurrentView("editing-profile")}
                  className="w-full py-4 bg-gold text-navy font-black rounded-lg hover:brightness-90 transition-all uppercase tracking-wide text-sm flex items-center justify-center gap-2"
                >
                  <Edit size={18} /> Editar Perfil y Cuentas
                </button>

                <button
                  onClick={() => setCurrentView("dashboard")}
                  className="w-full py-4 bg-white text-navy font-black rounded-lg hover:brightness-90 transition-all uppercase tracking-wide text-sm"
                >
                  Confirmar y Volver
                </button>
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.4em]">
              Sistema v2.5 // Equilibrium Trading OS
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default function AppWithAuth() {
  return (
    <AuthGate>
      <App />
    </AuthGate>
  );
}
