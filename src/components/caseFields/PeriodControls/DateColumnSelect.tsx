import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import type { MantineSize } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  /** The field's name, which names the picker for assistive technology. */
  fieldName: string;
  value: string | undefined;
  options: readonly DateColumnOption[];
  onChange: (bucketColumnId: string) => void;
  size: MantineSize;
  /** Shows the picker's label above it, as a form does. */
  withLabel: boolean;
};

/**
 * A select over the date columns of a dataset, for a per-period field to
 * place its rows in periods. With no date column to offer it says so under
 * the select and locks it. Use it beside a period picker, for example in the
 * chat draft card or the case type form.
 */
export function DateColumnSelect({
  fieldName,
  value,
  options,
  onChange,
  size,
  withLabel,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const hasNoOptions = options.length === 0;
  return (
    <Select
      size={size}
      label={withLabel ? t`Date column` : undefined}
      aria-label={t`Date column for ${fieldName}`}
      description={
        hasNoOptions ? t`This dataset has no date column` : undefined
      }
      inputWrapperOrder={["label", "input", "description", "error"]}
      placeholder={t`Choose a date column`}
      data={[...options]}
      value={value ?? null}
      disabled={hasNoOptions}
      allowDeselect={false}
      onChange={(pickedColumnId) => {
        if (pickedColumnId) {
          onChange(pickedColumnId);
        }
      }}
    />
  );
}
