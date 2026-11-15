import {
  ActionIcon,
  EditableDisplayText,
  ObjectDescriptionList,
  Tabs,
} from "@avandar/ui";
import { Box, Button, Stack, ThemeIcon } from "@mantine/core";
import { IconDotsVertical, IconShare, IconWorld } from "@tabler/icons-react";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import datasetMetaCss from "@/views/DataManagerApp/DatasetMetaView/DatasetMetaView.module.css";
import { DatasetSourceRail } from "@/views/DataManagerApp/DatasetMetaView/DatasetSourceRail";
import {
  cases,
  columnNames,
  columns,
  dataset,
  DESCRIPTION,
  NAME,
  source,
} from "./importFixtures";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

const _noop = () => {};

/** The saved dataset's detail view: real DatasetMetaView markup over this film's fixture columns and preview rows. */
export function SavedSource() {
  return (
    <AppView>
      <AppViewHeader
        title={
          <EditableDisplayText
            name="dataset name"
            value={NAME}
            onChange={_noop}
            onSave={_noop}
            onCancel={_noop}
            isSaving={false}
            isSaveDisabled={false}
            minRows={1}
            maxRows={2}
            emptyDisplayText="Untitled dataset"
            displayTextProps={{ fz: "inherit", fw: "inherit", m: 0 }}
            fz="inherit"
            fw="inherit"
          />
        }
        facts={[
          "CSV file",
          "240 rows",
          `${columns.length} columns`,
          "Updated Oct 14, 2026",
        ]}
        actions={
          <>
            {/* Inactive actions retain the source header markup. Their service
            controllers are not needed to demonstrate the completed import. */}
            <ActionIcon
              tooltip="This dataset is synced online. Click to make offline-only."
              variant="default"
              color="neutral"
              aria-label="Make offline-only"
            >
              <ThemeIcon variant="transparent" c="blue">
                <IconWorld size={20} />
              </ThemeIcon>
            </ActionIcon>
            <Button variant="default" leftSection={<IconShare size={16} />}>
              Share
            </Button>
            <ActionIcon
              variant="default"
              color="neutral"
              tooltip="More dataset actions"
              aria-label="More dataset actions"
            >
              <IconDotsVertical size={16} />
            </ActionIcon>
          </>
        }
      />
      <AppViewBody
        rail={<DatasetSourceRail dataset={dataset} source={source} />}
      >
        <Tabs
          tabIds={["dataset-metadata", "dataset-summary"]}
          value="dataset-metadata"
          classNames={{ list: datasetMetaCss.datasetMetaViewTabList }}
          renderTabHeader={{
            "dataset-metadata": "Metadata",
            "dataset-summary": "Data Summary",
          }}
          renderTabPanel={{
            "dataset-metadata": () => (
              <Stack gap="xl">
                <Box maw="72ch">
                  <EditableDisplayText
                    name="description"
                    value={DESCRIPTION}
                    textarea
                    onChange={_noop}
                    onSave={_noop}
                    onCancel={_noop}
                    isSaving={false}
                    emptyDisplayText="No description yet. Add one so teammates know what this dataset covers."
                  />
                </Box>
                <AppViewSection title="Columns" meta={columns.length}>
                  <ObjectDescriptionList
                    data={columns}
                    renderAsTable
                    editable
                    maxHeight={420}
                    renderTableHeader={(key: string) =>
                      ({
                        name: "Name",
                        dataType: "Type",
                        description: "Description",
                      })[key]
                    }
                    itemRenderOptions={{
                      includeKeys: ["name", "dataType", "description"],
                      keyRenderOptions: {
                        description: { renderAsType: "text" },
                        dataType: {
                          renderValue: (value: string) =>
                            avaDataTypeLabel(value as AvaDataType.T),
                        },
                      },
                    }}
                    onSubmitChange={async () => {}}
                  />
                </AppViewSection>
                <AppViewSection title="Data preview" meta="First 200 rows">
                  <DataGrid
                    columnNames={columnNames}
                    data={cases.slice(0, 200)}
                    dateFormat="YYYY-MM-DD"
                  />
                </AppViewSection>
              </Stack>
            ),
            "dataset-summary": () => null,
          }}
        />
      </AppViewBody>
    </AppView>
  );
}
