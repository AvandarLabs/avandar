import { useT } from "@avandar/plugin-sdk";
import { Group, NumberInput, SegmentedControl } from "@avandar/plugin-ui";
import type { RollingWindowInput } from "./RollingAverageModal.types";
import type { ReactNode } from "react";

type Props = {
  value: RollingWindowInput;
  onChange: (value: RollingWindowInput) => void;
};

/**
 * The rolling window's size and its unit, days or weeks.
 * `RollingAverageForm` owns the values.
 */
export function WindowFields({ value, onChange }: Readonly<Props>): ReactNode {
  const t = useT();
  return (
    <Group align="flex-end" grow>
      <NumberInput
        label={t("rollingAverage.window")}
        min={1}
        allowDecimal={false}
        allowNegative={false}
        value={value.size}
        onChange={(size) => {
          onChange({ ...value, size });
        }}
      />
      <SegmentedControl
        aria-label={t("rollingAverage.windowUnit")}
        value={value.unit}
        data={[
          { value: "day", label: t("rollingAverage.windowUnit.day") },
          { value: "week", label: t("rollingAverage.windowUnit.week") },
        ]}
        onChange={(unit) => {
          onChange({ ...value, unit: unit === "week" ? "week" : "day" });
        }}
      />
    </Group>
  );
}
