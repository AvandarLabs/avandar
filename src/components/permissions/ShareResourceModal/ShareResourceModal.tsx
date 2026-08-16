import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { ShareAddPrincipalRow } from "./ShareAddPrincipalRow/ShareAddPrincipalRow";
import { ShareGeneralAccess } from "./ShareGeneralAccess/ShareGeneralAccess";
import { SharePrincipalList } from "./SharePrincipalList";
import { ShareResourceModalFooter } from "./ShareResourceModalFooter";
import { ShareSummaryLine } from "./ShareSummaryLine/ShareSummaryLine";
import { SharingSettingsLoading } from "./SharingSettingsLoading";
import { useShareResourceModalState } from "./useShareResourceModalState/useShareResourceModalState";
import type { ShareResourcePublishing } from "./ShareResourceModal.types";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { ReactNode } from "react";

type Props = {
  resourceName: string;
  resourceType: ResourceType;
  resourceId: string;
  /** Only dashboards have a published form; datasets omit this entirely. */
  publishing?: ShareResourcePublishing;
  /**
   * Whether the viewer may write share rows. Defaults to `true` because every
   * caller but the dashboard one only opens this modal for resource admins. A
   * dashboard editor may publish without being allowed to hand out access, so
   * the sharing half renders read-only for them while publishing stays live.
   */
  canManageShares?: boolean;
  onClose: () => void;
};

/**
 * Drive-style share modal body. Renders the four sections of the new
 * layout; `useShareResourceModalState` holds every query, mutation and
 * derived list behind them.
 */
export function ShareResourceModal({
  resourceName,
  resourceType,
  resourceId,
  publishing,
  canManageShares = true,
  onClose,
}: Readonly<Props>): ReactNode {
  const state = useShareResourceModalState({
    resourceName,
    resourceType,
    resourceId,
    publishing,
  });

  if (state.isLoading) {
    return <SharingSettingsLoading />;
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        <Trans>Share &ldquo;{resourceName}&rdquo;</Trans>
      </Text>

      <ShareGeneralAccess
        resourceType={resourceType}
        value={state.generalAccess.displayedValue}
        isOwner={state.generalAccess.isOwner}
        isBusy={state.generalAccess.isBusy || !canManageShares}
        workspaceShareRole={state.workspaceShareRole}
        isPublicOptionAvailable={publishing !== undefined}
        publicOptionDisabledReason={publishing?.publicOptionDisabledReason}
        onChange={(value) => {
          // The dropdown moves the publish target and writes share state; it
          // never writes visibility. The footer button does that.
          publishing?.onGeneralAccessChange(value);
          state.generalAccess.onChange(value);
        }}
        onWorkspaceRoleChange={state.generalAccess.onWorkspaceRoleChange}
      />

      <Stack gap="xs">
        <Text fw={600} size="sm">
          <Trans>Give access to additional members</Trans>
        </Text>

        <ShareAddPrincipalRow
          members={state.memberOptions}
          groups={state.groupOptions}
          isAdding={state.isAddingPrincipal}
          isDisabled={
            state.generalAccess.displayedValue === "private" ||
            state.generalAccess.isBusy ||
            !canManageShares
          }
          onAdd={state.onAddPrincipal}
        />
      </Stack>

      <SharePrincipalList
        shares={state.displayShares}
        resourceType={resourceType}
        isReadOnly={!canManageShares}
        onRoleChange={state.onRoleChange}
        onToggleRequiresAppAccess={state.onToggleRequiresAppAccess}
        onRemove={state.onRemoveShare}
      />

      <ShareSummaryLine spans={state.summarySpans} />

      {publishing?.section}

      <ShareResourceModalFooter
        publishingActions={publishing?.actions}
        onClose={onClose}
      />
    </Stack>
  );
}
