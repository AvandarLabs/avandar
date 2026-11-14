import { Trans, useLingui } from "@lingui/react/macro";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useId } from "react";
import { FILL_KINDS } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/makeFillForKind/makeFillForKind";
import type { FillKind } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/makeFillForKind/makeFillForKind";
import type { ReactNode } from "react";

type Props = {
  /** Undefined while the column has no fill. */
  kind: FillKind | undefined;
  onChange: (kind: FillKind) => void;
};

/**
 * How this column is filled: a column, a fixed value, a Combine formula, or
 * left empty. A radio group named by its visible label; none is chosen
 * while the column has no fill.
 */
export function FillKindControl({
  kind,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const labelId = useId();
  const labels: Record<FillKind, string> = {
    column: t`A column`,
    constant: t`A fixed value`,
    expression: t`Combine`,
    empty: t`Leave empty`,
  };
  return (
    <Stack gap={6}>
      <Text id={labelId} size="xs" fw={600} c="dimmed">
        <Trans>How this column is filled</Trans>
      </Text>
      <SegmentedControl
        fullWidth
        size="xs"
        aria-labelledby={labelId}
        value={kind ?? ""}
        data={FILL_KINDS.map((value) => {
          return { value, label: labels[value] };
        })}
        onChange={(value) => {
          const chosen = FILL_KINDS.find((candidate) => {
            return candidate === value;
          });
          if (chosen) {
            onChange(chosen);
          }
        }}
      />
    </Stack>
  );
}
