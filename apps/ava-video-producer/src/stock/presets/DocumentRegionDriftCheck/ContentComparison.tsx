import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ComparisonTags } from "./ComparisonTags";
import {
  ordinalMessage,
  pageMessage,
} from "./DocumentRegionDriftCheck.controls";
import { ReviewLatch } from "./ReviewLatch";
import type { Input } from "./DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Exact strings determine matching independently of the detector's ordinal. */
export function ContentComparison({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const headerMatch = input.saved.header === input.current.header,
    fingerprintMatch = input.saved.fingerprint === input.current.fingerprint;
  const matched = headerMatch && fingerprintMatch;
  const ordinalCaption = `${stockI18n._(ordinalMessage)}: ${input.current.detectorOrdinal}`;
  return (
    <g
      data-header-match={headerMatch}
      data-fingerprint-match={fingerprintMatch}
      data-outcome={matched ? "matched" : "review"}
    >
      <ComparisonTags input={input} frame={frame} accent={accent} />
      <ReviewLatch
        input={input}
        frame={frame}
        accent={accent}
        matched={matched}
      />
      <LabelSlots
        labels={[
          [
            `${stockI18n._(pageMessage)}: ${input.saved.page}`,
            52,
            360,
            280,
            12,
            1,
          ],
        ]}
      />
      {input.showDetectorOrdinal ? (
        <LabelSlots labels={[[ordinalCaption, 508, 480, 400, 12, 2]]} />
      ) : undefined}
    </g>
  );
}
