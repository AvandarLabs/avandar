import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DataManagerToolbarActions } from "@/views/DataManagerApp/DataManagerToolbarActions/DataManagerToolbarActions";

const { navigateMock, permissionState } = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    permissionState: { canEditDictionaries: true, canEditCrosswalks: true },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: (key: string) => {
      return key === "data_sources__can_edit_crosswalks"
        ? permissionState.canEditCrosswalks
        : permissionState.canEditDictionaries;
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return navigateMock;
    },
  };
});

describe("DataManagerToolbarActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionState.canEditDictionaries = true;
    permissionState.canEditCrosswalks = true;
  });

  it("opens learning a dictionary from the New dictionary menu", async () => {
    render(
      <DataManagerToolbarActions
        onNewDictionary={vi.fn()}
        listToggle={undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "New dictionary" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /From datasets/ }),
    );
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/$workspaceSlug/data-manager/dictionaries/new",
        params: { workspaceSlug: "demo" },
      }),
    );
  });

  it("opens the empty dictionary dialog from Start empty", async () => {
    const onNewDictionary = vi.fn();
    render(
      <DataManagerToolbarActions
        onNewDictionary={onNewDictionary}
        listToggle={undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "New dictionary" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /Start empty/ }),
    );
    expect(onNewDictionary).toHaveBeenCalledOnce();
  });

  it("shows no New dictionary menu to someone who cannot edit dictionaries", () => {
    permissionState.canEditDictionaries = false;
    render(
      <DataManagerToolbarActions
        onNewDictionary={vi.fn()}
        listToggle={undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: "New dictionary" })).toBeNull();
  });

  it("opens a new crosswalk from New crosswalk", () => {
    render(
      <DataManagerToolbarActions
        onNewDictionary={vi.fn()}
        listToggle={undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "New crosswalk" }));
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/$workspaceSlug/data-manager/crosswalks/new",
        params: { workspaceSlug: "demo" },
      }),
    );
  });

  it("shows no New crosswalk to someone who cannot edit crosswalks", () => {
    permissionState.canEditCrosswalks = false;
    render(
      <DataManagerToolbarActions
        onNewDictionary={vi.fn()}
        listToggle={undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: "New crosswalk" })).toBeNull();
  });

  it("shows the list again from Show list", () => {
    const onToggle = vi.fn();
    render(
      <DataManagerToolbarActions
        onNewDictionary={vi.fn()}
        listToggle={{ isListShown: false, onToggle }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show list" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it.each([
    [true, "Hide list", "true"],
    [false, "Show list", "false"],
  ])(
    "says whether the list is expanded when isListShown is %s",
    (isListShown, name, expanded) => {
      render(
        <DataManagerToolbarActions
          onNewDictionary={vi.fn()}
          listToggle={{ isListShown, onToggle: vi.fn() }}
        />,
      );
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-expanded",
        expanded,
      );
    },
  );

  it("offers Hide list while the list is shown", () => {
    render(
      <DataManagerToolbarActions
        onNewDictionary={vi.fn()}
        listToggle={{ isListShown: true, onToggle: vi.fn() }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Hide list" }),
    ).toBeInTheDocument();
  });
});
