import { Trans } from "@lingui/react/macro";
import { Menu } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { match } from "ts-pattern";
import { getDatasetRefreshFromSourceType } from "@/views/DataManagerApp/DatasetMetaView/getDatasetRefreshFromSourceType/getDatasetRefreshFromSourceType";
import { useRefreshGoogleSheetDataset } from "@/views/DataManagerApp/DatasetMetaView/useRefreshGoogleSheetDataset";
import { useRefreshPostgresTableDataset } from "@/views/DataManagerApp/DatasetMetaView/useRefreshPostgresTableDataset/useRefreshPostgresTableDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
};

/**
 * The menu item that re-reads a live source's dataset on demand, or nothing
 * for a dataset whose rows do not change under it. A live source's cached
 * rows only go stale after a few minutes, so this is the escape hatch for a
 * user who has just edited the source and does not want to wait.
 */
export function DatasetRefreshMenuItem({
  dataset,
}: Readonly<Props>): ReactNode {
  const [refreshGoogleSheetDataset, isGoogleSheetRefreshPending] =
    useRefreshGoogleSheetDataset();
  const [refreshPostgresTableDataset, isPostgresRefreshPending] =
    useRefreshPostgresTableDataset();

  return match(getDatasetRefreshFromSourceType(dataset.sourceType))
    .with("google_sheets", () => {
      return (
        <Menu.Item
          leftSection={<IconRefresh size={16} />}
          disabled={isGoogleSheetRefreshPending}
          onClick={() => {
            refreshGoogleSheetDataset({ datasetId: dataset.id });
          }}
        >
          <Trans>Refresh from Google Sheets</Trans>
        </Menu.Item>
      );
    })
    .with("postgres_table", () => {
      return (
        <Menu.Item
          leftSection={<IconRefresh size={16} />}
          disabled={isPostgresRefreshPending}
          onClick={() => {
            refreshPostgresTableDataset({ datasetId: dataset.id });
          }}
        >
          <Trans>Refresh from the database</Trans>
        </Menu.Item>
      );
    })
    .with(undefined, () => {
      return null;
    })
    .exhaustive();
}
