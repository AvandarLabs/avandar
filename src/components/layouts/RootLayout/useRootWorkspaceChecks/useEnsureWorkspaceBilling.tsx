import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  shouldCloseBillingSetupModal,
  shouldOpenBillingSetupModal,
} from "@/components/layouts/RootLayout/useRootWorkspaceChecks/workspaceBillingSetup";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

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
      const openBillingModal = shouldOpenBillingSetupModal({
        subscription,
        isInCheckoutRoute,
      });

      if (openBillingModal && !modalId) {
        setModalId(
          modals.open({
            title: (
              <Text size="1.5rem" fw={700}>
                Select your plan
              </Text>
            ),
            size: "100%",
            children: (
              <WorkspaceBillingView hideTitle workspace={workspace} />
            ),
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

    const closeBillingModal = shouldCloseBillingSetupModal({
      subscription,
    });

    if (closeBillingModal && modalId) {
      modals.close(modalId);
      setModalId(undefined);
    }
  }, [subscription, isInCheckoutRoute, modalId, workspace]);
}
