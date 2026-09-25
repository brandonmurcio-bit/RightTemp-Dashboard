export type ThemeMode = "light" | "dark" | "system";
export type FontScale = "small" | "default" | "large" | "extra-large";
export type InterfaceDensity = "compact" | "comfortable" | "spacious";
export type CornerStyle = "sharp" | "soft" | "rounded";
export type CardStyle = "flat" | "bordered" | "elevated";
export type NavigationStyle = "sidebar" | "topbar" | "compact";
export type LayoutPreset = "mobile-first" | "balanced" | "wide";

export type NavigationItemId =
  | "dashboard"
  | "leads"
  | "estimates"
  | "jobs"
  | "customers"
  | "invoices"
  | "settings";

export type DashboardWidgetId =
  | "action-queue"
  | "sales-schedule"
  | "job-schedule"
  | "metrics"
  | "financials"
  | "insights";

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  colors: ThemeColors;
  fontScale: FontScale;
  density: InterfaceDensity;
  cornerStyle: CornerStyle;
  cardStyle: CardStyle;
  navigationStyle: NavigationStyle;
  navigationOrder: NavigationItemId[];
  hiddenNavigationItems: NavigationItemId[];
  dashboardWidgetOrder: DashboardWidgetId[];
  hiddenDashboardWidgets: DashboardWidgetId[];
  layoutPreset: LayoutPreset;
}

export interface OrganizationBranding {
  organizationId: string;
  companyName: string;
  appMark: string;
  logoPath: string | null;
  logoUrl: string | null;
  colors: ThemeColors;
}

export interface OrganizationContext {
  organizationId: string;
  role: "owner" | "admin" | "member" | "marketing";
}

export const RIGHTTEMP_DEFAULT_COLORS: ThemeColors = {
  primary: "#1565E8",
  accent: "#ED1C24",
  background: "#070707",
  text: "#F5F5F5",
};

export const RIGHTTEMP_DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  colors: RIGHTTEMP_DEFAULT_COLORS,
  fontScale: "default",
  density: "comfortable",
  cornerStyle: "soft",
  cardStyle: "elevated",
  navigationStyle: "sidebar",
  navigationOrder: ["dashboard", "leads", "estimates", "jobs", "customers", "invoices", "settings"],
  hiddenNavigationItems: [],
  dashboardWidgetOrder: ["action-queue", "sales-schedule", "job-schedule", "metrics", "financials", "insights"],
  hiddenDashboardWidgets: [],
  layoutPreset: "balanced",
};

export const RIGHTTEMP_DEFAULT_BRANDING: Omit<OrganizationBranding, "organizationId"> = {
  companyName: "RightTemp Heating & Air Conditioning",
  appMark: "RT",
  logoPath: null,
  logoUrl: null,
  colors: RIGHTTEMP_DEFAULT_COLORS,
};

export function clonePreferences(preferences: UserPreferences): UserPreferences {
  return {
    ...preferences,
    colors: { ...preferences.colors },
    navigationOrder: [...preferences.navigationOrder],
    hiddenNavigationItems: [...preferences.hiddenNavigationItems],
    dashboardWidgetOrder: [...preferences.dashboardWidgetOrder],
    hiddenDashboardWidgets: [...preferences.hiddenDashboardWidgets],
  };
}

export function cloneBranding(branding: OrganizationBranding): OrganizationBranding {
  return { ...branding, colors: { ...branding.colors } };
}