import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import css from "@/components/layouts/RootLayout/useRootWorkspaceChecks/useEnsureWorkspaceBilling/useEnsureWorkspaceBilling.module.css";
import { useResyncWorkspaceSubscription } from "@/components/layouts/RootLayout/useRootWorkspaceChecks/useEnsureWorkspaceBilling/useResyncWorkspaceSubscription";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Opens the blocking plan picker for `useEnsureWorkspaceBilling` once a
 * workspace with no usable plan has finished its subscription sync.
 * Returns the modal id so the hook can close it when a plan arrives.
 */
function _openBillingSetupModal(workspace: Workspace.WithSubscription): string {
  return modals.open({
    title: (
      <Text size="1.5rem" fw={700}>
        <Trans>Select your plan</Trans>
      </Text>
    ),
    size: "100%",
    children: <WorkspaceBillingView hideTitle workspace={workspace} />,
    classNames: { content: css.content },
    withCloseButton: false,
    closeOnEscape: false,
    closeOnClickOutside: false,
  });
}

/**
 * Hook to ensure that the workspace has a billing setup.
 */
export function useEnsureWorkspaceBilling(): void {
  const workspace = useCurrentWorkspace();
  const { subscription } = workspace;
  const matchRoute = useMatchRoute();
  const [modalId, setModalId] = useState<string | undefined>(undefined);

  // if we're in the checkout route we don't need to show the billing modal
  const isInCheckoutRoute = !!matchRoute({
    to: "/$workspaceSlug/checkout",
    fuzzy: true,
    params: {
      workspaceSlug: workspace.slug,
    },
  });
  const shouldOpenBillingModal =
    !isInCheckoutRoute &&
    SubscriptionModule.shouldPromptForBillingSetup(subscription);

  // A paid plan whose sync was missed should not be asked to pick a plan
  // again, so the modal waits for this sync to settle
  const { isResyncing } = useResyncWorkspaceSubscription({
    workspaceId: workspace.id,
    isEnabled: shouldOpenBillingModal,
  });

  useEffect(() => {
    // we use queue microtask to ensure that the Mantine ModalsProvider is
    // ready before opening a modal
    queueMicrotask(() => {
      if (shouldOpenBillingModal && !isResyncing && !modalId) {
        setModalId(_openBillingSetupModal(workspace));
      }
    });

    const hasEntitlements =
      SubscriptionModule.doesSubscriptionGrantEntitlements(subscription);
    if (hasEntitlements && modalId) {
      modals.close(modalId);
      setModalId(undefined);
    }
  }, [subscription, shouldOpenBillingModal, isResyncing, modalId, workspace]);
}
