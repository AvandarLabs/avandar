import { NavLinkList } from "@avandar/ui";
import { Text } from "@mantine/core";
import { AppListPane } from "@/components/layouts/AppListPane/AppListPane";
import datasetNavCss from "@/views/DataManagerApp/DatasetNavbar/DatasetNavbar.module.css";
import { DatasetSourceIcon } from "@/views/DataManagerApp/DatasetSourceIcon";
import { NAME, SOURCE_NAMES } from "./importFixtures";

/** The data manager's dataset list rail, with only this film's fixture datasets. */
export function SourceList({ saved }: { saved: boolean }) {
  return (
    <AppListPane title="Datasets" count={SOURCE_NAMES.length}>
      <NavLinkList
        gap={6}
        inactiveHoverColor="neutral.1"
        links={SOURCE_NAMES.map((name, index) => ({
          key: name,
          to: "/$workspaceSlug/data-manager/$datasetId",
          params: {
            workspaceSlug: "avandar-labs",
            datasetId: `film-dataset-${index}`,
          },
          className: datasetNavCss.datasetNavbarLink,
          leftSection: <DatasetSourceIcon sourceType="csv_file" />,
          label: (
            <Text size="sm" component="span" truncate>
              {name}
            </Text>
          ),
          active: saved && name === NAME,
        }))}
      />
    </AppListPane>
  );
}
