import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { NewDataDictionaryModal } from "@/views/DataManagerApp/NewDataDictionaryModal/NewDataDictionaryModal";

const { insertMock, navigateMock } = vi.hoisted(() => {
  return { insertMock: vi.fn(), navigateMock: vi.fn() };
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
});
