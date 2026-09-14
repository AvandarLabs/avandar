import { Trans } from "@lingui/react/macro";
import { Box, Loader, Stack, VisuallyHidden } from "@mantine/core";
import { useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PrivateResourcesNotice } from "./PrivateResourcesNotice";
import { PrivateResourcesTable } from "./PrivateResourcesTable";
import { ReassignOwnerModal } from "./ReassignOwnerModal";
import { usePrivateResourcesPanelData } from "./usePrivateResourcesPanelData";

/** Shows counts and ownership reassignment without exposing private content. */
export function PrivateResourcesPanel(): React.ReactNode {
  const workspace = useCurrentWorkspace();
  const [reassignUserId, setReassignUserId] = useState<string | undefined>(
    undefined,
  );
  const { privateResourceCounts, isLoading, nameByUserId } =
    usePrivateResourcesPanelData(workspace.id);

  if (isLoading) {
    return (
      <Box role="status">
        <Loader size="sm" aria-hidden />
        <VisuallyHidden>
          <Trans>Loading private resources</Trans>
        </VisuallyHidden>
      </Box>
    );
  }

  return (
    <Stack gap="md">
      <PrivateResourcesNotice />
      <PrivateResourcesTable
        privateResourceCounts={privateResourceCounts}
        nameByUserId={nameByUserId}
        onReassign={setReassignUserId}
      />
      {reassignUserId ? (
        <ReassignOwnerModal
          fromUserId={reassignUserId}
          onClose={() => {
            setReassignUserId(undefined);
          }}
        />
      ) : null}
    </Stack>
  );
}
