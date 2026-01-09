// index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { supabase } from "./services/supabaseClient";

// Debug global for testing
(window as any).__sb = supabase;

function getOrCreateRootEl(): HTMLElement {
  const existing = document.getElementById("root");
  if (existing) return existing;

  const el = document.createElement("div");
  el.id = "root";
  document.body.appendChild(el);
  return el;
}

function renderFallback(message: string) {
  const rootEl = getOrCreateRootEl();

  ReactDOM.createRoot(rootEl).render(
    <div style={{ padding: 16, fontFamily: "monospace", color: "#f1f5f9" }}>
      <div style={{ marginBottom: 8, fontWeight: 700 }}>App boot error</div>
      <div style={{ opacity: 0.9, whiteSpace: "pre-wrap" }}>{message}</div>
      <div style={{ marginTop: 12, opacity: 0.7 }}>
        Open DevTools Console to see logs.
      </div>
    </div>
  );
}

/**
 * If the user arrived from a Supabase Magic Link, the URL will include ?code=...
 * We must exchange it for a session BEFORE rendering the app.
 */
async function processMagicLinkCodeIfPresent(): Promise<void> {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    console.log("BOOT URL:", url.toString());

    if (!code) {
      console.log("NO MAGIC LINK CODE FOUND");
      return;
    }

    console.log("MAGIC LINK CODE FOUND:", code);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("exchangeCodeForSession ERROR:", error);
      return;
    }

    console.log("SESSION CREATED (exchangeCodeForSession):", data);

    // Clean the URL so refresh doesn't re-run the exchange
    url.searchParams.delete("code");
    window.history.replaceState({}, "", url.toString());

    // Optional sanity check: confirm we actually have a session now
    const sessionRes = await supabase.auth.getSession();
    console.log("SESSION AFTER EXCHANGE (getSession):", sessionRes.data?.session);
  } catch (err) {
    console.error("Magic Link processing failed:", err);
  }
}

async function bootstrap() {
  try {
    // 1) Must run BEFORE app renders
    await processMagicLinkCodeIfPresent();

    // 2) Render app
    const rootEl = getOrCreateRootEl();
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err: any) {
    const msg = err?.message ? String(err.message) : String(err);
    console.error("BOOTSTRAP ERROR:", err);
    renderFallback(msg);
  }
}

bootstrap();
