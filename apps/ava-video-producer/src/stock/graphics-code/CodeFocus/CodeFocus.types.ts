import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { CodeFocusInput } from "../../presets/CodeFocus/CodeFocus.schema";
import type { useHighlightLine } from "./useHighlightLine";

/** Rendering data shared within CodeFocus. */
export type Props = GraphicProps & {
  input: CodeFocusInput;
};
/** Rendering data shared within CodeFocus. */
export type FocusedCodeWindowData = {
  input: Props["input"];
  accent: Props["accent"];
  line: ReturnType<typeof useHighlightLine>;
};
