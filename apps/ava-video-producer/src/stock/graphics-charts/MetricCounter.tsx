import { DUR, ramp, mix } from "../../motion";
import {
  Arrive,
  Eyebrow,
  Panel,
  Pill,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { MetricCounterInput } from "../presets/MetricCounter/MetricCounter.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: MetricCounterInput };

/** Draws the bounded authored metric-counter study at an explicit frame. */
export function MetricCounter({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const bars = input.bars;
  const t = ramp(frame, 22, 66);
  const value = Math.round(mix(t, 0, input.value));
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["metric-counter"].metricCounter,
        })}
      </Eyebrow>
      <Pill
        x={748}
        y={44}
        width={148}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["metric-counter"].fictionalData,
        })}
        color={accent}
      />
      <Panel x={126} y={135} width={708} height={356}>
        <Text x={170} y={185} size={20} fill={STOCK.muted}>
          {input.label}
        </Text>
        <Text x={165} y={301} size={103} weight={600}>
          {`${value.toLocaleString("en-US")}${input.unit}`}
        </Text>
        <g opacity={ramp(frame, 82, DUR.sheet)}>
          <Pill
            x={170}
            y={326}
            width={173}
            text={getStockDisplayCopyFromDescriptor({
              descriptor: LEGACY_DISPLAY_COPY["metric-counter"].sampleTotal,
            })}
            color={accent}
          />
        </g>
        {input.showBars
          ? bars.map((height, i) => (
              <Arrive frame={frame} at={29} index={i} key={i}>
                <rect
                  x={172 + i * 50}
                  y={437 - height * 54 * ramp(frame, 34 + i * 2, DUR.hero)}
                  width={34}
                  height={Math.max(
                    1,
                    height * 54 * ramp(frame, 34 + i * 2, DUR.hero),
                  )}
                  rx={4}
                  fill={accent}
                  fillOpacity={0.18 + i / 18}
                />
              </Arrive>
            ))
          : null}
      </Panel>
      <Text x={480} y={550} size={16} fill={STOCK.muted} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["metric-counter"]
              .aMeasuredArrivalFollowedByAReadingHold,
        })}
      </Text>
    </g>
  );
}
