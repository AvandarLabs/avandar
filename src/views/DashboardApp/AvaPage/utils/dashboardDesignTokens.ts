import { useLingui } from "@lingui/react/macro";
import type {
  AvaPageThemeName,
  AvaPageTypographyName,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";

export type DashboardDesignTokens = {
  /** CSS color for the page background. Defaults to the workspace neutral. */
  pageBackground: string;
  /** CSS color used for the page title + section accent bar. */
  accentColor: string;
  /** CSS color for the page title text. */
  titleColor: string;
  /** Font family applied to the body of the dashboard. */
  bodyFontFamily: string;
  /** Font family applied to titles + subtitles. */
  headingFontFamily: string;
  /** Subtitle color (slightly dimmed). */
  subtitleColor: string;
  /** Byline color. */
  bylineColor: string;
};

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF_FONT =
  '"Source Serif Pro", "Iowan Old Style", "Apple Garamond", Baskerville, "Times New Roman", serif';
const MONO_FONT =
  '"IBM Plex Mono", "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

const THEME_TOKENS: Record<
  AvaPageThemeName,
  {
    pageBackground: string;
    accentColor: string;
    titleColor: string;
    subtitleColor: string;
    bylineColor: string;
  }
> = {
  default: {
    pageBackground: "var(--mantine-color-neutral-0)",
    accentColor: "var(--mantine-color-primary-6)",
    titleColor: "var(--mantine-color-neutral-9)",
    subtitleColor: "var(--mantine-color-neutral-7)",
    bylineColor: "var(--mantine-color-neutral-6)",
  },
  ocean: {
    pageBackground: "#F4F8FB",
    accentColor: "#0E7490",
    titleColor: "#0F172A",
    subtitleColor: "#334155",
    bylineColor: "#64748B",
  },
  forest: {
    pageBackground: "#F5F8F4",
    accentColor: "#15803D",
    titleColor: "#14532D",
    subtitleColor: "#3F6212",
    bylineColor: "#65A30D",
  },
  rose: {
    pageBackground: "#FDF2F8",
    accentColor: "#BE185D",
    titleColor: "#831843",
    subtitleColor: "#9D174D",
    bylineColor: "#A1A1AA",
  },
  amber: {
    pageBackground: "#FFFBEB",
    accentColor: "#B45309",
    titleColor: "#451A03",
    subtitleColor: "#78350F",
    bylineColor: "#A16207",
  },
  graphite: {
    pageBackground: "#F8FAFC",
    accentColor: "#1F2937",
    titleColor: "#0F172A",
    subtitleColor: "#334155",
    bylineColor: "#64748B",
  },
};

const TYPOGRAPHY_TOKENS: Record<
  AvaPageTypographyName,
  { body: string; heading: string }
> = {
  system: { body: SYSTEM_FONT, heading: SYSTEM_FONT },
  serif: { body: SYSTEM_FONT, heading: SERIF_FONT },
  mono: { body: SYSTEM_FONT, heading: MONO_FONT },
};

export function getDashboardDesignTokens(options: {
  theme: AvaPageThemeName | undefined;
  typography: AvaPageTypographyName | undefined;
}): DashboardDesignTokens {
  const themeName: AvaPageThemeName = options.theme ?? "default";
  const typographyName: AvaPageTypographyName = options.typography ?? "system";
  const theme = THEME_TOKENS[themeName] ?? THEME_TOKENS.default;
  const typography =
    TYPOGRAPHY_TOKENS[typographyName] ?? TYPOGRAPHY_TOKENS.system;
  return {
    pageBackground: theme.pageBackground,
    accentColor: theme.accentColor,
    titleColor: theme.titleColor,
    subtitleColor: theme.subtitleColor,
    bylineColor: theme.bylineColor,
    bodyFontFamily: typography.body,
    headingFontFamily: typography.heading,
  };
}

/**
 * React hook returning the display labels for the dashboard theme select
 * input. Labels are translated via the Lingui macro, so this must be invoked
 * from a React component / hook.
 */
export function useDashboardThemeOptions(): ReadonlyArray<{
  value: AvaPageThemeName;
  label: string;
}> {
  const { t } = useLingui();
  return [
    { value: "default", label: t`Avandar (default)` },
    { value: "ocean", label: t`Ocean` },
    { value: "forest", label: t`Forest` },
    { value: "rose", label: t`Rose` },
    { value: "amber", label: t`Amber` },
    { value: "graphite", label: t`Graphite` },
  ];
}

/**
 * React hook returning the display labels for the dashboard typography select
 * input. Labels are translated via the Lingui macro, so this must be invoked
 * from a React component / hook.
 */
export function useDashboardTypographyOptions(): ReadonlyArray<{
  value: AvaPageTypographyName;
  label: string;
}> {
  const { t } = useLingui();
  return [
    { value: "system", label: t`System sans` },
    { value: "serif", label: t`Editorial serif` },
    { value: "mono", label: t`Monospace headlines` },
  ];
}
