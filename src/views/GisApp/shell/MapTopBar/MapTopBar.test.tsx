import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ComponentProps } from "react";

import { ModalsProvider } from "@mantine/modals";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { MapTopBar } from "@/views/GisApp/shell/MapTopBar/MapTopBar";

vi.mock("@/hooks/permissions/useResourceRole/useResourceRole", () => {
  return {
    useResourceRole: () => {
      return ["admin", false];
    },
  };
});

vi.mock(
  "@/components/permissions/ShareResourceModal/ShareResourceModal",
  () => {
    type Props = { resourceName: string };
    return {
      ShareResourceModal: ({ resourceName }: Props) => {
        return <div>Sharing {resourceName}</div>;
      },
    };
  },
);

const AVA_MAP_ID = "00000000-0000-4000-8000-000000000001" as AvaMap.Id;

/** Renders `MapTopBar` with default props, overridable per test. */
function _renderTopBar(
  overrides: Partial<ComponentProps<typeof MapTopBar>>,
): void {
  render(
    <MapTopBar
      avaMapId={AVA_MAP_ID}
      name="Response map"
      saveState="saved"
      basemap={{ type: "builtIn", style: "avandar" }}
      bookmarks={[]}
      onNameChange={vi.fn()}
      onBasemapChange={vi.fn()}
      onSaveCurrentView={vi.fn()}
      onGoToBookmark={vi.fn()}
      onRemoveBookmark={vi.fn()}
      onOpenExport={vi.fn()}
      {...overrides}
    />,
    {
      wrapper: ({ children }) => {
        return (
          <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
            {children}
          </ModalsProvider>
        );
      },
    },
  );
}

describe("MapTopBar", () => {
  it("shares the map through the share button", async () => {
    _renderTopBar({});

    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => {
      expect(screen.getByText("Sharing Response map")).toBeVisible();
    });
  });

  it("opens the export sheet", () => {
    const onOpenExport = vi.fn();
    _renderTopBar({ onOpenExport });

    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(onOpenExport).toHaveBeenCalledTimes(1);
  });

  it("does not mark export unavailable", () => {
    _renderTopBar({});

    expect(screen.getByRole("button", { name: "Export" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });
});
