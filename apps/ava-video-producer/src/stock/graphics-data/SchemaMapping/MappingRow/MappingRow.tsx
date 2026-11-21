import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getMappingLayoutFromFrame } from "./getMappingLayoutFromFrame";
import { SourceMappingField } from "./SourceMappingField";
import { TargetMappingField } from "./TargetMappingField";
import type { Props } from "./MappingRow.types";
import type { ReactNode } from "react";

/** Renders MappingRow within the authored stock graphics. */
export function MappingRow({
  index,
  frame,
  accent,
  left,
  right,
  ...row
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "SchemaMapping",
    props: {},
  });
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const layout = getMappingLayoutFromFrame({
    index,
    frame,
    accent,
    left,
    tokens,
    motion,
  });
  const drawing = { index, frame, left, right, row, style, ...layout };
  return (
    <g>
      <SourceMappingField {...drawing} />
      <TargetMappingField {...drawing} />
    </g>
  );
}
