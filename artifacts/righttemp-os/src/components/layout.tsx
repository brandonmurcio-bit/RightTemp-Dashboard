import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, Users, LayoutDashboard, CalendarDays, FileText, LogOut, ReceiptText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PWAPrompt } from "./pwa-prompt";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Leads", path: "/leads", icon: Activity },
    { label: "Estimates", path: "/estimates", icon: FileText },
    { label: "Jobs", path: "/jobs", icon: CalendarDays },
    { label: "Customers", path: "/customers", icon: Users },
  ];
  const desktopNavItems = [...navItems, { label: "Invoices", path: "/invoices", icon: ReceiptText }];

  return (
    <div className="flex min-h-[100dvh] w-full bg-background flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground p-4">
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="h-10 w-10 overflow-hidden rounded-xl bg-black p-1 shadow-sm">
            <img src="/icons/righttemp-512.png" alt="" className="h-full w-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            RightTemp OS
          </span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {desktopNavItems.map((item) => {
            const isActive =
              location === item.path ||
              (item.path !== "/" && location.startsWith(item.path));

            return (
              <Link key={item.path} href={item.path}>
                <div
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-auto flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 h-[100dvh] md:h-auto overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 overflow-hidden rounded-lg bg-black p-0.5 shadow-sm">
              <img src="/icons/righttemp-512.png" alt="" className="h-full w-full object-contain" />
            </div>
            <span className="font-bold tracking-tight">RightTemp OS</span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm px-3 py-1 rounded-md border border-sidebar-border hover:bg-sidebar-accent/50"
          >
            Sign Out
          </button>
        </header>

        <div className="flex-1">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar border-t border-sidebar-border flex items-center justify-around z-50 text-sidebar-foreground px-2">
        {navItems.map((item) => {
          const isActive =
            location === item.path ||
            (item.path !== "/" && location.startsWith(item.path));

          return (
            <Link key={item.path} href={item.path}>
              <div
                data-testid={`mobilenav-${item.label.toLowerCase()}`}
                className={`flex flex-col items-center justify-center w-16 h-full gap-1 cursor-pointer transition-colors ${
                  isActive ? "text-primary" : "text-sidebar-foreground/60"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? "fill-primary/20" : ""}`}
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <PWAPrompt />
    </div>
  );
}
