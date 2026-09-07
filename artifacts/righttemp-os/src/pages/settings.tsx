import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  GripVertical,
  ImagePlus,
  LayoutDashboard,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Settings2,
  Sun,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useSettings } from "@/features/settings/settings.context";
import { normalizeHex, validateThemeColors } from "@/features/settings/settings.colors";
import {
  cloneBranding,
  clonePreferences,
  RIGHTTEMP_DEFAULT_BRANDING,
  RIGHTTEMP_DEFAULT_PREFERENCES,
  type CardStyle,
  type CornerStyle,
  type DashboardWidgetId,
  type FontScale,
  type InterfaceDensity,
  type LayoutPreset,
  type NavigationItemId,
  type NavigationStyle,
  type OrganizationBranding,
  type ThemeMode,
  type UserPreferences,
} from "@/features/settings/settings.types";

const navigationOptions: Array<{ id: NavigationItemId; label: string; description: string }> = [
  { id: "dashboard", label: "Dashboard", description: "Your business command center" },
  { id: "leads", label: "Leads", description: "Inbound and follow-up pipeline" },
  { id: "estimates", label: "Estimates", description: "Quotes and approvals" },
  { id: "jobs", label: "Jobs", description: "Field work and schedules" },
  { id: "customers", label: "Customers", description: "Your customer directory" },
  { id: "invoices", label: "Invoices", description: "Billing and payments" },
  { id: "settings", label: "Settings", description: "Customize RightTemp OS" },
];

const dashboardOptions: Array<{ id: DashboardWidgetId; label: string; description: string }> = [
  { id: "action-queue", label: "Action queue", description: "Priority follow-ups and decisions" },
  { id: "sales-schedule", label: "Sales schedule", description: "Today’s calls and estimates" },
  { id: "job-schedule", label: "Job schedule", description: "Today’s field operations" },
  { id: "metrics", label: "Performance metrics", description: "Leads, pipeline, customers, and conversion" },
  { id: "financials", label: "Financial snapshot", description: "Revenue, margin, jobs, and customers" },
  { id: "insights", label: "Pipeline insights", description: "Pipeline chart and recent leads" },
];

const optionClass = "rounded-xl border px-4 py-3 text-left transition-colors";

