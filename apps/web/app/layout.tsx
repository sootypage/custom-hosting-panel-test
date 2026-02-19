import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Hosting Panel",
  description: "MVP hosting panel (web + api + daemon)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-5xl p-6">
          <header className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
            <div>
              <div className="text-lg font-semibold">Custom Hosting Panel</div>
              <div className="text-sm text-zinc-400">MVP — nodes + servers + console (next)</div>
            </div>
            <div className="text-xs text-zinc-400">
              API: <span className="font-mono">{process.env.NEXT_PUBLIC_API_URL || "set NEXT_PUBLIC_API_URL"}</span>
            </div>
          </header>
          <main className="mt-6"><div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
            <div className="text-sm font-semibold">
              {process.env.NEXT_PUBLIC_PANEL_NAME || "Custom Hosting Panel"}
            </div>
            <div className="text-xs text-zinc-500">Panel</div>
          </div>
        </div>
        {children}</main>
          <footer className="mt-10 text-xs text-zinc-500">
            Built with Next.js + Tailwind. Extend with templates (eggs) for games.
          </footer>
        </div>
      </body>
    </html>
  );
}
