import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { colorsEqual, hexToHsl, readableTextColor } from "./settings.colors";
import { supabase } from "@/lib/supabase";
import {
  cloneBranding,
  clonePreferences,
  RIGHTTEMP_DEFAULT_BRANDING,
  RIGHTTEMP_DEFAULT_COLORS,
  RIGHTTEMP_DEFAULT_PREFERENCES,
  type OrganizationBranding,
  type UserPreferences,
} from "./settings.types";
import {
  getOrganizationBranding,
  getOrganizationContext,
  getUserPreferences,
  saveOrganizationBranding,
  saveUserPreferences,
} from "./settings.repository";

interface SettingsContextValue {
  preferences: UserPreferences;
  branding: OrganizationBranding;
  savedPreferences: UserPreferences;
  savedBranding: OrganizationBranding;
  role: "owner" | "admin" | "member" | "marketing" | null;
  isAdmin: boolean;
  canViewMarketing: boolean;
  isLoading: boolean;
  error: Error | null;
  previewPreferences: (preferences: UserPreferences) => void;
  previewBranding: (branding: OrganizationBranding) => void;
  clearPreviews: () => void;
  savePreferences: (preferences: UserPreferences) => Promise<void>;
  saveBranding: (branding: OrganizationBranding, logoFile: File | null) => Promise<OrganizationBranding>;
  resetPreferences: () => Promise<void>;
  resetBranding: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function applySettings(preferences: UserPreferences, branding: OrganizationBranding) {
  const root = document.documentElement;
  const resolvedTheme = preferences.theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preferences.theme;
  const usesDefaultPersonalColors = colorsEqual(preferences.colors, RIGHTTEMP_DEFAULT_PREFERENCES.colors);
  const baseColors = usesDefaultPersonalColors ? branding.colors : preferences.colors;
  const useDefaultLightPalette =
    resolvedTheme === "light" &&
    colorsEqual(baseColors, RIGHTTEMP_DEFAULT_COLORS);
  const colors = useDefaultLightPalette
    ? { ...baseColors, background: "#F6F8FB", text: "#111827" }
    : baseColors;
  const primaryForeground = readableTextColor(colors.primary);
  const accentForeground = readableTextColor(colors.accent);

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.classList.toggle("light", resolvedTheme === "light");
  root.style.colorScheme = resolvedTheme;
  root.style.setProperty("--background", hexToHsl(colors.background));
  root.style.setProperty("--foreground", hexToHsl(colors.text));
  root.style.setProperty("--card", hexToHsl(colors.background));
  root.style.setProperty("--card-foreground", hexToHsl(colors.text));
  root.style.setProperty("--popover", hexToHsl(colors.background));
  root.style.setProperty("--popover-foreground", hexToHsl(colors.text));
  root.style.setProperty("--primary", hexToHsl(colors.primary));
  root.style.setProperty("--primary-foreground", hexToHsl(primaryForeground));
  root.style.setProperty("--accent", hexToHsl(colors.accent));
  root.style.setProperty("--accent-foreground", hexToHsl(accentForeground));
  root.style.setProperty("--destructive", hexToHsl(colors.accent));
  root.style.setProperty("--destructive-foreground", hexToHsl(accentForeground));
  root.style.setProperty("--sidebar", hexToHsl(colors.background));
  root.style.setProperty("--sidebar-foreground", hexToHsl(colors.text));
  root.style.setProperty("--sidebar-primary", hexToHsl(colors.primary));
  root.style.setProperty("--sidebar-primary-foreground", hexToHsl(primaryForeground));
  root.style.setProperty("--sidebar-accent", hexToHsl(colors.accent));
  root.style.setProperty("--sidebar-accent-foreground", hexToHsl(accentForeground));
  root.style.setProperty("--muted", hexToHsl(colors.background));
  root.style.setProperty("--muted-foreground", hexToHsl(colors.text));
  root.style.setProperty("--app-font-scale", preferences.fontScale === "small" ? "0.9" : preferences.fontScale === "large" ? "1.08" : preferences.fontScale === "extra-large" ? "1.18" : "1");
  root.style.setProperty("--app-content-max-width", preferences.layoutPreset === "mobile-first" ? "1180px" : preferences.layoutPreset === "wide" ? "1800px" : "1600px");
  root.style.setProperty("--radius", preferences.cornerStyle === "sharp" ? "0.25rem" : preferences.cornerStyle === "rounded" ? "1.25rem" : "0.75rem");
  root.dataset.density = preferences.density;
  root.dataset.cardStyle = preferences.cardStyle;
  root.dataset.navigationStyle = preferences.navigationStyle;
  root.dataset.layoutPreset = preferences.layoutPreset;
  root.dataset.companyMark = branding.appMark;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [previewedPreferences, setPreviewedPreferences] = useState<UserPreferences | null>(null);
  const [previewedBranding, setPreviewedBranding] = useState<OrganizationBranding | null>(null);
  const personalQuery = useQuery({ queryKey: ["settings", "personal"], queryFn: getUserPreferences });
  const brandingQuery = useQuery({ queryKey: ["settings", "branding"], queryFn: getOrganizationBranding });
  const contextQuery = useQuery({ queryKey: ["settings", "organization-context"], queryFn: getOrganizationContext });

  useEffect(() => {
    const { data: authState } = supabase.auth.onAuthStateChange(() => {
      setPreviewedPreferences(null);
      setPreviewedBranding(null);
      queryClient.removeQueries({ queryKey: ["settings"] });
    });
    return () => authState.subscription.unsubscribe();
  }, [queryClient]);

  const savedPreferences = personalQuery.data ?? RIGHTTEMP_DEFAULT_PREFERENCES;
  const savedBranding = brandingQuery.data ?? {
    organizationId: "",
    ...RIGHTTEMP_DEFAULT_BRANDING,
  };
  const preferences = previewedPreferences ?? savedPreferences;
  const branding = previewedBranding ?? savedBranding;

  useEffect(() => {
    applySettings(preferences, branding);
    if (preferences.theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applySettings(preferences, branding);
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    return undefined;
  }, [preferences, branding]);

  const value = useMemo<SettingsContextValue>(() => ({
    preferences,
    branding,
    savedPreferences,
    savedBranding,
    role: contextQuery.data?.role ?? null,
    isAdmin: contextQuery.data?.role === "admin" || contextQuery.data?.role === "owner",
    canViewMarketing: contextQuery.data?.role === "admin"
      || contextQuery.data?.role === "owner"
      || contextQuery.data?.role === "marketing",
    isLoading: personalQuery.isLoading || brandingQuery.isLoading || contextQuery.isLoading,
    error: (personalQuery.error ?? brandingQuery.error ?? contextQuery.error) as Error | null,
    previewPreferences: (next) => setPreviewedPreferences(clonePreferences(next)),
    previewBranding: (next) => setPreviewedBranding(cloneBranding(next)),
    clearPreviews: () => {
      setPreviewedPreferences(null);
      setPreviewedBranding(null);
    },
    savePreferences: async (next) => {
      const saved = await saveUserPreferences(next);
      queryClient.setQueryData(["settings", "personal"], saved);
      setPreviewedPreferences(null);
    },
    saveBranding: async (next, logoFile) => {
      const saved = await saveOrganizationBranding(next, logoFile, savedBranding.logoPath);
      queryClient.setQueryData(["settings", "branding"], saved);
      setPreviewedBranding(null);
      return saved;
    },
    resetPreferences: async () => {
      const saved = await saveUserPreferences(clonePreferences(RIGHTTEMP_DEFAULT_PREFERENCES));
      queryClient.setQueryData(["settings", "personal"], saved);
      setPreviewedPreferences(null);
    },
    resetBranding: async () => {
      const saved = await saveOrganizationBranding({
        organizationId: branding.organizationId,
        ...RIGHTTEMP_DEFAULT_BRANDING,
      }, null, savedBranding.logoPath);
      queryClient.setQueryData(["settings", "branding"], saved);
      setPreviewedBranding(null);
    },
  }), [branding, contextQuery.data?.role, contextQuery.error, contextQuery.isLoading, personalQuery.error, personalQuery.isLoading, preferences, brandingQuery.error, brandingQuery.isLoading, queryClient, savedBranding, savedPreferences]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}