import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PersonaProbe",
  description: "Stress-test AI browser agents across behavioral personas."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mist text-ink antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded bg-ink text-sm font-bold text-white">
                PP
              </span>
              <span>
                <span className="block text-base font-semibold">PersonaProbe</span>
                <span className="block text-xs text-slate-500">
                  We find the users your AI agent fails for before your customers do.
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link className="rounded px-3 py-2 text-slate-700 hover:bg-slate-100" href="/runs">
                Runs
              </Link>
              <Link className="rounded px-3 py-2 text-slate-700 hover:bg-slate-100" href="/projects">
                Projects
              </Link>
              <Link className="rounded px-3 py-2 text-slate-700 hover:bg-slate-100" href="/demo-app/account-settings">
                Demo app
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
