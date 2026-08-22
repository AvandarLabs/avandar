import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import type { ReactNode } from "react";

/**
 * Opens chat in the case-type designer session.
 */
export function NewCaseTypeButton(): ReactNode {
  const dispatch = ChatPanelStateManager.useDispatch();

  return (
    <Button
      leftSection={<IconPlus size={18} aria-hidden />}
      onClick={dispatch.beginCaseDesign}
      size="compact-sm"
      variant="light"
    >
      <Trans>New case type</Trans>
    </Button>
  );
}
