import { prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Radio, Stack } from "@mantine/core";
import { CustomSliceEditor } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/CustomSliceEditor";
import { QueriedSlicePreview } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/QueriedSlicePreview";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { PublishSliceDataset } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishSliceSection.types";
import type { ReactNode } from "react";

type Props = {
  dataset: PublishSliceDataset;
  slice: PublishSliceConfig.T;
  onChange: (slice: PublishSliceConfig.T) => void;
};

/** Selects and configures a dataset's publication mode. */
export function SliceModeEditor({
  dataset,
  slice,
  onChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const descriptions: Record<PublishSliceConfig.T["mode"], string> = {
    queried: t`Publish only the columns your dashboard reads. Narrowest, most private.`,
    all_columns: t`Publish every column, all rows. Maximum flexibility for viewers, maximum exposure.`,
    custom: t`Pick columns and add row constraints (enum, number range, date range).`,
  };
  return (
    <Stack gap="md">
      <Radio.Group
        value={slice.mode}
        onChange={(mode) => {
          if (mode === "queried") {
            onChange({ mode: "queried" });
          } else if (mode === "all_columns") {
            onChange({ mode: "all_columns" });
          } else {
            onChange({
              mode: "custom",
              columns:
                slice.mode === "custom" ? slice.columns
                : dataset.queriedColumns.length > 0 ? dataset.queriedColumns
                : dataset.columns.map(prop("name")),
              rowFilters: slice.mode === "custom" ? slice.rowFilters : [],
            });
          }
        }}
      >
        <Stack gap={6}>
          <Radio
            value="queried"
            label={t`Only what's queried (recommended)`}
            description={descriptions.queried}
          />
          <Radio
            value="custom"
            label={t`Custom selection`}
            description={descriptions.custom}
          />
          <Radio
            value="all_columns"
            label={t`Whole dataset`}
            description={descriptions.all_columns}
          />
        </Stack>
      </Radio.Group>
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
