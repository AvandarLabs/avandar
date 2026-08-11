import { Select, SelectData } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { VizConfigs, VizTypes } from "$/models/vizs/VizConfig/VizConfigs";
import type { VizType } from "$/models/vizs/VizConfig/VizConfig.types";
import type { ReactNode } from "react";

type Props = {
  /** Currently selected visualization type. */
  value: VizType;

  /** Called when the user picks a different visualization type. */
  onChange: (vizType: VizType) => void;

  /** Mantine input size. Defaults to the theme default. */
  size?: string;

  /** Renders the label above the input. Off in compact hosts like a toolbar. */
  withLabel?: boolean;

  className?: string;
};

/**
 * Visualization type picker. Split out from the settings subforms because the
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
  const vizTypeOptions: SelectData<VizType> = VizTypes.map((vizType) => {
    return {
      label: VizConfigs.getDisplayName(vizType),
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
