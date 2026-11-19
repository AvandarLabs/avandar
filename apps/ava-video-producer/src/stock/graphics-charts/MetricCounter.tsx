import { mix } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Arrive } from "../graphics-common/Arrive";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Panel } from "../graphics-common/Panel";
import { Pill } from "../graphics-common/Pill";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { MetricCounterInput } from "../presets/MetricCounter/MetricCounter.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: MetricCounterInput };

const COUNT_AT = 22;
const COUNT_FRAMES = 66;
const PILL_AT = 82;
const BARS_AT = 29;
const BAR_GROW_AT = 34;
const FIGURE_SIZE = "103";
const BAR_ALPHA_STEPS = 18;

/** Draws the bounded authored metric-counter study at an explicit frame. */
export function MetricCounter({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const { color, corner } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const bars = input.bars;
  const t = motion.ramp(frame, COUNT_AT, motion.scale(COUNT_FRAMES));
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
        <Text x={170} y={185} fill={color.textMuted}>
          {input.label}
        </Text>
        <Text role="figure" x={165} y={301} size={FIGURE_SIZE}>
          {`${value.toLocaleString("en-US")}${input.unit}`}
        </Text>
        <g opacity={motion.ramp(frame, PILL_AT, motion.sheet)}>
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
          ? bars.map((height, i) => {
              const grow = motion.ramp(
                frame,
                BAR_GROW_AT + i * motion.stagger.list,
                motion.hero,
              );
              return (
                <Arrive frame={frame} at={BARS_AT} index={i} key={i}>
                  <rect
                    x={172 + i * 50}
                    y={437 - height * 54 * grow}
                    width={34}
                    height={Math.max(1, height * 54 * grow)}
                    rx={shapes.corner(corner.chip)}
                    fill={accent}
                    fillOpacity={atomic.opacity["18"] + i / BAR_ALPHA_STEPS}
                  />
                </Arrive>
              );
            })
          : null}
      </Panel>
      <Text role="secondary" x={480} y={550} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor:
            LEGACY_DISPLAY_COPY["metric-counter"]
              .aMeasuredArrivalFollowedByAReadingHold,
        })}
      </Text>
    </g>
  );
}
