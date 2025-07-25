import { Container, Stack, Title } from "@mantine/core";
import { Paper } from "@/lib/ui/Paper";
import { Tabs } from "@/lib/ui/Tabs";
import { GoogleSheetsImportView } from "./GoogleSheetsImportView";
import { ManualUploadView } from "./ManualUploadView";

export function DataImportView(): JSX.Element {
  return (
    <Container pt="xxl">
      <Paper>
        <Stack>
          <Title order={2}>Import your data</Title>
          <Tabs
            tabIds={["upload-view", "connectors-view"] as const}
            renderTabHeader={{
              "upload-view": "Upload",
              "connectors-view": "Connectors",
            }}
            renderTabPanel={{
              "upload-view": () => {
                return <ManualUploadView py="md" />;
              },
              "connectors-view": () => {
                return <GoogleSheetsImportView py="md" />;
              },
            }}
          />
        </Stack>
      </Paper>
    </Container>
  );
}
