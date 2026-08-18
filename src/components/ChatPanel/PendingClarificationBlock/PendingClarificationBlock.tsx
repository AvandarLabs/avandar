import { Box } from "@mantine/core";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ClarificationCard } from "@/components/ChatPanel/ClarificationCard/ClarificationCard";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useClarificationSubmission } from "./useClarificationSubmission";
import { useDiscoveryRecovery } from "./useDiscoveryRecovery";
import { useDiscoveryResolver } from "./useDiscoveryResolver";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";

/** Renders the pending clarification prompt above the composer. */
export function PendingClarificationBlock(): React.ReactNode {
  const pendingClarification = ChatPanelStateManager.useState()
    .pendingClarification as ChatClarifyRequestWithAudit | undefined;
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const resolveDiscovery = useDiscoveryResolver();
  const onSubmit = useClarificationSubmission({
    request: pendingClarification,
    userId: user?.id,
    workspaceId: workspace.id,
  });
  const onRequestDifferentDiscovery =
    useDiscoveryRecovery(pendingClarification);

  return pendingClarification ?
      <Box px="md" pb="xs">
        <ClarificationCard
          request={pendingClarification}
          onAnswer={onSubmit}
          resolveDiscovery={resolveDiscovery}
          onRequestDifferentDiscovery={onRequestDifferentDiscovery}
        />
      </Box>
    : null;
}
