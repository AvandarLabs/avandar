import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useMatchRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WorkspaceBillingView } from "@/components/WorkspaceSettingsPage/WorkspaceBillingView";
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
      // if this workspace has no subscription, we are not in the checkout
      // route, and the billing modal is not already open
      if (!subscription && !isInCheckoutRoute && !modalId) {
        setModalId(
          modals.open({
            title: (
              <Text size="1.5rem" fw={700}>
                Select your plan
              </Text>
            ),
            size: "100%",
            children: <WorkspaceBillingView hideTitle />,
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

    // if we have a subscription now and the modal is open, then we need to
    // close it
    if (subscription && modalId) {
      modals.close(modalId);
    }
  }, [subscription, isInCheckoutRoute, modalId]);
}
