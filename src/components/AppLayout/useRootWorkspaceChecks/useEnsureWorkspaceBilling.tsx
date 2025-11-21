import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useMatchRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { WorkspaceBillingView } from "@/components/WorkspaceSettingsPage/WorkspaceBillingView";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Hook to ensure that the workspace has a billing setup.
 */
export function useEnsureWorkspaceBilling(): void {
  const workspace = useCurrentWorkspace();
  const { subscription } = workspace;
  console.log("workspace", workspace);

  const matchRoute = useMatchRoute();

  // if we're in the checkout route we don't need to show the billing modal
  const isInCheckoutRoute = !!matchRoute({
    to: "/$workspaceSlug/checkout",
    fuzzy: true,
  });

  useEffect(() => {
    // we use queue microtask to ensure that the Mantine ModalsProvider is
    // ready before opening a modal
    queueMicrotask(() => {
      if (!subscription && !isInCheckoutRoute) {
        // if this workspace has no subscription, then open a modal asking the
        // user to select a plan
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
        });
      }
    });
  }, [subscription]);
}
