import React from "react";
import { supabase } from "../services/supabaseClient";
import { getAccessStatus } from "../services/userAccessService";
import { LoginMagicLink } from "./LoginMagicLink";
import { AccessPending } from "./AccessPending";

type GateState = "LOADING" | "SIGNED_OUT" | "PENDING" | "ACTIVE";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: any;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function AuthGate(props: { children: React.ReactNode }) {
  const [state, setState] = React.useState<GateState>("LOADING");

  // Evita setState luego de unmount
  const mountedRef = React.useRef(true);

  // Evita que se solapen resoluciones (muy común con onAuthStateChange)
  const inFlightRef = React.useRef<Promise<void> | null>(null);

  const safeSetState = React.useCallback((next: GateState) => {
    if (!mountedRef.current) return;
    setState(next);
  }, []);

  async function resolveGateForSession(session: any | null): Promise<GateState> {
    if (!session) return "SIGNED_OUT";

    try {
      const status = await withTimeout(getAccessStatus(), 5000, "getAccessStatus");
      return status === "ACTIVE" ? "ACTIVE" : "PENDING";
    } catch (err) {
      console.error("Access status check failed:", err);

      // Importante: si hay sesión, NO mandes SIGNED_OUT por un fallo temporal
      // Mejor PENDING como fallback (igual que tu intención original)
      return "PENDING";
    }
  }

  async function resolveFromCurrentSessionOnce(): Promise<GateState> {
    const sessionRes = await withTimeout(supabase.auth.getSession(), 4000, "getSession");
    const session = sessionRes.data.session;
    return resolveGateForSession(session);
  }

  async function resolveWithRetry(fromSession: any | null = undefined) {
    // Si ya hay una resolución corriendo, no lances otra
    if (inFlightRef.current) return;

    inFlightRef.current = (async () => {
      // Mientras resolvemos, mostramos LOADING para evitar “parpadeos” de UI
      safeSetState("LOADING");

      // 12 intentos * 250ms = 3s aprox (más los timeouts internos)
      for (let i = 0; i < 12; i++) {
        if (!mountedRef.current) return;

        try {
          // Si nos pasaron session desde onAuthStateChange, úsala.
          // Si no, consulta getSession()
          const next =
            fromSession !== undefined
              ? await resolveGateForSession(fromSession)
              : await resolveFromCurrentSessionOnce();

          if (!mountedRef.current) return;
          safeSetState(next);
          return;
        } catch (err) {
          console.error("Auth resolve attempt failed:", err);
          await sleep(250);
        }
      }

      // Si luego de varios intentos no pudo resolver, decide según si hay sesión
      try {
        const fallback = await resolveFromCurrentSessionOnce();
        safeSetState(fallback);
      } catch {
        safeSetState("SIGNED_OUT");
      }
    })();

    try {
      await inFlightRef.current;
    } finally {
      inFlightRef.current = null;
    }
  }

  React.useEffect(() => {
    mountedRef.current = true;

    // Resolución inicial
    resolveWithRetry();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Cada cambio de auth re-resuelve usando la session ya provista
      resolveWithRetry(session);
    });

    return () => {
      mountedRef.current = false;
      data.subscription.unsubscribe();
    };
    // safeSetState es estable por useCallback, no hace falta ponerlo en deps para evitar re-suscripciones
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "LOADING") {
    return (
      <div className="p-4">
        Loading
        <div className="mt-2 text-sm opacity-70">
          If this takes more than 10 seconds, refresh once.
        </div>
      </div>
    );
  }

  if (state === "SIGNED_OUT") return <LoginMagicLink />;
  if (state === "PENDING") return <AccessPending />;

  return <>{props.children}</>;
}
