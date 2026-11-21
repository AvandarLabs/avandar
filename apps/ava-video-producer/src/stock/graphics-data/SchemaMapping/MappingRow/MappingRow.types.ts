import type { ResolvedVideoComponents } from "../../../../videoTheme/videoTheme.types";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within MappingRow. */
export type Props = {
  label: string;
  target: string;
  type: string;
  index: number;
  frame: number;
  accent: string;
  left: number;
  right: number;
  showChecks: boolean;
};
/** Rendering data shared within MappingRow. */
export type MappingContent = Pick<
  Props,
  "label" | "target" | "type" | "showChecks"
>;
/** Rendering data shared within MappingRow. */
export type TargetMappingFieldData = {
  index: Props["index"];
  frame: Props["frame"];
  right: Props["right"];
  row: MappingContent;
  y: number;
  color:
    | ReturnType<
        typeof GraphicThemeHooks.useGraphicTokens
      >["color"]["accentAlt"]
    | Props["accent"];
  t: number;
  field: {
    y: number;
    color:
      | ReturnType<
          typeof GraphicThemeHooks.useGraphicTokens
        >["color"]["accentAlt"]
      | Props["accent"];
  };
};
/** Rendering data shared within MappingRow. */
export type SourceMappingFieldData = {
  index: Props["index"];
  frame: Props["frame"];
  left: Props["left"];
  right: Props["right"];
  row: MappingContent;
  style: ResolvedVideoComponents["SchemaMapping"];
  y: number;
  color:
    | ReturnType<
        typeof GraphicThemeHooks.useGraphicTokens
      >["color"]["accentAlt"]
    | Props["accent"];
  sourceX: number;
  cue: number;
  field: {
    y: number;
    color:
      | ReturnType<
          typeof GraphicThemeHooks.useGraphicTokens
        >["color"]["accentAlt"]
      | Props["accent"];
  };
};
/** Rendering data shared within MappingRow. */
export type GetMappingRowYStateOptions = {
  index: Props["index"];
  frame: Props["frame"];
  accent: Props["accent"];
  left: Props["left"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Rendering data shared within MappingRow. */
export type GetMappingRowYStateResult = {
  y: number;
  color:
    | ReturnType<
        typeof GraphicThemeHooks.useGraphicTokens
      >["color"]["accentAlt"]
    | Props["accent"];
  sourceX: number;
  cue: number;
  t: number;
  field: {
    y: number;
    color:
      | ReturnType<
          typeof GraphicThemeHooks.useGraphicTokens
        >["color"]["accentAlt"]
      | Props["accent"];
  };
};
