import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";

/**
 * What the share modal shows while it is still finding out who can reach the
 * resource.
 *
 * Shared by the generic modal and by the dashboard wrapper in front of it:
 * both wait on lookups whose answers change what the modal lets you do, and
 * showing two different holding states for the same wait would read as two
 * different screens.
 */
export function SharingSettingsLoading(): ReactNode {
  return (
    <Stack gap="md">
      <Text>
        <Trans>Loading sharing settings…</Trans>
      </Text>
    </Stack>
  );
}
