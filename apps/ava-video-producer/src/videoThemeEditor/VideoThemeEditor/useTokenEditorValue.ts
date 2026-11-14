import { useMemo } from "react";
import { setCustomValueInDraft } from "../customTokenValue/customTokenValue";
import {
  resetTokenInDraft,
  setTokenInDraft,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
import type {
  ResolvedVideoTheme,
  VideoThemeIssue,
} from "../../videoTheme/videoTheme.types";
import type { TokenEditorContextValue } from "../TokenEditorContext/TokenEditorContext";
import type { TokenRow } from "../tokenRows/tokenRows";
import type { EditorItem } from "./EditorToolbar";

const OPAQUE_HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** The context `VideoThemeEditor` gives its controls; tightly coupled to it. */
export function useTokenEditorValue(
  options: Readonly<{
    draft: ThemeDraft;
    scope: ThemeEditScope;
    rows: readonly TokenRow[];
    theme: ResolvedVideoTheme;
    issues: readonly VideoThemeIssue[];
    item?: EditorItem;
    onDraftChange: (draft: ThemeDraft) => void;
  }>,
): TokenEditorContextValue {
  const { draft, scope, rows, theme, issues, item, onDraftChange } = options;
  const swatches = useMemo(
    () =>
      [
        ...new Set([
          ...Object.values(theme.atomic.swatch),
          ...(theme.mantine.colors.primary ?? []),
        ]),
      ].filter((color) => OPAQUE_HEX_COLOR.test(color)),
    [theme],
  );
  return useMemo(
    () => ({
      scope,
      rows,
      theme,
      issues,
      swatches,
      item,
      setToken: (tokenPath, value) =>
        onDraftChange(setTokenInDraft(draft, scope, tokenPath, value)),
      setCustomValue: (request) =>
        onDraftChange(setCustomValueInDraft(draft, scope, request)),
      resetToken: (tokenPath) =>
        onDraftChange(resetTokenInDraft(draft, scope, tokenPath)),
    }),
    [draft, scope, rows, theme, issues, swatches, item, onDraftChange],
  );
}
