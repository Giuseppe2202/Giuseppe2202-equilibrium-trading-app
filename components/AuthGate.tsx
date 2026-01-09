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
    timeoutId = setTimeout(() => reject(new Error(label + " timeout after " + ms + "ms")), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function AuthGate(props: { children: React.ReactNode }) {
  const [state, setState] = React.useState<GateState>("LOADING");

  async function resolveAuthOnce(): Promise<GateState> {
    const sessionRes = await withTimeout(supabase.auth.getSession(), 4000, "getSession");
    const session = sessionRes.data.session;

    if (!session) return "SIGNED_OUT";

    try {
      const status = await withTimeout(getAccessStatus(), 5000, "getAccessStatus");
      return status === "ACTIVE" ? "ACTIVE" : "PENDING";
    } catch (err) {
      console.error("Access status check failed:", err);
      return "PENDING";
    }
  }

  async function resolveAuthWithRetry() {
    for (let i = 0; i < 12; i++) {
      try {
        const next = await resolveAuthOnce();
        setState(next);
        return;
      } catch (err) {
        console.error("Auth resolve attempt failed:", err);
      }
      await sleep(250);
    }

    setState("SIGNED_OUT");
  }

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await resolveAuthWithRetry();
    };

    run();

    const { data } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) resolveAuthWithRetry();
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
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
