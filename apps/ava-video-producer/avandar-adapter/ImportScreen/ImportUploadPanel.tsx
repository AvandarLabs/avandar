import { Box, Stack, Text } from "@mantine/core";
import { FileDropzone } from "@/views/DataManagerApp/DataImportView/ManualUploadView/FileDropzone/FileDropzone";
import { Motion } from "../../src/motion";
import { ImportReview } from "./ImportReview/ImportReview";
import type { ReactNode } from "react";

type Props = { frame: number };
const _noop = () => {};
/**
 * Advance the native upload panel from dropzone to the controlled review form.
 */
export function ImportUploadPanel({ frame }: Readonly<Props>): ReactNode {
  return (
    <Box pt="lg">
      {frame < 68 ? (
        <Stack gap="xs">
          <div
            data-video-target="import-upload"
            style={{
              opacity:
                1 -
                Motion.ramp({
                  frame,
                  at: 52,
                  dur: 16,
                }),
            }}
          >
            <FileDropzone isLoading={false} onSelect={_noop} />
          </div>
          <Text size="xs" c="dimmed">
            Avandar reads the file in your browser. Nothing leaves this device
            until you save the dataset.
          </Text>
        </Stack>
      ) : (
        <ImportReview frame={Math.min(frame, 455)} />
      )}
    </Box>
  );
}
