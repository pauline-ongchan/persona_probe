"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function DemoAccountSettingsHealed() {
  const [accountEmail, setAccountEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function updateEmail() {
    if (accountEmail !== "test@example.com") {
      setError("Enter test@example.com as the account email.");
      return;
    }

    setError("");
    setSaved(true);
  }

  if (saved) {
    return (
      <main className="min-h-screen bg-white">
        <section className="mx-auto max-w-2xl px-5 py-16">
          <div className="rounded border border-moss/30 bg-moss/5 p-8">
            <CheckCircle2 className="h-10 w-10 text-moss" />
            <h1 className="mt-4 text-3xl font-semibold">Email updated successfully</h1>
            <p className="mt-3 text-slate-600">The account email is now {accountEmail}.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-moss">Self-healed demo</p>
        <h1 className="mt-2 text-3xl font-semibold">Update account email</h1>

        <form className="mt-8 space-y-5 rounded border border-slate-200 p-5" onSubmit={(event) => event.preventDefault()}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Account email</span>
            <input
              aria-label="Account email"
              className="focus-ring mt-2 w-full rounded border border-slate-300 px-3 py-3"
              data-testid="account-email"
              inputMode="email"
              placeholder="test@example.com"
              value={accountEmail}
              onChange={(event) => setAccountEmail(event.target.value)}
            />
          </label>

          <label className="flex min-h-12 items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3">
            <input
              className="mt-1 h-5 w-5"
              data-testid="newsletter-checkbox"
              type="checkbox"
              checked={newsletter}
              onChange={(event) => setNewsletter(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium">Optional product newsletter</span>
              <span className="block text-sm text-slate-600">Off by default.</span>
            </span>
          </label>

          {error ? (
            <p className="rounded border border-coral/30 bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
              {error}
            </p>
          ) : null}

          <button
            className="focus-ring w-full rounded bg-ink px-4 py-3 font-medium text-white md:w-auto"
            data-testid="save-preferences"
            onClick={updateEmail}
            type="button"
          >
            Update account email
          </button>
        </form>
      </section>
    </main>
  );
}
