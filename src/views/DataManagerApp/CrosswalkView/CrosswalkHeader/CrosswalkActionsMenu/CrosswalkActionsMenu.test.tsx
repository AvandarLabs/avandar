import { modals } from "@mantine/modals";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/test-utils";
import { CrosswalkActionsMenu } from "@/views/DataManagerApp/CrosswalkView/CrosswalkHeader/CrosswalkActionsMenu/CrosswalkActionsMenu";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

const mocks = vi.hoisted(() => {
  return {
    deleteCrosswalk: vi.fn(),
    navigate: vi.fn(),
    options: undefined as undefined | { onSuccess: () => void },
  };
});

vi.mock("@/clients/crosswalks/CrosswalkClient", () => {
  return {
    CrosswalkClient: {
      useDelete: (options: typeof mocks.options) => {
        mocks.options = options;
        return [mocks.deleteCrosswalk, false];
      },
    },
  };
});
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/invalidateCrosswalkQueries",
  () => {
    return {
      invalidateCrosswalkQueries: () => {
        return Promise.resolve();
      },
    };
  },
);
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useQueryClient: () => {
      return {};
    },
  };
});
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useNavigate: () => {
      return mocks.navigate;
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});

const CROSSWALK = {
  id: "crosswalk-1",
  name: "Measles line lists",
} as unknown as Crosswalk.T;

/**
 * Opens the delete confirmation. The real confirm modal needs the app's
 * modals provider, so the opener is spied on and the test reads the options
 * it was given, as the other views' tests do.
 */
async function _openDelete(
  combinedDatasetName: string | undefined,
): Promise<NonNullable<Parameters<typeof modals.openConfirmModal>[0]>> {
  render(
    <CrosswalkActionsMenu
      crosswalk={CROSSWALK}
      combinedDatasetName={combinedDatasetName}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "More crosswalk actions" }),
  );
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Delete crosswalk" }),
  );
  const options = openConfirmModalMock.mock.lastCall?.[0];
  if (!options) {
    throw new Error("The delete confirmation did not open");
  }
  return options;
}

const openConfirmModalMock = vi.fn<typeof modals.openConfirmModal>();

describe("CrosswalkActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openConfirmModalMock.mockReturnValue("delete-crosswalk");
    vi.spyOn(modals, "openConfirmModal").mockImplementation(
      openConfirmModalMock,
    );
  });

  it("says the combined dataset stays but stops updating, then deletes", async () => {
    const options = await _openDelete("Measles line lists (combined)");

    render(<>{options.children}</>);
    expect(
      screen.getByText(
        "Delete Measles line lists? Its mappings are deleted. Measles line lists (combined) stays, but stops updating.",
      ),
    ).toBeInTheDocument();
    expect(options.labels).toEqual({ confirm: "Delete", cancel: "Cancel" });
    expect(mocks.deleteCrosswalk).not.toHaveBeenCalled();
    act(() => {
      options.onConfirm?.();
    });
    expect(mocks.deleteCrosswalk).toHaveBeenCalledWith({ id: "crosswalk-1" });
  });

  it("leaves the combined dataset out when there is none", async () => {
    const options = await _openDelete(undefined);

    render(<>{options.children}</>);
    expect(
      screen.getByText("Delete Measles line lists? Its mappings are deleted."),
    ).toBeInTheDocument();
  });

  it("goes back to Data Sources once deleted", async () => {
    await _openDelete(undefined);
    act(() => {
      mocks.options?.onSuccess();
    });

    expect(mocks.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/$workspaceSlug/data-manager" }),
    );
  });
});
