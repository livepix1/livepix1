"use client";

import { useState } from "react";
import { SidebarNav } from "./Sidebar";
import { cn } from "@/lib/cn";

interface DashboardShellProps {
  user: { name: string; email: string; avatar?: string | null };
  children: React.ReactNode;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="min-h-screen bg-pixflow-dark">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-pixflow-darker lg:block">
        <SidebarNav />
      </aside>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-white/10 bg-pixflow-darker">
            <SidebarNav onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top nav */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-pixflow-dark/80 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setDrawer(true)}
            className={cn(
              "flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
            )}
          >
            <span className="h-0.5 w-6 bg-pixflow-slate" />
            <span className="h-0.5 w-6 bg-pixflow-slate" />
            <span className="h-0.5 w-6 bg-pixflow-slate" />
          </button>

          <div className="flex flex-1 items-center justify-end gap-4">
            <button
              type="button"
              aria-label="Notificações"
              className="relative rounded-lg px-2 py-1 text-sm text-pixflow-slate/60 hover:text-pixflow-slate"
            >
              Avisos
              <span className="absolute right-1 top-0 h-2 w-2 rounded-full bg-pixflow-magenta" />
            </button>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-pixflow-slate">{user.name}</p>
                <p className="text-xs text-white/40">{user.email}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pixflow-cyan/15 font-display text-sm text-pixflow-cyan">
                {initials(user.name) || "?"}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
