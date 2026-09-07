import type { ThemeColors } from "./settings.types";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function normalizeHex(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return HEX_COLOR.test(normalized) ? normalized : null;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16) / 255,
    g: Number.parseInt(normalized.slice(3, 5), 16) / 255,
    b: Number.parseInt(normalized.slice(5, 7), 16) / 255,
  };
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const linear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  if (firstLuminance === null || secondLuminance === null) return 0;
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableTextColor(background: string): string {
  return contrastRatio(background, "#FFFFFF") >= contrastRatio(background, "#000000")
    ? "#FFFFFF"
    : "#000000";
}

export function validateThemeColors(colors: ThemeColors) {
  const textContrast = contrastRatio(colors.text, colors.background);
  const primaryForeground = readableTextColor(colors.primary);
  const accentForeground = readableTextColor(colors.accent);
  const primaryContrast = contrastRatio(primaryForeground, colors.primary);
  const accentContrast = contrastRatio(accentForeground, colors.accent);

  return {
    valid:
      [colors.primary, colors.accent, colors.background, colors.text].every((color) => !!normalizeHex(color)) &&
      textContrast >= 4.5 &&
      primaryContrast >= 4.5 &&
      accentContrast >= 4.5,
    textContrast,
    primaryContrast,
    accentContrast,
    primaryForeground,
    accentForeground,
  };
}

export function hexToHsl(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0% 0%";
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(lightness * 100)}%`;

  const difference = max - min;
  const saturation = lightness > 0.5
    ? difference / (2 - max - min)
    : difference / (max + min);
  let hue = 0;
  if (max === r) hue = (g - b) / difference + (g < b ? 6 : 0);
  if (max === g) hue = (b - r) / difference + 2;
  if (max === b) hue = (r - g) / difference + 4;
  hue /= 6;

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function colorsEqual(first: ThemeColors, second: ThemeColors): boolean {
  return ["primary", "accent", "background", "text"].every((key) =>
    first[key as keyof ThemeColors].toUpperCase() === second[key as keyof ThemeColors].toUpperCase(),
  );
}