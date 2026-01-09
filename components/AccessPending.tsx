// components/AccessPending.tsx
import React from "react";
import { signOut } from "../services/authService";

export function AccessPending() {
  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md cyber-border rounded-2xl p-5 bg-navy-light">
        <h1 className="text-xl font-semibold mb-2">Access pending</h1>

        <p className="text-sm opacity-80 mb-4 leading-relaxed">
          Your account was created successfully, but access is still pending.
          If you believe this is a mistake, try again later or contact support.
        </p>

        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl bg-navy border border-cyan/20 hover:border-cyan text-white font-semibold"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
