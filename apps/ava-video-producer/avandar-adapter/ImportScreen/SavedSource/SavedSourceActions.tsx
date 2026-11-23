import { ActionIcon } from "@avandar/ui";
import { Button, ThemeIcon } from "@mantine/core";
import { IconDotsVertical, IconShare, IconWorld } from "@tabler/icons-react";
import type { ReactNode } from "react";
/**
 * Show the source header's inactive service actions for the completed import.
 */
export function SavedSourceActions(): ReactNode {
  return (
    <>
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
  );
}
