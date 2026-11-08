import { DateColumnSelect } from "./DateColumnSelect";
import { PeriodSelect } from "./PeriodSelect";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import type { MantineSize } from "@mantine/core";
import type { ReactNode } from "react";

/** A field's period and date column, as the controls report them. */
export type PeriodChoice = {
  bucketGrain: ConceptAttribute.BucketGrain;
  bucketColumnId: string | undefined;
};

type Props = {
  /** The field's name, which names both pickers for assistive technology. */
  fieldName: string;
  bucketGrain: ConceptAttribute.BucketGrain;
  bucketColumnId: string | undefined;
  /** The date and timestamp columns of the field's dataset. */
  dateColumnOptions: readonly DateColumnOption[];
  onChange: (choice: PeriodChoice) => void;
  size?: MantineSize;
  /** Shows each picker's label above it, as a form does. */
  withLabels?: boolean;
};

/**
 * Picks a per-period field's period and the date column that places each row
 * in one. Use it wherever such a field is designed, for example the chat
 * draft card or the case type form, beside `ValueShapeControl`.
 */
export function PeriodControls({
  fieldName,
  bucketGrain,
  bucketColumnId,
  dateColumnOptions,
  onChange,
  size = "sm",
  withLabels = false,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <PeriodSelect
        fieldName={fieldName}
        value={bucketGrain}
        size={size}
        withLabel={withLabels}
        onChange={(pickedGrain) => {
          onChange({ bucketGrain: pickedGrain, bucketColumnId });
        }}
      />
      <DateColumnSelect
        fieldName={fieldName}
        value={bucketColumnId}
        options={dateColumnOptions}
        size={size}
        withLabel={withLabels}
        onChange={(pickedColumnId) => {
          onChange({ bucketGrain, bucketColumnId: pickedColumnId });
        }}
      />
    </>
  );
}
