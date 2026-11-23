import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../UtteranceToModelDraft.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { frame: number; input: Input; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  relation: {
    id: string;
    label: string;
    partId: string;
    fromEntityId: string;
    toEntityId: string;
  };
  stacked: boolean;
  source: number;
  target: number;
  path: string;
};

/**
 * Returns the relation, endpoint positions, path, and theme values for
 * `DraftRelationArrowhead`, `DraftRelation`.
 */
export function useDraftRelationPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const relation = input.draft.relationships[0];
  const reversed = relation.fromEntityId === input.draft.entities[1].id;
  const stacked = input.modelLayout === "stacked";
  const source = stacked ? (reversed ? 434 : 314) : reversed ? 670 : 314;
  const target = stacked ? (reversed ? 314 : 434) : reversed ? 314 : 670;
  const path = stacked
    ? `M314 ${source} H410 V${target} H314`
    : `M${source} 285 V265 H${target} V285`;
  return {
    frame,
    input,
    accent,
    tokens,
    motion,
    scales,
    relation,
    stacked,
    source,
    target,
    path,
  };
}
