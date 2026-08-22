import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ComponentProps } from "react";

import { ModalsProvider } from "@mantine/modals";
import { vi } from "vitest";

import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { fireEvent, render, screen } from "@/test-utils";

type ShareResourceModalProps = ComponentProps<typeof ShareResourceModal>;

/**
 * Renders the modal with sensible defaults so a test only states what it
 * varies.
 */
export function renderShareResourceModal(
  overrides: Readonly<Partial<ShareResourceModalProps>> = {},
): void {
  render(
    // `ModalsProvider` is mounted here rather than in `TestProviders` because
    // the app mounts it in the workspace layout. Without it the "Make private"
    // confirmation opens into nothing and its assertions silently pass.
    <ModalsProvider>
      <ShareResourceModal
        resourceName="Q3 Revenue"
        resourceType="dashboard"
        resourceId="dash-1"
        onClose={vi.fn()}
        {...overrides}
      />
    </ModalsProvider>,
  );
}

/** A publishing prop whose two visibilities can be set independently. */
export function makeTestPublishing(
  overrides: Readonly<{
    onGeneralAccessChange?: () => void;
    targetVisibility?: Dashboard.Visibility;
    currentVisibility?: Dashboard.Visibility;
  }>,
): NonNullable<ShareResourceModalProps["publishing"]> {
  return {
    targetVisibility: overrides.targetVisibility ?? "workspace",
    currentVisibility: overrides.currentVisibility ?? "draft",
    publicOptionDisabledReason: undefined,
    section: <div data-testid="share-publishing-section" />,
    actions: <div data-testid="share-publishing-actions" />,
    onGeneralAccessChange: overrides.onGeneralAccessChange ?? vi.fn(),
  };
}

/** Opens the General access dropdown and picks an option by its label. */
export async function selectGeneralAccess(optionLabel: string): Promise<void> {
  const combobox = await screen.findByRole("combobox", {
    name: "General access",
  });
  fireEvent.click(combobox);
  fireEvent.click(await screen.findByRole("option", { name: optionLabel }));
}
