import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Radio, Stack } from "@mantine/core";
import { CustomSliceEditor } from "@/views/DashboardApp/DashboardShareModal/CustomSliceEditor";
import { QueriedSlicePreview } from "@/views/DashboardApp/DashboardShareModal/QueriedSlicePreview";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { PublishSliceDataset } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection.types";
import type { ReactNode } from "react";

type Props = {
  dataset: PublishSliceDataset;
  slice: PublishSliceConfig.T;
  onChange: (slice: PublishSliceConfig.T) => void;
};

type RenderSliceModeOptions = {
  dataset: PublishSliceDataset;
  descriptions: Record<PublishSliceConfig.T["mode"], string>;
  labels: Record<PublishSliceConfig.T["mode"], string>;
  onChange: Props["onChange"];
  slice: PublishSliceConfig.T;
};

function _getSliceFromMode(
  options: Readonly<{
    dataset: PublishSliceDataset;
    mode: string;
    slice: PublishSliceConfig.T;
  }>,
): PublishSliceConfig.T {
  if (options.mode === "queried") {
    return { mode: "queried" };
  }
  if (options.mode === "all_columns") {
    return { mode: "all_columns" };
  }
  return {
    mode: "custom",
    columns:
      options.slice.mode === "custom" ? [...options.slice.columns]
      : options.dataset.queriedColumns.length > 0 ?
        [...options.dataset.queriedColumns]
      : options.dataset.columns.map(prop("name")),
    rowFilters:
      options.slice.mode === "custom" ? [...options.slice.rowFilters] : [],
  };
}

function _renderSliceModeOptions(
  options: Readonly<RenderSliceModeOptions>,
): ReactNode {
  return (
    <Radio.Group
      value={options.slice.mode}
      onChange={(mode) => {
        options.onChange(
          _getSliceFromMode({
            dataset: options.dataset,
            mode,
            slice: options.slice,
          }),
        );
      }}
    >
      <Stack gap={6}>
        <Radio
          value="queried"
          label={options.labels.queried}
          description={options.descriptions.queried}
        />
        <Radio
          value="custom"
          label={options.labels.custom}
          description={options.descriptions.custom}
        />
        <Radio
          value="all_columns"
          label={options.labels.all_columns}
          description={options.descriptions.all_columns}
        />
      </Stack>
    </Radio.Group>
  );
}

/** Selects and configures a dataset's publication mode. */
export function SliceModeEditor({
  dataset,
  slice,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const descriptions: Record<PublishSliceConfig.T["mode"], string> = {
    queried: t`Publish only the columns your dashboard reads. Narrowest, most private.`,
    all_columns: t`Publish every column, all rows. Maximum flexibility for viewers, maximum exposure.`,
    custom: t`Pick columns and add row constraints (enum, number range, date range).`,
  };
  const labels: Record<PublishSliceConfig.T["mode"], string> = {
    queried: t`Only what's queried (recommended)`,
    custom: t`Custom selection`,
    all_columns: t`Whole dataset`,
  };
  return (
    <Stack gap="md">
      {_renderSliceModeOptions({
        dataset,
        descriptions,
        labels,
        onChange,
        slice,
      })}
      {slice.mode === "queried" ?
        <QueriedSlicePreview dataset={dataset} />
      : null}
      {slice.mode === "custom" ?
        <CustomSliceEditor
          dataset={dataset}
          slice={slice}
          onChange={onChange}
        />
      : null}
    </Stack>
  );
}
