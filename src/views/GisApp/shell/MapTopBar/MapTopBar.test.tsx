import { ModalsProvider } from "@mantine/modals";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { MapTopBar } from "@/views/GisApp/shell/MapTopBar/MapTopBar";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

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

describe("MapTopBar", () => {
  it("keeps export reachable and explains why it is unavailable", async () => {
    const avaMapId = "00000000-0000-4000-8000-000000000001" as AvaMap.Id;

    render(
      <MapTopBar
        avaMapId={avaMapId}
        name="Response map"
        saveState="saved"
        basemap={{ type: "builtIn", style: "avandar" }}
        bookmarks={[]}
        onNameChange={vi.fn()}
        onBasemapChange={vi.fn()}
        onSaveCurrentView={vi.fn()}
        onGoToBookmark={vi.fn()}
        onRemoveBookmark={vi.fn()}
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

    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => {
      expect(screen.getByText("Sharing Response map")).toBeVisible();
    });

    const exportButton = screen.getByRole("button", { name: "Export" });
    expect(exportButton).toHaveAttribute("aria-disabled", "true");
    expect(exportButton).not.toBeDisabled();

    fireEvent.focus(exportButton);

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent(
        "Print and PDF export arrives in a later release.",
      );
    });
  });
});
