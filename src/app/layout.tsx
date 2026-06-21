import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowProof",
  description: "Pre-production UI QA across behavioral personas."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mist text-ink antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                alt="FlowProof logo"
                className="h-10 w-10 rounded object-cover"
                height={40}
                src="/flowproof-logo.png"
                width={40}
              />
              <span>
                <span className="block text-base font-semibold">FlowProof</span>
                <span className="block text-xs text-slate-500">
                  Pre-production UI QA for fragile flows.
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
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
