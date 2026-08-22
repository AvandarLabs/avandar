import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
import type { SubscriptionRead } from "$/models/Subscription/Subscription.types";

function _shouldOpenBillingSetupModal(options: {
  subscription: SubscriptionRead | undefined;
  isInCheckoutRoute: boolean;
}): boolean {
  return options.isInCheckoutRoute
    ? false
    : SubscriptionModule.shouldPromptForBillingSetup(options.subscription);
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

  useEffect(() => {
    // we use queue microtask to ensure that the Mantine ModalsProvider is
    // ready before opening a modal
    queueMicrotask(() => {
      const openBillingModal = _shouldOpenBillingSetupModal({
        subscription,
        isInCheckoutRoute,
      });

      if (openBillingModal && !modalId) {
        setModalId(
          modals.open({
            title: (
              <Text size="1.5rem" fw={700}>
                <Trans>Select your plan</Trans>
              </Text>
            ),
            size: "100%",
            children: <WorkspaceBillingView hideTitle workspace={workspace} />,
            styles: {
              content: {
                height: "100%",
              },
            },
            withCloseButton: false,
            closeOnEscape: false,
            closeOnClickOutside: false,
          }),
        );
      }
    });

    const hasEntitlements =
      SubscriptionModule.doesSubscriptionGrantEntitlements(subscription);
    if (hasEntitlements && modalId) {
      modals.close(modalId);
      setModalId(undefined);
    }
  }, [subscription, isInCheckoutRoute, modalId, workspace]);
}
