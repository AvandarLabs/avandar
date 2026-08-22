import { Radio, Stack } from "@mantine/core";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { ReactNode } from "react";

type Props = {
  mode: PublishSliceConfig.T["mode"];
  descriptions: Record<PublishSliceConfig.T["mode"], string>;
  labels: Record<PublishSliceConfig.T["mode"], string>;
  onModeChange: (mode: string) => void;
};

/** The three publication modes, narrowest first. */
export function SliceModeOptions({
  mode,
  descriptions,
  labels,
  onModeChange,
}: Readonly<Props>): ReactNode {
  return (
    <Radio.Group value={mode} onChange={onModeChange}>
      <Stack gap={6}>
        <Radio
          value="queried"
          label={labels.queried}
          description={descriptions.queried}
        />
        <Radio
          value="custom"
          label={labels.custom}
          description={descriptions.custom}
        />
        <Radio
          value="all_columns"
          label={labels.all_columns}
          description={descriptions.all_columns}
        />
      </Stack>
    </Radio.Group>
  );
}
