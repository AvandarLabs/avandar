import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SharedJigPreparation.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  collaborator: Input["collaborators"][number];
  x: number;
  hasApplication: boolean;
  isAligned: boolean;
  input: Input;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  collaborator: Options["collaborator"];
  x: Options["x"];
  hasApplication: Options["hasApplication"];
  isAligned: Options["isAligned"];
  input: Options["input"];
  accent: Options["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns collaborator, workpiece alignment, and theme values for
 * `JigWorkpiece`, `JigStation`.
 */
export function useJigStationPresentation({
  collaborator,
  x,
  hasApplication,
  isAligned,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return {
    collaborator,
    x,
    hasApplication,
    isAligned,
    input,
    accent,
    atomic,
    tokens,
    scales,
  };
}
