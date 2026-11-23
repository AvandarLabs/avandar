import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { INSTALLATION_CATEGORIES } from "../installationColors";
import type { Input } from "../StreetShadeInstallation.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; index: number; frame: number };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  index: Options["index"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  item: {
    id: string;
    label: string;
    zoneId: string;
    kind: "awning" | "tree-canopy";
    addedShadeM2: number;
  };
  x: number;
  y: number;
  width: number;
  color: string;
  isInstalled: boolean;
};

/**
 * Returns installation placement, width, color, and installed state for
 * `ShadeFootprint`.
 */
export function useShadeFootprintPresentation({
  input,
  index,
  frame,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const item = input.installations[index];
  const zoneIndex = input.zones.findIndex(propEq("id", item.zoneId));
  const zone = input.zones[zoneIndex];
  const preceding = input.installations
    .slice(0, index)
    .filter(propEq("zoneId", item.zoneId))
    .reduce((sum, prior) => {
      return sum + prior.addedShadeM2;
    }, 0);
  const x = 285 + ((zone.existingShadeM2 + preceding) / zone.areaM2) * 600;
  const y = 165 + zoneIndex * 65;
  const width =
    (item.addedShadeM2 / zone.areaM2) *
    600 *
    motion.ramp(
      frame,
      36 + index * motion.scaleStagger(4),
      motion.scale(60),
      motion.travel.easing,
    );
  const color = tokens.color.categorical[INSTALLATION_CATEGORIES[index]];
  const isInstalled = input.decision.stage === "installed";
  return {
    index,
    atomic,
    tokens,
    scales,
    item,
    x,
    y,
    width,
    color,
    isInstalled,
  };
}
