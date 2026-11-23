import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import type { ReactNode } from "react";

/**
 * Opens chat in the case-type designer session. Renders nothing for a user
 * who cannot create case types.
 */
export function NewCaseTypeButton(): ReactNode {
  const dispatch = ChatPanelStateManager.useDispatch();
  const canCreateCaseType = useHasPermission(
    "case_types__can_create_case_type",
  );

  if (!canCreateCaseType) {
    return null;
  }

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
