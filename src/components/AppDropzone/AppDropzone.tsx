import type { ReactNode } from "react";

import { MIMEType } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconFileSpreadsheet, IconUpload, IconX } from "@tabler/icons-react";

import classes from "./AppDropzone.module.css";
import { onAppDropzoneDrop } from "./onAppDropzoneDrop";

const ACCEPTED_MIME_TYPES = [
  MIMEType.TEXT_CSV,
  MIMEType.APPLICATION_MS_EXCEL,
  MIMEType.APPLICATION_OPENXML_EXCEL,
  MIMEType.APPLICATION_PDF,
];

const ICON_SIZE = 96;

type Props = { children: ReactNode };

/**
 * Wraps the workspace app shell with a full-screen drop target so the
 * user can drop a CSV or Excel file from anywhere in the app. On drop,
 * a confirm dialog appears and then a large modal containing the
 * dataset import flow.
 *
 * The overlay dims and blurs the page behind it just enough to read it
 * as an overlay, and the centered card pops in with a smooth scale +
 * un-blur transition every time a drag enters the window.
 */
export function AppDropzone({ children }: Props): JSX.Element {
  return (
    <>
      {children}
      <Dropzone.FullScreen
        accept={ACCEPTED_MIME_TYPES}
        onDrop={(files) => {
          return onAppDropzoneDrop(files);
        }}
        classNames={{
          fullScreen: classes.fullScreen,
          root: classes.root,
        }}
      >
        <div className={classes.card}>
          <div className={classes.iconWrapper}>
            <Dropzone.Accept>
              <IconUpload
                size={ICON_SIZE}
                color="var(--mantine-color-blue-6)"
                stroke={1.5}
              />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX
                size={ICON_SIZE}
                color="var(--mantine-color-red-6)"
                stroke={1.5}
              />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFileSpreadsheet
                size={ICON_SIZE}
                color="var(--mantine-color-blue-6)"
                stroke={1.5}
              />
            </Dropzone.Idle>
          </div>
          <Stack align="center" gap="xs">
            <Text size="xl" fw={600}>
              <Trans>Drop to import</Trans>
            </Text>
            <Text size="sm" c="dimmed">
              <Trans>CSV or Excel file</Trans>
            </Text>
          </Stack>
        </div>
      </Dropzone.FullScreen>
    </>
  );
}
