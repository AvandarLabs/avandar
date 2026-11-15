import { Tabs } from "@avandar/ui";
import { Box, Stack, Text } from "@mantine/core";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { FileDropzone } from "@/views/DataManagerApp/DataImportView/ManualUploadView/FileDropzone/FileDropzone";
import { ramp } from "../../src/motion";
import { ImportReview } from "./ImportReview";
import css from "./ImportScreen.module.css";
import { SavedSource } from "./SavedSource";
import { SourceList } from "./SourceList";

const _noop = () => {};

ModuleRegistry.registerModules([AllCommunityModule]);

export const IMPORT_DURATION = 660;
export const IMPORT_BEATS = [
  { frame: 45, target: "import-upload", action: "click" },
  { frame: 124, target: "import-name", action: "click" },
  { frame: 205, target: "import-description", action: "click" },
  { frame: 420, target: "import-save", action: "click" },
] as const;

/**
 * Frame-controlled assembly of Avandar's real import presentation components.
 * Parent arrangement follows DataImportView, ManualUploadView,
 * DatasetImportForm, and DatasetMetaView. No application clients are mounted.
 */
export function ImportScreen({
  frame,
  width,
  height,
}: {
  frame: number;
  width: number;
  height: number;
}) {
  const saved = frame >= 456;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        position: "relative",
        background: "var(--ava-surface-raised)",
      }}
    >
      <SourceList saved={saved} />
      <div className={css.importBody}>
        {frame < 474 ? (
          <AppView>
            <AppViewHeader
              title="Import data"
              description="Upload a file, connect an external source, or browse the open data catalog."
            />
            <AppViewBody>
              <Tabs
                tabIds={["upload-view", "connectors-view", "open-data-catalog"]}
                value="upload-view"
                renderTabHeader={{
                  "upload-view": "Upload",
                  "connectors-view": "Connectors",
                  "open-data-catalog": "Open data",
                }}
                renderTabPanel={{
                  "upload-view": () => (
                    <Box pt="lg">
                      {frame < 68 ? (
                        <Stack gap="xs">
                          <div
                            data-video-target="import-upload"
                            style={{ opacity: 1 - ramp(frame, 52, 16) }}
                          >
                            <FileDropzone isLoading={false} onSelect={_noop} />
                          </div>
                          <Text size="xs" c="dimmed">
                            Avandar reads the file in your browser. Nothing
                            leaves this device until you save the dataset.
                          </Text>
                        </Stack>
                      ) : (
                        <ImportReview frame={Math.min(frame, 455)} />
                      )}
                    </Box>
                  ),
                  "connectors-view": () => null,
                  "open-data-catalog": () => null,
                }}
              />
            </AppViewBody>
          </AppView>
        ) : null}
        {saved ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: "var(--ava-surface-raised)",
              opacity: ramp(frame, 456, 18),
            }}
          >
            <SavedSource />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { ImportScreen as Screen };
