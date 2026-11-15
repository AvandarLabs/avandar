import { createContext, useContext } from "react";
import type {
  ResolvedVideoTheme,
  VideoThemeIssue,
} from "../../videoTheme/videoTheme.types";
import type { CustomValueRequest } from "../customTokenValue/customTokenValue";
import type { ThemeEditScope } from "../themeDraft/themeDraft";
import type { TokenRow } from "../tokenRows/tokenRows";
import type { EditorItem } from "../VideoThemeEditor/EditorToolbar/EditorToolbar";

/** What every token control reads and the edits it can make. */
export type TokenEditorContextValue = Readonly<{
  scope: ThemeEditScope;
  rows: readonly TokenRow[];
  theme: ResolvedVideoTheme;
  issues: readonly VideoThemeIssue[];
  /** Six-digit theme colours offered by colour pickers. */
  swatches: readonly string[];
  /** The previewed item, when the host has one. */
  item?: EditorItem;
  setToken: (tokenPath: string, value: unknown) => void;
  setCustomValue: (request: CustomValueRequest) => void;
  resetToken: (tokenPath: string) => void;
}>;

/** Set by `VideoThemeEditor` for its controls; tightly coupled to `useTokenEditorValue`. */
export const TokenEditorContext = createContext<
  TokenEditorContextValue | undefined
>(undefined);

/** The editor context. Throws outside `VideoThemeEditor`. */
export function useTokenEditor(): TokenEditorContextValue {
  const value = useContext(TokenEditorContext);
  if (!value) {
    throw new Error("Token controls need a VideoThemeEditor above them");
  }
  return value;
}
