import { getCurrentOrganizationId } from "@/lib/get-current-organization-id";
import { supabase } from "@/lib/supabase";
import {
  RIGHTTEMP_DEFAULT_BRANDING,
  RIGHTTEMP_DEFAULT_COLORS,
  RIGHTTEMP_DEFAULT_PREFERENCES,
  type OrganizationBranding,
  type OrganizationContext,
  type ThemeColors,
  type UserPreferences,
} from "./settings.types";

const BRANDING_BUCKET = "organization-branding";

function mergePreferences(value: unknown): UserPreferences {
  const input = value && typeof value === "object" ? value as Partial<UserPreferences> : {};
  const colors = input.colors && typeof input.colors === "object"
    ? { ...RIGHTTEMP_DEFAULT_COLORS, ...(input.colors as Partial<ThemeColors>) }
    : RIGHTTEMP_DEFAULT_COLORS;

  return {
    ...RIGHTTEMP_DEFAULT_PREFERENCES,
    ...input,
    colors,
    navigationOrder: Array.isArray(input.navigationOrder)
      ? input.navigationOrder as UserPreferences["navigationOrder"]
      : [...RIGHTTEMP_DEFAULT_PREFERENCES.navigationOrder],
    hiddenNavigationItems: Array.isArray(input.hiddenNavigationItems)
      ? input.hiddenNavigationItems as UserPreferences["hiddenNavigationItems"]
      : [],
    dashboardWidgetOrder: Array.isArray(input.dashboardWidgetOrder)
      ? input.dashboardWidgetOrder as UserPreferences["dashboardWidgetOrder"]
      : [...RIGHTTEMP_DEFAULT_PREFERENCES.dashboardWidgetOrder],
    hiddenDashboardWidgets: Array.isArray(input.hiddenDashboardWidgets)
      ? input.hiddenDashboardWidgets as UserPreferences["hiddenDashboardWidgets"]
      : [],
  };
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`Unable to load user preferences: ${userError.message}`);
  if (!userData.user) throw new Error("User is not authenticated");

  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferences")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load user preferences: ${error.message}`);
  return mergePreferences(data?.preferences);
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`Unable to save user preferences: ${userError.message}`);
  if (!userData.user) throw new Error("User is not authenticated");

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userData.user.id, preferences }, { onConflict: "user_id" })
    .select("preferences")
    .single();
  if (error) throw new Error(`Unable to save user preferences: ${error.message}`);
  return mergePreferences(data.preferences);
}

export async function getOrganizationContext(): Promise<OrganizationContext> {
  const organizationId = await getCurrentOrganizationId();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`Unable to verify organization access: ${userError.message}`);
  if (!userData.user) throw new Error("User is not authenticated");

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load organization role: ${error.message}`);
  if (!data) throw new Error("No organization membership found for the authenticated user");
  return { organizationId: data.organization_id, role: data.role as OrganizationContext["role"] };
}

export async function getOrganizationBranding(): Promise<OrganizationBranding> {
  const context = await getOrganizationContext();
  const [{ data: organization, error: organizationError }, { data: branding, error: brandingError }] = await Promise.all([
    supabase.from("organizations").select("name, logo_url").eq("id", context.organizationId).single(),
    supabase.from("organization_branding").select("organization_id, company_name, app_mark, logo_path, primary_color, accent_color, background_color, text_color").eq("organization_id", context.organizationId).maybeSingle(),
  ]);
  if (organizationError) throw new Error(`Unable to load organization branding: ${organizationError.message}`);
  if (brandingError) throw new Error(`Unable to load organization branding: ${brandingError.message}`);

  const brandingColors = branding
    ? {
        primary: branding.primary_color,
        accent: branding.accent_color,
        background: branding.background_color,
        text: branding.text_color,
      }
    : RIGHTTEMP_DEFAULT_BRANDING.colors;
  const logoPath = branding?.logo_path ?? null;
  let logoUrl = branding ? null : organization.logo_url;
  if (logoPath) {
    const { data: signed, error: signedError } = await supabase.storage
      .from(BRANDING_BUCKET)
      .createSignedUrl(logoPath, 60 * 60);
    if (signedError) throw new Error(`Unable to load organization logo: ${signedError.message}`);
    logoUrl = signed.signedUrl;
  }

  return {
    organizationId: context.organizationId,
    companyName: branding?.company_name ?? organization.name ?? RIGHTTEMP_DEFAULT_BRANDING.companyName,
    appMark: branding?.app_mark ?? RIGHTTEMP_DEFAULT_BRANDING.appMark,
    logoPath,
    logoUrl,
    colors: brandingColors,
  };
}

export async function saveOrganizationBranding(
  branding: OrganizationBranding,
  logoFile: File | null,
  existingLogoPath: string | null,
): Promise<OrganizationBranding> {
  const context = await getOrganizationContext();
  if (context.role === "member") throw new Error("Only organization admins can update company branding.");

  let logoPath = branding.logoPath;
  let uploadedLogoPath: string | null = null;
  if (logoFile) {
    const extension = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    uploadedLogoPath = `${context.organizationId}/logo-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(BRANDING_BUCKET)
      .upload(uploadedLogoPath, logoFile, { contentType: logoFile.type, upsert: false, cacheControl: "3600" });
    if (uploadError) throw new Error(`Unable to upload organization logo: ${uploadError.message}`);
    logoPath = uploadedLogoPath;
  }

  const { error } = await supabase
    .from("organization_branding")
    .upsert({
      organization_id: context.organizationId,
      company_name: branding.companyName.trim() || RIGHTTEMP_DEFAULT_BRANDING.companyName,
      app_mark: branding.appMark.trim().slice(0, 4) || RIGHTTEMP_DEFAULT_BRANDING.appMark,
      logo_path: logoPath,
      primary_color: branding.colors.primary.toUpperCase(),
      accent_color: branding.colors.accent.toUpperCase(),
      background_color: branding.colors.background.toUpperCase(),
      text_color: branding.colors.text.toUpperCase(),
    }, { onConflict: "organization_id" });

  if (error) {
    if (uploadedLogoPath) await supabase.storage.from(BRANDING_BUCKET).remove([uploadedLogoPath]);
    throw new Error(`Unable to save organization branding: ${error.message}`);
  }

  if (existingLogoPath && existingLogoPath !== logoPath) {
    await supabase.storage.from(BRANDING_BUCKET).remove([existingLogoPath]);
  }

  return getOrganizationBranding();
}

export async function deleteOrganizationLogo(path: string): Promise<void> {
  const context = await getOrganizationContext();
  if (context.role === "member") throw new Error("Only organization admins can remove the company logo.");
  const { error } = await supabase.storage.from(BRANDING_BUCKET).remove([path]);
  if (error) throw new Error(`Unable to remove organization logo: ${error.message}`);
}