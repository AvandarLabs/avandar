import type { GeneralAccessValue } from "../GeneralAccessModule/GeneralAccessModule";
import type { ComboboxData } from "@mantine/core";
import type { ReactNode } from "react";

import { Tooltip } from "@avandar/ui";
import { Select } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";

import { GeneralAccessModule } from "../GeneralAccessModule/GeneralAccessModule";

type Props = {
  value: GeneralAccessValue;
  isBusy: boolean;
  generalOptions: ComboboxData;
  tooltip: string;
  ariaLabel: string;
  describedById: string | undefined;
  onChange: (nextValue: GeneralAccessValue) => void;
};

/** The General access dropdown itself, wrapped in its explanatory tooltip. */
export function GeneralAccessSelect({
  value,
  isBusy,
  generalOptions,
  tooltip,
  ariaLabel,
  describedById,
  onChange,
}: Readonly<Props>): ReactNode {
  return (
    <Tooltip label={tooltip} multiline w={320}>
      <Select
        flex={1}
        disabled={isBusy}
        leftSection={<IconBuilding size={16} aria-hidden />}
        data={generalOptions}
        value={value}
        allowDeselect={false}
        onChange={(nextValue) => {
          if (nextValue && GeneralAccessModule.isValidAccessValue(nextValue)) {
            onChange(nextValue);
          }
        }}
        aria-label={ariaLabel}
        aria-describedby={describedById}
      />
    </Tooltip>
  );
}
