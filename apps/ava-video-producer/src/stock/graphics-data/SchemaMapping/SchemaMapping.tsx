import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MappingRow } from "./MappingRow/MappingRow";
import { CAPTION_Y, PANEL_WIDTH } from "./SchemaMapping.constants";
import { SchemaPanel } from "./SchemaPanel";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { SchemaMappingInput } from "../../presets/SchemaMapping/SchemaMapping.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: SchemaMappingInput };
/** Draws the bounded authored schema-mapping study at an explicit frame. */
export function SchemaMapping({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { layout } = GraphicThemeHooks.useGraphicTokens();
  const left = layout.graphic.margin;
  const right = GRAPHIC_WIDTH - layout.graphic.margin - PANEL_WIDTH;
  const copy = LEGACY_DISPLAY_COPY["schema-mapping"];
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({ descriptor: copy.schemaMapping })}
      </Eyebrow>
      <SchemaPanel x={left} title={input.sourceLabel} frame={frame} index={0} />
      <SchemaPanel
        x={right}
        title={input.targetLabel}
        frame={frame}
        index={1}
      />
      {input.mappings.map((mapping, i) => {
        return (
          <MappingRow
            key={mapping.source}
            label={mapping.source}
            target={mapping.target}
            type={mapping.type}
            index={i}
            frame={frame}
            accent={accent}
            left={left}
            right={right}
            showChecks={input.showChecks}
          />
        );
      })}
      <Text role="note" x={GRAPHIC_WIDTH / 2} y={CAPTION_Y} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor: copy.differentNamesExplicitConnections,
        })}
      </Text>
    </g>
  );
}
