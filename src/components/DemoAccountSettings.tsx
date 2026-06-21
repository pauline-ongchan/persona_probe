"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Search, ShieldAlert } from "lucide-react";

type SelfHealPlan = {
  fixes?: {
    removeBillingEmailTrap?: boolean;
    removeOptionalPhoneField?: boolean;
    removePermissionsModal?: boolean;
    newsletterDefaultChecked?: boolean;
    useExplicitAccountEmailCopy?: boolean;
    useExplicitSaveButton?: boolean;
    keepSaveVisibleOnMobile?: boolean;
    useSpecificErrorMessages?: boolean;
  };
  reasons?: string[];
};

export function DemoAccountSettings() {
  const [healPlan, setHealPlan] = useState<SelfHealPlan | null>(null);
  const [billingEmail, setBillingEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [tracking, setTracking] = useState(true);
  const [research, setResearch] = useState(true);
  const [modalOpen, setModalOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const plan = decodeSelfHealPlan(new URLSearchParams(window.location.search).get("heal"));
    if (!plan) return;

    setHealPlan(plan);
    if (plan.fixes?.newsletterDefaultChecked === false) {
      setNewsletter(false);
    }
    if (plan.fixes?.removePermissionsModal) {
      setTracking(false);
      setResearch(false);
      setModalOpen(false);
    }
  }, []);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== "/" || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const fixes = healPlan?.fixes;
  const filteredHint = useMemo(() => {
    if (!query.trim()) return "General, billing, privacy, and contact settings";
    if (query.toLowerCase().includes("email")) return "Email appears in billing and account sections";
    return "No exact match";
  }, [query]);

  function savePreferences() {
    if (phone && !/^\+?[0-9 ()-]{7,}$/.test(phone)) {
      setError(
        fixes?.useSpecificErrorMessages
          ? "Phone number is optional. Remove it or use digits only."
          : "Some information needs another look."
      );
      return;
    }

    if (accountEmail !== "test@example.com") {
      setError(
        fixes?.useSpecificErrorMessages
          ? "Enter test@example.com in the Account email field."
          : "We couldn't save everything. Review the details and try again."
      );
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
            <p className="mt-3 text-slate-600">
              The account email is now {accountEmail}. Billing notices will keep using{" "}
              {billingEmail || "the existing billing contact"}.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-5xl px-5 py-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                {healPlan ? "Self-healed settings" : "Settings"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold">Account settings</h1>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Find a setting</span>
              <span className="mt-2 flex items-center gap-2 rounded border border-slate-300 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  aria-label="Search settings"
                  className="w-full border-0 p-0 outline-none"
                  data-testid="settings-search"
                  placeholder="Search"
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </span>
            </label>

            <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {filteredHint}
            </p>
          </aside>

          <form className="space-y-7" onSubmit={(event) => event.preventDefault()}>
            {!fixes?.removeBillingEmailTrap ? (
              <section className="rounded border border-slate-200 p-5">
                <h2 className="text-lg font-semibold">Billing contact</h2>
                <label className="mt-4 block">
                  <span className="text-sm font-medium text-slate-700">Billing email</span>
                  <input
                    className="focus-ring mt-2 w-full rounded border border-slate-300 px-3 py-3"
                    data-testid="billing-email"
                    inputMode="email"
                    placeholder="receipts@example.com"
                    value={billingEmail}
                    onChange={(event) => setBillingEmail(event.target.value)}
                  />
                </label>
              </section>
            ) : null}

            <section className="rounded border border-slate-200 p-5">
              <h2 className="text-lg font-semibold">Profile contact</h2>
              <div className={`mt-4 grid gap-4 ${fixes?.removeOptionalPhoneField ? "" : "md:grid-cols-2"}`}>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Account email</span>
                  <input
                    aria-label="Account email"
                    className="focus-ring mt-2 w-full rounded border border-slate-300 px-3 py-3"
                    data-testid="account-email"
                    inputMode="email"
                    placeholder={fixes?.useExplicitAccountEmailCopy ? "test@example.com" : "account@example.com"}
                    value={accountEmail}
                    onChange={(event) => setAccountEmail(event.target.value)}
                  />
                </label>
                {!fixes?.removeOptionalPhoneField ? (
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Phone number</span>
                    <input
                      aria-label="Optional phone number"
                      className="focus-ring mt-2 w-full rounded border border-slate-300 px-3 py-3"
                      data-testid="phone-number"
                      inputMode="tel"
                      placeholder="Optional"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </label>
                ) : null}
              </div>
            </section>

            <section className="rounded border border-slate-200 p-5">
              <h2 className="text-lg font-semibold">Communication choices</h2>
              <label className="mt-4 flex min-h-16 items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                <input
                  className="mt-1 h-5 w-5"
                  data-testid="newsletter-checkbox"
                  type="checkbox"
                  checked={newsletter}
                  onChange={(event) => setNewsletter(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium">Keep me in the loop</span>
                  <span className="block text-sm text-slate-600">Receive product news and partner updates.</span>
                </span>
              </label>
            </section>

            {!fixes?.removePermissionsModal ? (
              <section className="rounded border border-slate-200 p-5">
              <h2 className="text-lg font-semibold">Privacy defaults</h2>
              <div className="mt-4 grid gap-3">
                <label className="flex min-h-16 items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                  <input
                    className="mt-1 h-5 w-5"
                    data-testid="tracking-checkbox"
                    type="checkbox"
                    checked={tracking}
                    onChange={(event) => setTracking(event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-medium">Personalized product tracking</span>
                    <span className="block text-sm text-slate-600">Use activity data to tune recommendations.</span>
                  </span>
                </label>
                <label className="flex min-h-16 items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                  <input
                    className="mt-1 h-5 w-5"
                    data-testid="research-checkbox"
                    type="checkbox"
                    checked={research}
                    onChange={(event) => setResearch(event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-medium">Permission for research follow-up</span>
                    <span className="block text-sm text-slate-600">Allow occasional requests for extra feedback.</span>
                  </span>
                </label>
              </div>
              </section>
            ) : null}

            {error ? (
              <p className="rounded border border-coral/30 bg-coral/10 px-3 py-2 text-sm font-medium text-coral">
                {error}
              </p>
            ) : null}

            <div className={fixes?.keepSaveVisibleOnMobile ? "pt-0" : "pt-4 sm:pt-0"}>
              <button
                className="focus-ring w-full rounded bg-ink px-4 py-3 font-medium text-white md:w-auto"
                data-testid="save-preferences"
                onClick={savePreferences}
                type="button"
              >
                {fixes?.useExplicitSaveButton ? "Update account email" : "Save preferences"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {modalOpen && !fixes?.removePermissionsModal ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-ink/40 px-4">
          <section
            aria-modal="true"
            className="w-full max-w-lg rounded border border-slate-200 bg-white p-5 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-1 h-5 w-5 text-amber" />
              <div>
                <h2 className="text-lg font-semibold">Before saving preferences</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Optional permissions help personalize emails and let the team request follow-up feedback.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                <input className="mt-1 h-4 w-4" checked={tracking} readOnly type="checkbox" />
                <span className="text-sm">Allow product tracking</span>
              </label>
              <label className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                <input className="mt-1 h-4 w-4" checked={research} readOnly type="checkbox" />
                <span className="text-sm">Allow research follow-up</span>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                className="focus-ring rounded border border-slate-300 px-4 py-2 text-sm font-medium"
                data-testid="modal-reject"
                onClick={() => {
                  setTracking(false);
                  setResearch(false);
                  setModalOpen(false);
                }}
                type="button"
              >
                Use essentials only
              </button>
              <button
                className="focus-ring rounded bg-ink px-4 py-2 text-sm font-medium text-white"
                data-testid="modal-allow"
                onClick={() => setModalOpen(false)}
                type="button"
              >
                Looks fine
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function decodeSelfHealPlan(encoded: string | null): SelfHealPlan | null {
  if (!encoded) return null;

  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
    return JSON.parse(window.atob(padded)) as SelfHealPlan;
  } catch {
    return null;
  }
}
