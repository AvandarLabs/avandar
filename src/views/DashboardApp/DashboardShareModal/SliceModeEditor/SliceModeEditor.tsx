import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { PublishSliceDataset } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection/PublishSliceSection.types";
import type { ReactNode } from "react";

import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";

import { CustomSliceEditor } from "@/views/DashboardApp/DashboardShareModal/CustomSliceEditor/CustomSliceEditor";
import { QueriedSlicePreview } from "@/views/DashboardApp/DashboardShareModal/QueriedSlicePreview";
import { SliceModeOptions } from "@/views/DashboardApp/DashboardShareModal/SliceModeEditor/SliceModeOptions";

type Props = {
  dataset: PublishSliceDataset;
  slice: PublishSliceConfig.T;
  onChange: (slice: PublishSliceConfig.T) => void;
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
      options.slice.mode === "custom"
        ? [...options.slice.columns]
        : options.dataset.queriedColumns.length > 0
          ? [...options.dataset.queriedColumns]
          : options.dataset.columns.map(prop("name")),
    rowFilters:
      options.slice.mode === "custom" ? [...options.slice.rowFilters] : [],
  };
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
      <SliceModeOptions
        mode={slice.mode}
        descriptions={descriptions}
        labels={labels}
        onModeChange={(mode) => {
          onChange(_getSliceFromMode({ dataset, mode, slice }));
        }}
      />
      {slice.mode === "queried" ? (
        <QueriedSlicePreview dataset={dataset} />
      ) : null}
      {slice.mode === "custom" ? (
        <CustomSliceEditor
          dataset={dataset}
          slice={slice}
          onChange={onChange}
        />
      ) : null}
    </Stack>
  );
}
