// components/LoginMagicLink.tsx
import React from "react";
import { sendMagicLink } from "../services/authService";

export function LoginMagicLink() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const value = email.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      setErrorMsg("Please enter a valid email.");
      return;
    }

    setLoading(true);
    try {
      await sendMagicLink(value);
      setSent(true);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Could not send the sign in link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md cyber-border rounded-2xl p-5 bg-navy-light">
        <h1 className="text-xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm opacity-80 mb-4">
          Enter your email and we will send you a secure magic link.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full px-3 py-3 rounded-xl bg-navy border border-cyan/20 outline-none focus:border-cyan"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-cyan text-navy font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Sending" : "Send magic link"}
          </button>
        </form>

        {sent ? (
          <div className="mt-4 text-sm opacity-90">
            Check your email and open the link on this same device and browser.
          </div>
        ) : null}

        {errorMsg ? (
          <div className="mt-4 text-sm text-red-400">
            {errorMsg}
          </div>
        ) : null}
      </div>
    </div>
  );
}
