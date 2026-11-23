import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { useBucketGrainLabels } from "@/components/caseFields/useBucketGrainLabels/useBucketGrainLabels";
import type { MantineSize } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  /** The field's name, which names the picker for assistive technology. */
  fieldName: string;
  value: ConceptAttribute.BucketGrain;
  onChange: (bucketGrain: ConceptAttribute.BucketGrain) => void;
  size: MantineSize;
  /** Shows the picker's label above it, as a form does. */
  withLabel: boolean;
};

/**
 * A select over every period a per-period field can keep one value for. Use
 * it beside a date column picker, for example in the chat draft card or the
 * case type form.
 */
export function PeriodSelect({
  fieldName,
  value,
  onChange,
  size,
  withLabel,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const grainLabels = useBucketGrainLabels();
  return (
    <Select
      size={size}
      label={withLabel ? t`Period` : undefined}
      aria-label={t`Period for ${fieldName}`}
      data={ConceptAttribute.BUCKET_GRAINS.map((grain) => {
        return { value: grain, label: grainLabels[grain].perPeriod };
      })}
      value={value}
      allowDeselect={false}
      onChange={(pickedGrain) => {
        if (pickedGrain) {
          onChange(pickedGrain as ConceptAttribute.BucketGrain);
        }
      }}
    />
  );
}
