import { EditableDisplayText } from "@avandar/ui";
import { Box, Stack } from "@mantine/core";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { cases, columnNames, DESCRIPTION } from "../importFixtures";
import { SavedSourceColumns } from "./SavedSourceColumns";
import type { ReactNode } from "react";

const _noop = () => {};
/** Display the saved source description, schema and preview rows. */
export function SavedSourceMetadata(): ReactNode {
  return (
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
      <SavedSourceColumns />
      <AppViewSection title="Data preview" meta="First 200 rows">
        <DataGrid
          columnNames={columnNames}
          data={cases.slice(0, 200)}
          dateFormat="YYYY-MM-DD"
        />
      </AppViewSection>
    </Stack>
  );
}
