import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SubscriptionFrame } from "../SubscriptionFrame/SubscriptionFrame";
import { SubscriptionRecord } from "../SubscriptionRecord";
import type { Input } from "../FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type ParentProps = {
  view: Input["views"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

type GetSubscriptionTotalsLabelsOptions = {
  options: Readonly<RenderSubscriptionRecordsOptions>;
};

type RenderSubscriptionRecordsOptions = {
  view: Readonly<ParentProps>["view"];
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  x: number;
  width: number;
  rows: Readonly<ParentProps>["input"]["records"];
  sum: number;
};

type Props = {
  view: Readonly<ParentProps>["view"];
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  x: number;
  width: number;
  rows: Readonly<ParentProps>["input"]["records"];
  sum: number;
};

/** Samples the subscription totals labels for the current authored frame. */
function _getSubscriptionTotalsLabels(
  options: Readonly<Readonly<GetSubscriptionTotalsLabelsOptions>["options"]>,
): NonNullable<Parameters<typeof LabelSlots>[0]["labels"]> {
  return [
    [
      `${options.sum} ${options.input.metric.valueUnit}`,
      options.x + 12,
      506,
      options.width - 24,
      12,
      3,
    ],
    [
      `${options.rows.length} ${options.input.metric.countUnit}`,
      options.x + 12,
      560,
      options.width - 24,
      12,
      3,
    ],
  ];
}

/** Renders the subscription records in authored paint order. */
export function SubscriptionRecords(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SubscriptionFrame
        {...{
          view: options.view,
          x: options.x,
          width: options.width,
          accent: options.accent,
        }}
      />
      {options.input.records.map((record, rowIndex) => {
        return (
          <SubscriptionRecord
            key={record.id}
            {...{
              record,
              rowIndex,
              x: options.x,
              width: options.width,
              view: options.view,
              input: options.input,
              frame: options.frame,
              accent: options.accent,
            }}
          />
        );
      })}
      <LabelSlots labels={_getSubscriptionTotalsLabels(options)} />
    </>
  );
}