function OptionButton({
  selected,
  label,
  description,
  onClick,
  testId,
}: {
  selected: boolean;
  label: string;
  description?: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(optionClass, selected ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:border-primary/50")}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-semibold">{label}</span>
        {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
      </span>
      {description && <span className="mt-1 block text-xs text-muted-foreground">{description}</span>}
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
}) {
  const pickerValue = normalizeHex(value) ?? "#000000";
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          data-testid={`color-picker-${testId}`}
          value={pickerValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />
        <input
          type="text"
          data-testid={`input-color-${testId}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-sm uppercase"
          maxLength={7}
          spellCheck={false}
        />
      </span>
    </label>
  );
}

function SectionActions({
  onSave,
  onCancel,
  onReset,
  saveDisabled,
  saving,
  resetLabel = "Reset section",
}: {
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  saveDisabled: boolean;
  saving: boolean;
  resetLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={onReset} data-testid="button-reset-section">
        <RotateCcw className="h-4 w-4" />
        {resetLabel}
      </Button>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saveDisabled || saving} data-testid="button-cancel-settings">
          Cancel
        </Button>
        <Button type="button" onClick={onSave} disabled={saveDisabled || saving} data-testid="button-save-settings">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function LivePreview({ preferences, branding }: { preferences: UserPreferences; branding: OrganizationBranding }) {
  const colors = branding.colors;
  const contrast = validateThemeColors(preferences.colors);
  const navItems = preferences.navigationOrder
    .map((id) => navigationOptions.find((item) => item.id === id))
    .filter((item): item is typeof navigationOptions[number] => !!item)
    .filter((item) => !preferences.hiddenNavigationItems.includes(item.id) || item.id === "settings")
    .slice(0, 4);
  return (
    <Card className="sticky top-5 overflow-hidden border-primary/20 bg-card/90">
      <CardHeader className="border-b border-border/70">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" />Live preview</CardTitle>
            <CardDescription>See your changes before saving.</CardDescription>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Preview</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="m-4 overflow-hidden rounded-2xl border border-white/10" style={{ backgroundColor: colors.background, color: colors.text }}>
          <div className="flex items-center gap-2 border-b border-white/10 p-3" style={{ backgroundColor: colors.background }}>
            <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-black text-[10px] font-black text-white">
              {branding.logoUrl ? <img src={branding.logoUrl} alt={`${branding.companyName} preview`} className="h-full w-full object-contain" /> : branding.appMark}
            </div>
            <span className="min-w-0 truncate text-xs font-bold">{branding.companyName}</span>
          </div>
          <div className="flex min-h-[19rem]">
            <div className={`${preferences.navigationStyle === "topbar" ? "hidden" : "w-28"} shrink-0 border-r border-white/10 p-2`}>
              {preferences.navigationStyle === "topbar" ? null : navItems.map((item, index) => (
                <div key={item.id} className={`mb-1 truncate rounded-lg px-2 py-2 text-[10px] ${index === 0 ? "font-bold" : "opacity-60"}`} style={index === 0 ? { backgroundColor: `${colors.primary}28`, color: colors.primary } : undefined}>
                  {item.label}
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1 p-4">
              {preferences.navigationStyle === "topbar" && (
                <div className="mb-4 flex gap-3 overflow-hidden border-b border-white/10 pb-2 text-[10px] opacity-70">
                  {navItems.map((item) => <span key={item.id} className="whitespace-nowrap">{item.label}</span>)}
                </div>
              )}
              <div className="mb-3 flex items-end justify-between gap-3">
                <div><p className="text-[10px] uppercase tracking-wider opacity-60">Dashboard</p><p className="mt-1 text-lg font-black">Good morning</p></div>
                <div className="rounded-lg px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: colors.primary, color: contrast.primaryForeground }}>Today</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[["Leads", "24"], ["Revenue", "$18k"], ["Jobs", "12"], ["Win rate", "68%"]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 p-3" style={{ backgroundColor: `${colors.primary}12` }}>
                    <p className="text-[10px] opacity-60">{label}</p><p className="mt-2 text-base font-black">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-white/10 p-3" style={{ backgroundColor: `${colors.accent}10` }}>
                <p className="text-[10px] font-bold" style={{ color: colors.accent }}>Next up</p>
                <p className="mt-1 text-xs font-semibold">Follow up with the Johnson household</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 text-xs">
          <div className="rounded-lg border border-border bg-background/40 p-3"><span className="text-muted-foreground">Corners</span><p className="mt-1 font-semibold capitalize">{preferences.cornerStyle}</p></div>
          <div className="rounded-lg border border-border bg-background/40 p-3"><span className="text-muted-foreground">Density</span><p className="mt-1 font-semibold capitalize">{preferences.density}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  const { toast } = useToast();
  const [draftPreferences, setDraftPreferences] = useState(() => clonePreferences(settings.preferences));
  const [draftBranding, setDraftBranding] = useState(() => cloneBranding(settings.branding));
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.branding.logoUrl);
  const [savingSection, setSavingSection] = useState<"personal" | "branding" | null>(null);
  const [resetTarget, setResetTarget] = useState<"personal" | "branding" | "everything" | null>(null);
  const [draggingWidget, setDraggingWidget] = useState<DashboardWidgetId | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!settings.isLoading && !hasInitialized.current) {
      setDraftPreferences(clonePreferences(settings.savedPreferences));
      setDraftBranding(cloneBranding(settings.savedBranding));
      setLogoPreview(settings.savedBranding.logoUrl);
      hasInitialized.current = true;
    }
  }, [settings.isLoading, settings.savedPreferences, settings.savedBranding]);

  useEffect(() => {
    if (!settings.isLoading) settings.previewPreferences(draftPreferences);
  }, [draftPreferences, settings.isLoading]);

  useEffect(() => {
    if (!settings.isLoading) settings.previewBranding({ ...draftBranding, logoUrl: logoPreview });
  }, [draftBranding, logoPreview, settings.isLoading]);

  useEffect(() => () => settings.clearPreviews(), []);

  const personalDirty = JSON.stringify(draftPreferences) !== JSON.stringify(settings.savedPreferences);
  const brandingDirty = JSON.stringify({ ...draftBranding, logoUrl: null }) !== JSON.stringify({ ...settings.savedBranding, logoUrl: null }) || !!pendingLogo;
  const personalContrast = useMemo(() => validateThemeColors(draftPreferences.colors), [draftPreferences.colors]);
  const brandingContrast = useMemo(() => validateThemeColors(draftBranding.colors), [draftBranding.colors]);

  if (settings.isLoading) {
    return <div className="space-y-5 p-4 md:p-8"><div className="h-32 animate-pulse rounded-3xl bg-muted" /><div className="h-[34rem] animate-pulse rounded-3xl bg-muted" /></div>;
  }

  if (settings.error) {
    return <div className="p-6 md:p-8"><Card><CardContent className="py-12 text-center"><p className="font-semibold text-destructive">Unable to load settings.</p><p className="mt-2 text-sm text-muted-foreground">{settings.error.message}</p></CardContent></Card></div>;
  }

  const updatePreferences = (update: Partial<UserPreferences>) => setDraftPreferences((current) => ({ ...current, ...update }));
  const updateBranding = (update: Partial<OrganizationBranding>) => setDraftBranding((current) => ({ ...current, ...update }));
  const updatePersonalColor = (key: keyof UserPreferences["colors"], value: string) => updatePreferences({ colors: { ...draftPreferences.colors, [key]: value } });
  const updateBrandColor = (key: keyof OrganizationBranding["colors"], value: string) => updateBranding({ colors: { ...draftBranding.colors, [key]: value } });

  const moveNavigation = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draftPreferences.navigationOrder.length) return;
    const order = [...draftPreferences.navigationOrder];
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    updatePreferences({ navigationOrder: order });
  };

  const moveWidget = (id: DashboardWidgetId, targetId: DashboardWidgetId) => {
    const order = [...draftPreferences.dashboardWidgetOrder];
    const sourceIndex = order.indexOf(id);
    const targetIndex = order.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    order.splice(sourceIndex, 1);
    order.splice(targetIndex, 0, id);
    updatePreferences({ dashboardWidgetOrder: order });
  };

  const toggleNavigationItem = (id: NavigationItemId) => {
    if (id === "settings") return;
    const hidden = draftPreferences.hiddenNavigationItems.includes(id)
      ? draftPreferences.hiddenNavigationItems.filter((item) => item !== id)
      : [...draftPreferences.hiddenNavigationItems, id];
    updatePreferences({ hiddenNavigationItems: hidden });
  };

  const toggleDashboardWidget = (id: DashboardWidgetId) => {
    const hidden = draftPreferences.hiddenDashboardWidgets.includes(id)
      ? draftPreferences.hiddenDashboardWidgets.filter((item) => item !== id)
      : [...draftPreferences.hiddenDashboardWidgets, id];
    updatePreferences({ hiddenDashboardWidgets: hidden });
  };

  const savePersonal = async () => {
    if (!personalContrast.valid) {
      toast({ title: "Improve contrast before saving", description: "Text and controls need at least 4.5:1 contrast.", variant: "destructive" });
      return;
    }
    setSavingSection("personal");
    try {
      await settings.savePreferences(draftPreferences);
      toast({ title: "Personal settings saved", description: "Your preferences follow you on every device." });
    } catch (error) {
      toast({ title: "Unable to save personal settings", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const saveBrand = async () => {
    if (!settings.isAdmin) return;
    if (!brandingContrast.valid) {
      toast({ title: "Improve brand contrast before saving", description: "Brand text and controls need at least 4.5:1 contrast.", variant: "destructive" });
      return;
    }
    setSavingSection("branding");
    try {
      const saved = await settings.saveBranding(draftBranding, pendingLogo);
      setDraftBranding(cloneBranding(saved));
      setLogoPreview(saved.logoUrl);
      setPendingLogo(null);
      toast({ title: "Company branding saved", description: "Your organization’s identity is updated." });
    } catch (error) {
      toast({ title: "Unable to save company branding", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const confirmReset = async () => {
    if (!resetTarget) return;
    setSavingSection(resetTarget === "personal" ? "personal" : "branding");
    try {
      if (resetTarget === "personal") {
        await settings.resetPreferences();
        setDraftPreferences(clonePreferences(RIGHTTEMP_DEFAULT_PREFERENCES));
        toast({ title: "Personal settings reset" });
      } else if (resetTarget === "branding") {
        await settings.resetBranding();
        setDraftBranding({ organizationId: settings.savedBranding.organizationId, ...RIGHTTEMP_DEFAULT_BRANDING });
        setPendingLogo(null);
        setLogoPreview(null);
        toast({ title: "Company branding reset" });
      } else {
        await settings.resetPreferences();
        if (settings.isAdmin) await settings.resetBranding();
        setDraftPreferences(clonePreferences(RIGHTTEMP_DEFAULT_PREFERENCES));
        setDraftBranding({ organizationId: settings.savedBranding.organizationId, ...RIGHTTEMP_DEFAULT_BRANDING });
        setPendingLogo(null);
        setLogoPreview(null);
        toast({ title: "RightTemp defaults restored" });
      }
    } catch (error) {
      toast({ title: "Reset failed", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally {
      setSavingSection(null);
      setResetTarget(null);
    }
  };

  const handleLogo = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast({ title: "Logo not accepted", description: "Use a PNG, JPG, WEBP, or SVG file under 5 MB.", variant: "destructive" });
      return;
    }
    setPendingLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  return (
    <div className="mx-auto w-full max-w-[var(--app-content-max-width)] space-y-6 p-4 pb-24 md:p-8 md:pb-10">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/80 p-6 md:p-8">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Settings2 className="h-3.5 w-3.5" /> Workspace control room</p>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">Make RightTemp <span className="righttemp-gradient-text">yours.</span></h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">Tune the interface around the way your team works. Your personal choices stay private; company identity is protected for organization admins.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-background/50 p-2 text-xs text-muted-foreground"><Palette className="h-4 w-4 text-primary" /> Live across your workspace</div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" /> Personal settings</CardTitle>
              <CardDescription>Only your account sees these preferences. Existing users start with the current RightTemp look.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <section className="space-y-3">
                <div><h2 className="font-semibold">Theme</h2><p className="text-sm text-muted-foreground">Choose how RightTemp responds to your screen.</p></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([["dark", "Dark", "The current RightTemp look", Moon], ["light", "Light", "A bright, high-clarity workspace", Sun], ["system", "System", "Follow your device setting", Monitor]] as const).map(([value, label, description, Icon]) => (
                    <button type="button" key={value} data-testid={`button-theme-${value}`} onClick={() => updatePreferences({ theme: value as ThemeMode })} className={cn(optionClass, draftPreferences.theme === value ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:border-primary/50")}>
                      <Icon className="mb-3 h-5 w-5 text-primary" /><span className="flex items-center justify-between gap-2 font-semibold">{label}{draftPreferences.theme === value && <Check className="h-4 w-4" />}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div><h2 className="font-semibold">Your color system</h2><p className="text-sm text-muted-foreground">Controls protect readable contrast as you explore color.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.entries(draftPreferences.colors) as Array<[keyof UserPreferences["colors"], string]>).map(([key, value]) => (
                    <ColorField key={key} label={key[0].toUpperCase() + key.slice(1)} value={value} onChange={(next) => updatePersonalColor(key, next)} testId={`personal-${key}`} />
                  ))}
                </div>
                <ContrastMessage result={personalContrast} />
              </section>

              <section className="space-y-4">
                <div><h2 className="font-semibold">Comfort and shape</h2><p className="text-sm text-muted-foreground">Adjust readability and visual rhythm without changing the data.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChoiceGroup label="Font scale" values={[["small", "Small"], ["default", "Default"], ["large", "Large"], ["extra-large", "Extra large"]]} selected={draftPreferences.fontScale} onChange={(value) => updatePreferences({ fontScale: value as FontScale })} testPrefix="font-scale" />
                  <ChoiceGroup label="Interface density" values={[["compact", "Compact"], ["comfortable", "Comfortable"], ["spacious", "Spacious"]]} selected={draftPreferences.density} onChange={(value) => updatePreferences({ density: value as InterfaceDensity })} testPrefix="density" />
                  <ChoiceGroup label="Corner style" values={[["sharp", "Sharp"], ["soft", "Soft"], ["rounded", "Rounded"]]} selected={draftPreferences.cornerStyle} onChange={(value) => updatePreferences({ cornerStyle: value as CornerStyle })} testPrefix="corners" />
                  <ChoiceGroup label="Card style" values={[["flat", "Flat"], ["bordered", "Bordered"], ["elevated", "Elevated"]]} selected={draftPreferences.cardStyle} onChange={(value) => updatePreferences({ cardStyle: value as CardStyle })} testPrefix="cards" />
                </div>
              </section>

              <section className="space-y-4">
                <div><h2 className="font-semibold">Navigation and layout</h2><p className="text-sm text-muted-foreground">Choose how the workspace is arranged on larger screens. Mobile keeps its bottom navigation for stability.</p></div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <ChoiceGroup label="Navigation" values={[["sidebar", "Sidebar"], ["topbar", "Top bar"], ["compact", "Compact rail"]]} selected={draftPreferences.navigationStyle} onChange={(value) => updatePreferences({ navigationStyle: value as NavigationStyle })} testPrefix="navigation" />
                  <ChoiceGroup label="Layout preset" values={[["mobile-first", "Mobile-first"], ["balanced", "Balanced"], ["wide", "Wide"]]} selected={draftPreferences.layoutPreset} onChange={(value) => updatePreferences({ layoutPreset: value as LayoutPreset })} testPrefix="layout" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/30 p-4">
                    <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Navigation order</h3><p className="text-xs text-muted-foreground">Settings stays available.</p></div><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
                    <div className="space-y-2">
                      {draftPreferences.navigationOrder.map((id, index) => {
                        const item = navigationOptions.find((option) => option.id === id)!;
                        const hidden = draftPreferences.hiddenNavigationItems.includes(id);
                        return <div key={id} className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/60 p-2" data-testid={`navigation-row-${id}`}>
                          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.label}</p><p className="truncate text-[11px] text-muted-foreground">{item.description}</p></div>
                          <button type="button" data-testid={`button-nav-up-${id}`} aria-label={`Move ${item.label} up`} onClick={() => moveNavigation(index, -1)} disabled={index === 0} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                          <button type="button" data-testid={`button-nav-down-${id}`} aria-label={`Move ${item.label} down`} onClick={() => moveNavigation(index, 1)} disabled={index === draftPreferences.navigationOrder.length - 1} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                          <button type="button" data-testid={`button-nav-toggle-${id}`} onClick={() => toggleNavigationItem(id)} disabled={id === "settings"} className={cn("rounded-full px-2 py-1 text-[10px] font-bold", hidden ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary", id === "settings" && "cursor-not-allowed opacity-60")}>{hidden ? "Hidden" : "Shown"}</button>
                        </div>;
                      })}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/30 p-4">
                    <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Dashboard layout</h3><p className="text-xs text-muted-foreground">Drag sections into your flow.</p></div><LayoutDashboard className="h-4 w-4 text-primary" /></div>
                    <div className="space-y-2">
                      {draftPreferences.dashboardWidgetOrder.map((id) => {
                        const item = dashboardOptions.find((option) => option.id === id)!;
                        const hidden = draftPreferences.hiddenDashboardWidgets.includes(id);
                        return <div key={id} draggable data-testid={`dashboard-widget-${id}`} onDragStart={() => setDraggingWidget(id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggingWidget) moveWidget(draggingWidget, id); setDraggingWidget(null); }} className={cn("flex cursor-grab items-center gap-2 rounded-xl border border-border/70 bg-background/60 p-2 active:cursor-grabbing", hidden && "opacity-55")}>
                          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.label}</p><p className="truncate text-[11px] text-muted-foreground">{item.description}</p></div>
                          <button type="button" data-testid={`button-widget-toggle-${id}`} onClick={() => toggleDashboardWidget(id)} className={cn("rounded-full px-2 py-1 text-[10px] font-bold", hidden ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary")}>{hidden ? "Hidden" : "Shown"}</button>
                        </div>;
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <SectionActions onSave={savePersonal} onCancel={() => { setDraftPreferences(clonePreferences(settings.savedPreferences)); settings.clearPreviews(); }} onReset={() => setResetTarget("personal")} saveDisabled={!personalDirty || !personalContrast.valid} saving={savingSection === "personal"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /> Company branding</CardTitle>
              <CardDescription>Organization-wide identity for admins and owners. Members can preview it but cannot change it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-7">
              {!settings.isAdmin && <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200" data-testid="status-branding-admin-only">Only an organization admin or owner can edit company branding.</div>}
              <fieldset disabled={!settings.isAdmin} className="space-y-7 disabled:opacity-70">
                <div className="grid gap-5 md:grid-cols-[1fr_220px]">
                  <div className="space-y-4">
                    <label className="block space-y-2"><span className="text-sm font-semibold">Company name</span><input data-testid="input-company-name" value={draftBranding.companyName} onChange={(event) => updateBranding({ companyName: event.target.value })} className="h-11 w-full rounded-lg border border-input bg-background px-3" maxLength={80} /></label>
                    <label className="block space-y-2"><span className="text-sm font-semibold">App mark</span><input data-testid="input-app-mark" value={draftBranding.appMark} onChange={(event) => updateBranding({ appMark: event.target.value.slice(0, 4) })} className="h-11 w-full rounded-lg border border-input bg-background px-3 font-bold uppercase" maxLength={4} placeholder="RT" /><span className="block text-xs text-muted-foreground">Shown when no logo is uploaded. Keep it to 1–4 characters.</span></label>
                  </div>
                  <div className="space-y-3">
                    <span className="text-sm font-semibold">Logo</span>
                    <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-background/50">
                      {logoPreview ? <img src={logoPreview} alt={`${draftBranding.companyName} logo preview`} className="h-full w-full object-contain p-5" data-testid="img-logo-preview" /> : <div className="text-center text-muted-foreground"><ImagePlus className="mx-auto h-8 w-8" /><p className="mt-2 text-xs">No logo yet</p></div>}
                    </div>
                    <div className="flex gap-2">
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"><Upload className="h-4 w-4" />{logoPreview ? "Replace" : "Upload"}<input data-testid="input-company-logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(event) => handleLogo(event.target.files?.[0])} /></label>
                      {logoPreview && <Button type="button" variant="outline" size="icon" onClick={() => { setPendingLogo(null); setLogoPreview(null); updateBranding({ logoPath: null, logoUrl: null }); }} data-testid="button-remove-logo" aria-label="Remove logo"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">PNG, JPG, WEBP, or SVG up to 5 MB. Stored privately for your organization.</p>
                  </div>
                </div>
                <section className="space-y-4">
                  <div><h3 className="font-semibold">Brand-color defaults</h3><p className="text-sm text-muted-foreground">These set the organization’s visual baseline for future workspace surfaces.</p></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(Object.entries(draftBranding.colors) as Array<[keyof OrganizationBranding["colors"], string]>).map(([key, value]) => (
                      <ColorField key={key} label={key[0].toUpperCase() + key.slice(1)} value={value} onChange={(next) => updateBrandColor(key, next)} testId={`brand-${key}`} />
                    ))}
                  </div>
                  <ContrastMessage result={brandingContrast} />
                </section>
                <SectionActions onSave={saveBrand} onCancel={() => { setDraftBranding(cloneBranding(settings.savedBranding)); setPendingLogo(null); setLogoPreview(settings.savedBranding.logoUrl); settings.clearPreviews(); }} onReset={() => setResetTarget("branding")} saveDisabled={!brandingDirty || !brandingContrast.valid} saving={savingSection === "branding"} resetLabel="Reset branding" />
              </fieldset>
            </CardContent>
          </Card>

          {settings.isAdmin && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <div><p className="font-semibold">Start over</p><p className="text-xs text-muted-foreground">Restore the RightTemp defaults across your personal workspace and company identity.</p></div>
            <Button type="button" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setResetTarget("everything")} data-testid="button-reset-everything"><RotateCcw className="h-4 w-4" />Reset everything</Button>
          </div>}
        </div>

        <LivePreview preferences={draftPreferences} branding={{ ...draftBranding, logoUrl: logoPreview }} />
      </div>

      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {resetTarget === "everything" ? "everything" : resetTarget === "branding" ? "company branding" : "personal settings"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {resetTarget === "branding" || resetTarget === "everything"
                ? "This immediately removes saved custom colors and the organization logo. This cannot be undone."
                : "This immediately removes your saved interface preferences and restores the current RightTemp styling."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reset">Keep my settings</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} data-testid="button-confirm-reset">Reset now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContrastMessage({ result }: { result: ReturnType<typeof validateThemeColors> }) {
  return (
    <div className={cn("rounded-xl border p-3 text-xs", result.valid ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200")} data-testid="status-contrast">
      {result.valid ? "Accessible contrast protected — this palette is ready to save." : `Improve contrast before saving. Text: ${result.textContrast.toFixed(1)}:1 · Primary: ${result.primaryContrast.toFixed(1)}:1 · Accent: ${result.accentContrast.toFixed(1)}:1`}
    </div>
  );
}

function ChoiceGroup({ label, values, selected, onChange, testPrefix }: { label: string; values: ReadonlyArray<readonly [string, string]>; selected: string; onChange: (value: string) => void; testPrefix: string }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="grid gap-2">
        {values.map(([value, text]) => <button key={value} type="button" data-testid={`button-${testPrefix}-${value}`} onClick={() => onChange(value)} className={cn("rounded-lg border px-3 py-2 text-left text-xs font-semibold", selected === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/30 hover:border-primary/50")}>{text}{selected === value && <Check className="float-right h-3.5 w-3.5" />}</button>)}
      </div>
    </div>
  );
}