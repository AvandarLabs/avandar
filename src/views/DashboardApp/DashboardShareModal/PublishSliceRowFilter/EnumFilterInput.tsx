import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { ReactNode } from "react";

import { TagsInput } from "@mantine/core";

type Props = {
  rowFilter: Extract<PublishSliceConfig.RowFilter, { kind: "enum" }>;
  valuesPlaceholder: string;
  onChange: (rowFilter: PublishSliceConfig.RowFilter) => void;
};

/** Operand editor for an `enum` row filter: the allowed values. */
export function EnumFilterInput({
  rowFilter,
  valuesPlaceholder,
  onChange,
}: Readonly<Props>): ReactNode {
  return (
    <TagsInput
      placeholder={valuesPlaceholder}
      value={[...rowFilter.values]}
      onChange={(values) => {
        onChange({ ...rowFilter, values });
      }}
    />
  );
}
