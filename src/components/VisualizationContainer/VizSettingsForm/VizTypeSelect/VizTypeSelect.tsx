import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { SelectData } from "@avandar/ui";
import type { ReactNode } from "react";

import { Select } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";

import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { VizTypes } from "$/models/vizs/VizConfig/VizConfigs";

type Props = {
  /** Currently selected visualization type. */
  value: VizConfig.Type;

  /** Called when the user picks a different visualization type. */
  onChange: (vizType: VizConfig.Type) => void;

  /** Mantine input size. Defaults to the theme default. */
  size?: string;

  /** Renders the label above the input. Off in compact hosts like a toolbar. */
  withLabel?: boolean;

  className?: string;
};

/**
 * Visualization type picker. Lives outside the settings subforms because the
 * type choice reconfigures every other control, so hosts place it in their own
 * chrome (the Data Explorer drawer rail) rather than inside the form body.
 */
export function VizTypeSelect({
  value,
  onChange,
  size,
  withLabel = true,
  className,
}: Props): ReactNode {
  const { t } = useLingui();
  const vizTypeOptions: SelectData<VizConfig.Type> = VizTypes.map((vizType) => {
    return {
      label: vizTypeLabel(vizType),
      value: vizType,
    };
  });

  return (
    <Select
      allowDeselect={false}
      data={vizTypeOptions}
      size={size}
      className={className}
      label={withLabel ? t`Visualization Type` : undefined}
      aria-label={t`Visualization Type`}
      value={value}
      onChange={(selectedVizType) => {
        if (selectedVizType) {
          onChange(selectedVizType);
        }
      }}
    />
  );
}
