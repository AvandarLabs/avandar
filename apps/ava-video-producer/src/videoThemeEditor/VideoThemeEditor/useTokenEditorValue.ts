import { useMemo } from "react";
import { OPAQUE_HEX_COLOR } from "../controls/ControlValues/ControlValues";
import { CustomTokenValues } from "../CustomTokenValues/CustomTokenValues";
import {
  type ThemeDraft,
  type ThemeEditScope,
  ThemeDrafts,
} from "../ThemeDrafts/ThemeDrafts";
import { type TokenRow } from "../TokenRows/TokenRows.types";
import type {
  ResolvedVideoTheme,
  VideoThemeIssue,
} from "../../videoTheme/videoTheme.types";
import type { TokenEditorContextValue } from "../TokenEditorContext";
import type { EditorItem } from "./EditorToolbar/EditorToolbar";

type TokenEditorValueOptions = Readonly<{
  draft: ThemeDraft;
  scope: ThemeEditScope;
  rows: readonly TokenRow[];
  theme: ResolvedVideoTheme;
  issues: readonly VideoThemeIssue[];
  item?: EditorItem;
  onDraftChange: (draft: ThemeDraft) => void;
}>;
/** The context `VideoThemeEditor` gives its controls; tightly coupled to it. */
export function useTokenEditorValue(
  options: TokenEditorValueOptions,
): TokenEditorContextValue {
  const { draft, scope, rows, theme, issues, item, onDraftChange } = options;
  const swatches = useMemo(() => {
    return [
      ...new Set([
        ...Object.values(theme.atomic.swatch),
        ...(theme.mantine.colors.primary ?? []),
      ]),
    ].filter((color) => {
      return OPAQUE_HEX_COLOR.test(color);
    });
  }, [theme]);
  return useMemo(() => {
    return {
      scope,
      rows,
      theme,
      issues,
      swatches,
      item,
      setToken: (tokenPath, value) => {
        return onDraftChange(
          ThemeDrafts.setTokenInDraft({ draft, scope, tokenPath, value }),
        );
      },
      setCustomValue: (request) => {
        return onDraftChange(
          CustomTokenValues.setCustomValueInDraft({ draft, scope, request }),
        );
      },
      resetToken: (tokenPath) => {
        return onDraftChange(
          ThemeDrafts.resetTokenInDraft({ draft, scope, tokenPath }),
        );
      },
    };
  }, [draft, scope, rows, theme, issues, swatches, item, onDraftChange]);
}
