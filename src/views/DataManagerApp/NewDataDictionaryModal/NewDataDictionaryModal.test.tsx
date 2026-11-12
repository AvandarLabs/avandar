import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { NewDataDictionaryModal } from "@/views/DataManagerApp/NewDataDictionaryModal/NewDataDictionaryModal";

const { insertMock, navigateMock, onlineState } = vi.hoisted(() => {
  return {
    insertMock: vi.fn(),
    navigateMock: vi.fn(),
    onlineState: { isOnline: true },
  };
});

vi.mock("@/lib/hooks/browser/useIsOnline/useIsOnline", () => {
  return {
    useIsOnline: () => {
      return onlineState.isOnline;
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

vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return {
    useCurrentUserProfile: () => {
      return [{ userId: "user-id", profileId: "profile-id" }, false, {}];
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

vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return {
      DataDictionaryClient: {
        QueryKeys: {
          getAll: () => {
            return ["DataDictionaryClient", "getAll"];
          },
        },
        useInsert: (options: {
          onSuccess: (dictionary: { id: string; name: string }) => void;
        }) => {
          return [
            (variables: unknown) => {
              insertMock(variables);
              options.onSuccess({ id: "new-dictionary-id", name: "NYS codes" });
            },
            false,
          ];
        },
      },
    };
  },
);

describe("NewDataDictionaryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onlineState.isOnline = true;
  });

  it("creates a dictionary owned by the current profile and opens it", async () => {
    render(<NewDataDictionaryModal opened onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "  NYS codes " },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Case report codes." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create dictionary" }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: "workspace-id",
          ownerId: "user-id",
          ownerProfileId: "profile-id",
          name: "NYS codes",
          description: "Case report codes.",
        }),
      });
    });
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/$workspaceSlug/data-manager/dictionaries/$dictionaryId",
      params: { workspaceSlug: "demo", dictionaryId: "new-dictionary-id" },
    });
  });

  it("does not submit a blank name", () => {
    render(<NewDataDictionaryModal opened onClose={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Create dictionary" }),
    ).toBeDisabled();
  });

  it("clears the fields when the modal is cancelled", () => {
    const onClose = vi.fn();
    render(<NewDataDictionaryModal opened onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Draft name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("does not submit while offline", () => {
    onlineState.isOnline = false;
    render(<NewDataDictionaryModal opened onClose={vi.fn()} />);
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "NYS codes" } });
    fireEvent.submit(nameInput.closest("form")!);

    expect(insertMock).not.toHaveBeenCalled();
  });
});
