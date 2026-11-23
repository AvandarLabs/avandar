import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../StatePreservingSourceRefresh.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  record: Input["records"][number];
  index: number;
  frame: number;
  accent: string;
};

type Props = {
  record: Readonly<ParentProps>["record"];
  frame: Readonly<ParentProps>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  source: Readonly<ParentProps>["input"]["sourceRows"][number] | undefined;
  y: number;
  refresh: number;
  isChanged: boolean;
};

/** Renders the refreshed source label in authored paint order. */
export function RefreshedSourceLabel(options: Readonly<Props>): ReactNode {
  return (
    <>
      <LiteralDataText value={options.record.id} x={65} y={options.y + 28} />
      <g
        opacity={options.source && options.isChanged ? 1 - options.refresh : 1}
      >
        <LabelSlots
          labels={[[options.record.label, 220, options.y + 22, 350, 12, 1]]}
        />
      </g>
      {options.source && options.isChanged && options.frame >= 51 ? (
        <g opacity={options.motion.reveal(options.frame, 51)}>
          <LabelSlots
            labels={[
              [
                options.source.label,
                220,
                Motion.mix({
                  t: options.refresh,
                  from: options.y + 61,
                  to: options.y + 22,
                }),
                350,
                12,
                1,
              ],
            ]}
          />
        </g>
      ) : null}
    </>
  );
}
