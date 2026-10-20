import { StockRect } from "../primitives/StockRect/StockRect";
import { EASE, ramp } from "../../motion";
import {
  Arrive,
  Check,
  Eyebrow,
  Packet,
  Panel,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { DataPipelineInput } from "../presets/DataPipeline/DataPipeline.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: DataPipelineInput };

/** Draws the bounded authored data-pipeline study at an explicit frame. */
export function DataPipeline({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const stages = input.stages.map((stage, index) => ({
    ...stage,
    x: 64 + index * 220,
  }));
  const progress = ramp(frame, 30, 92, EASE.inOut) * stages.length;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].dataPipeline,
        })}
      </Eyebrow>
      <Text x={64} y={115} size={32} weight={600}>
        {input.heading}
      </Text>
      {stages.slice(0, -1).map((stage, i) => (
        <g key={stage.label}>
          <path
            d={`M${stage.x + 172} 303 H${stage.x + 220}`}
            stroke={STOCK.line}
            strokeWidth={2}
          />
          <Packet
            frame={frame}
            from={{ x: stage.x + 172, y: 303 }}
            to={{ x: stage.x + 220, y: 303 }}
            period={64}
            delay={i * 17}
            color={accent}
          />
        </g>
      ))}
      {stages.map((stage, i) => {
        const active = Math.min(1, Math.max(0, progress - i));
        return (
          <Arrive frame={frame} index={i} at={16} key={stage.label}>
            <Panel x={stage.x} y={206} width={172} height={205}>
              <StockRect
                x={stage.x}
                y={206}
                width={172}
                height={205}
                rx={18}
                fill={accent}
                fillOpacity={active * 0.04}
                stroke={accent}
                strokeOpacity={active * 0.6}
              />
              <Text x={stage.x + 22} y={239} mono size={13} fill={STOCK.muted}>
                0{i + 1}
              </Text>
              <circle
                cx={stage.x + 86}
                cy={284}
                r={25}
                fill={accent}
                fillOpacity={0.08}
                stroke={accent}
                strokeOpacity={0.35}
              />
              <g opacity={active}>
                <Check x={stage.x + 86} y={284} color={accent} size={19} />
              </g>
              <g opacity={1 - active}>
                <circle cx={stage.x + 86} cy={284} r={5} fill={accent} />
              </g>
              <Text
                x={stage.x + 86}
                y={341}
                size={22}
                weight={600}
                anchor="middle"
              >
                {stage.label}
              </Text>
              <Text
                x={stage.x + 86}
                y={371}
                size={15}
                fill={STOCK.muted}
                anchor="middle"
              >
                {stage.detail}
              </Text>
            </Panel>
          </Arrive>
        );
      })}
      {input.showProgress ? (
        <>
          <StockRect
            x={64}
            y={464}
            width={832}
            height={3}
            rx={1.5}
            fill={STOCK.line}
          />
          <StockRect
            x={64}
            y={464}
            width={832 * Math.min(1, progress / stages.length)}
            height={3}
            rx={1.5}
            fill={accent}
          />
        </>
      ) : null}
      <Text x={64} y={506} size={15} fill={STOCK.muted} mono>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].input,
        })}
      </Text>
      <Text x={896} y={506} size={15} fill={accent} mono anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].output,
        })}
      </Text>
    </g>
  );
}
