// services/authService.ts
import { supabase } from "./supabaseClient";

/**
 * Sends a Supabase Magic Link that ALWAYS redirects back to the current app origin
 * (works for Vercel Production and Preview automatically).
 */
export async function sendMagicLink(email: string) {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      // Redirect back to the same domain the user is currently on
      emailRedirectTo: `${window.location.origin}/`
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Handles the OAuth style code returned by Supabase Magic Link
 * by exchanging it for a session, then cleaning the URL.
 */
export async function handleAuthCallbackIfPresent() {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (!code) return;

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;

    // remove the code param so refresh won't re-run the exchange
    url.searchParams.delete("code");
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(cb: () => void) {
  return supabase.auth.onAuthStateChange(() => cb());
}
