import { StockRect } from "../primitives/StockRect/StockRect";
import { prop } from "@avandar/utils";
import { DUR, ramp } from "../../motion";
import {
  Arrive,
  Check,
  Curve,
  DrawPath,
  Eyebrow,
  Panel,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { SchemaMappingInput } from "../presets/SchemaMapping/SchemaMapping.schema";

type Props = GraphicProps & { input: SchemaMappingInput };

/** Draws the bounded authored schema-mapping study at an explicit frame. */
export function SchemaMapping({
  input,
  frame,
  accent,
  background = STOCK.ground,
}: Readonly<Props>) {
  const sources = input.mappings.map(prop("source"));
  const targets = input.mappings.map(prop("target"));
  const types = input.mappings.map(prop("type"));
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["schema-mapping"].schemaMapping,
        })}
      </Eyebrow>
      <Arrive frame={frame}>
        <Panel x={64} y={133} width={298} height={373}>
          <Text x={90} y={177} size={23} weight={600}>
            {input.sourceLabel}
          </Text>
          <line x1={64} y1={202} x2={362} y2={202} stroke={STOCK.line} />
        </Panel>
      </Arrive>
      <Arrive frame={frame} index={1}>
        <Panel x={598} y={133} width={298} height={373}>
          <Text x={624} y={177} size={23} weight={600}>
            {input.targetLabel}
          </Text>
          <line x1={598} y1={202} x2={896} y2={202} stroke={STOCK.line} />
        </Panel>
      </Arrive>
      {sources.map((label, i) => {
        const y = 242 + i * 68;
        const color = i % 2 ? STOCK.cyan : accent;
        const from = { x: 362, y };
        const to = { x: 598, y };
        const t = ramp(frame, 26 + i * 13, DUR.hero);
        return (
          <g key={label}>
            <Arrive frame={frame} at={18} index={i}>
              <StockRect
                x={82}
                y={y - 22}
                width={262}
                height={46}
                rx={8}
                fill={STOCK.elevated}
              />
              <Text x={96} y={y + 6} size={17} mono>
                {label}
              </Text>
              <circle cx={362} cy={y} r={5} fill={color} />
            </Arrive>
            <DrawPath
              d={Curve({ from, to })}
              frame={frame}
              at={26 + i * 13}
              duration={DUR.hero}
              color={color}
              opacity={0.7}
            />
            <g opacity={t}>
              <circle
                cx={480}
                cy={y}
                r={13}
                fill={background}
                stroke={color}
                strokeOpacity={0.6}
              />
              {input.showChecks ? (
                <Check x={480} y={y} color={color} size={10} />
              ) : null}
            </g>
            <Arrive frame={frame} at={22} index={i}>
              <StockRect
                x={616}
                y={y - 22}
                width={262}
                height={46}
                rx={8}
                fill={STOCK.elevated}
              />
              <circle cx={598} cy={y} r={5} fill={color} />
              <Text x={630} y={y + 6} size={17} mono>
                {targets[i]}
              </Text>
              <Text
                x={862}
                y={y + 5}
                size={12}
                fill={STOCK.muted}
                anchor="end"
                mono
              >
                {types[i]}
              </Text>
            </Arrive>
          </g>
        );
      })}
      <Text x={480} y={553} size={15} anchor="middle" fill={STOCK.muted}>
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["schema-mapping"]
              .differentNamesExplicitConnections,
        })}
      </Text>
    </g>
  );
}
