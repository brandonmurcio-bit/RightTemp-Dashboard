import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, Users, LayoutDashboard, FileText, LogOut, ReceiptText, Settings, CalendarDays, Megaphone, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PWAPrompt } from "./pwa-prompt";
import { useSettings } from "@/features/settings/settings.context";
import type { NavigationItemId } from "@/features/settings/settings.types";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { preferences, branding, role } = useSettings();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const navItems: Array<{ id: NavigationItemId | "marketing" | "team"; label: string; path: string; icon: typeof LayoutDashboard }> = [
    { id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard },
    { id: "leads", label: "Leads", path: "/leads", icon: Activity },
    { id: "estimates", label: "Estimates", path: "/estimates", icon: FileText },
    { id: "jobs", label: "Jobs", path: "/jobs", icon: CalendarDays },
    { id: "customers", label: "Customers", path: "/customers", icon: Users },
    { id: "invoices", label: "Invoices", path: "/invoices", icon: ReceiptText },
    { id: "settings", label: "Settings", path: "/settings", icon: Settings },
    { id: "marketing", label: "Marketing", path: "/marketing", icon: Megaphone },
    { id: "team", label: "Team access", path: "/team", icon: ShieldCheck },
  ];
  const orderedOperationalNavItems = preferences.navigationOrder
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is typeof navItems[number] => !!item)
    .filter((item) => item.id === "settings" || !preferences.hiddenNavigationItems.includes(item.id as NavigationItemId));
  const orderedNavItems = role === "marketing"
    ? navItems.filter((item) => item.id === "marketing")
    : [
        ...orderedOperationalNavItems,
        ...(role === "owner" || role === "admin"
          ? navItems.filter((item) => item.id === "marketing" || item.id === "team")
          : []),
      ];
  const mobileNavItems = [
    ...orderedNavItems.filter((item) => item.id !== "settings").slice(0, 4),
    orderedNavItems.find((item) => item.id === "settings"),
  ].filter((item): item is typeof navItems[number] => !!item);
  const isTopbar = preferences.navigationStyle === "topbar";
  const isCompact = preferences.navigationStyle === "compact";
  const companyLabel = branding.companyName || "RightTemp OS";

  const brand = (
    <div className={`flex items-center gap-3 ${isCompact ? "justify-center px-0" : "px-2"} py-4 mb-6`}>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-black p-1 shadow-sm">
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt={`${companyLabel} logo`} className="h-full w-full object-contain" data-testid="img-company-logo" />
        ) : (
          <span className="grid h-full w-full place-items-center text-xs font-black text-white" data-testid="text-app-mark">{branding.appMark}</span>
        )}
      </div>
      {!isCompact && <span className="truncate font-bold text-lg tracking-tight">{companyLabel}</span>}
    </div>
  );

  const renderNavItem = (item: typeof navItems[number]) => {
    const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
    return (
      <Link key={item.path} href={item.path}>
        <div
          data-testid={`nav-${item.id}`}
          title={isCompact ? item.label : undefined}
          className={`flex items-center gap-3 ${isCompact ? "justify-center px-2" : "px-3"} py-2.5 rounded-md cursor-pointer transition-colors ${
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          }`}
        >
          <item.icon className="w-5 h-5 shrink-0" />
          {!isCompact && item.label}
        </div>
      </Link>
    );
  };

  return (
    <div className={`flex min-h-[100dvh] w-full bg-background flex-col ${isTopbar ? "" : "md:flex-row"}`}>
      {/* Desktop Sidebar */}
      {!isTopbar && (
        <aside className={`hidden md:flex flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground p-4 ${isCompact ? "w-20" : "w-64"}`}>
          {brand}
          <nav className="flex flex-col gap-1 flex-1">{orderedNavItems.map(renderNavItem)}</nav>
          <button type="button" data-testid="button-sign-out" onClick={handleSignOut} className={`mt-auto flex w-full items-center gap-3 ${isCompact ? "justify-center px-2" : "px-3"} py-2.5 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors`}>
            <LogOut className="w-5 h-5" />
            {!isCompact && <span>Sign Out</span>}
          </button>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-w-0 pb-16 md:pb-0 h-[100dvh] md:h-auto overflow-y-auto ${isTopbar ? "" : ""}`}>
        {isTopbar && (
          <header className="hidden md:flex items-center gap-5 border-b border-sidebar-border bg-sidebar px-6 text-sidebar-foreground">
            {brand}
            <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">{orderedNavItems.map(renderNavItem)}</nav>
            <button type="button" data-testid="button-sign-out-topbar" onClick={handleSignOut} className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </header>
        )}
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 overflow-hidden rounded-lg bg-black p-0.5 shadow-sm">
              {branding.logoUrl ? <img src={branding.logoUrl} alt={`${companyLabel} logo`} className="h-full w-full object-contain" /> : <span className="grid h-full w-full place-items-center text-[10px] font-black text-white">{branding.appMark}</span>}
            </div>
            <span className="max-w-[12rem] truncate font-bold tracking-tight">{companyLabel}</span>
          </div>

          <button
            type="button"
            data-testid="button-sign-out-mobile"
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
        {mobileNavItems.map((item) => {
          const isActive =
            location === item.path ||
            (item.path !== "/" && location.startsWith(item.path));

          return (
            <Link key={item.path} href={item.path}>
              <div
                data-testid={`mobilenav-${item.id}`}
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
