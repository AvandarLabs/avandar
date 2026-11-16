import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "$/models/Permissions/Permissions";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@/test-utils";
import { openDataSlotBindingModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type SaveOptions = { onSuccess: () => void };

const mocks = vi.hoisted(() => {
  return {
    appRoles: [undefined, true] as readonly [unknown, boolean],
    bindings: [] as unknown[],
    getAllArguments: [] as unknown[],
    saveBinding: vi.fn(),
    saveOptions: undefined as SaveOptions | undefined,
  };
});

// `useHasPermission` reads the roles through this hook too, so the real
// permission check runs on these roles.
vi.mock("@/hooks/permissions/useUserAppRoles/useUserAppRoles", () => {
  return {
    useUserAppRoles: () => {
      return mocks.appRoles;
    },
  };
});

vi.mock(
  "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient",
  () => {
    return {
      PluginDataSlotBindingClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginDataSlotBindingClient", "getAll"];
          },
        },
        useGetAll: (argument: unknown) => {
          mocks.getAllArguments.push(argument);
          return [mocks.bindings, false, {}];
        },
        useSaveBinding: (options: SaveOptions) => {
          mocks.saveOptions = options;
          return [mocks.saveBinding, false, {}];
        },
      },
    };
  },
);
// The panel has its own tests. This stand-in shows the draft it starts from
// and binds its slot in one click.
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel",
  () => {
    return {
      DataSlotPanel: (props: {
        draft: PluginDataSlotBinding.Draft | undefined;
        onDraftChange: (draft: PluginDataSlotBinding.Draft) => void;
      }) => {
        return (
          <>
            <p>{`Draft source: ${props.draft?.conceptId ?? "none"}`}</p>
            <button
              type="button"
              onClick={() => {
                props.onDraftChange(NEW_DRAFT);
              }}
            >
              Bind Cases
            </button>
          </>
        );
      },
    };
  },
);
// A draft counts as complete as soon as there is one.
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus",
  () => {
    return {
      useDataSlotDraftStatus: (options: { draft: unknown }) => {
        return {
          source: undefined,
          isLoadingSource: false,
          status:
            options.draft === undefined
              ? undefined
              : { kind: "bound", fieldsByAttributeKey: {} },
        };
      },
    };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return { notifySuccess: vi.fn(), notifyError: vi.fn() };
});

const NEW_DRAFT: PluginDataSlotBinding.Draft = {
  slotId: "cases",
  sourceType: "concept",
  conceptId: "concept-new" as PluginDataSlotBinding.Draft["conceptId"],
  datasetId: undefined,
  attributeMap: { onsetDate: "attribute-onset" },
};

const INSTALLATION = {
  id: "installation-id",
  workspaceId: "workspace-id",
  pluginId: "avandar.epidemiology",
} as PluginInstallation.T;

const MANIFEST_MODULE = {
  manifest: {
    id: "avandar.epidemiology",
    dataSlots: {
      cases: {
        title: "%slot.cases.title%",
        required: false,
        attributes: {
          onsetDate: { type: "date", title: "%onset%", required: true },
        },
      },
    },
  },
  strings: { en: { "slot.cases.title": "Cases" } },
  icons: {},
} as unknown as PluginManifestModule;

let queryClient: QueryClient;

function _renderModalsHost(): void {
  render(
    <QueryClientProvider client={queryClient}>
      <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>{null}</ModalsProvider>
    </QueryClientProvider>,
  );
}

function _openCasesModal(slotId = "cases"): Promise<void> {
  let modalClosed: Promise<void> = Promise.resolve();
  act(() => {
    modalClosed = openDataSlotBindingModal({
      pluginName: "Epidemiology",
      manifestModule: MANIFEST_MODULE,
      installation: INSTALLATION,
      slotId,
    });
  });
  return modalClosed;
}

describe("openDataSlotBindingModal", () => {
  beforeEach(() => {
    cleanup();
    mocks.appRoles = [Permissions.RolesMatrix.Builtins.GlobalAdmin, false];
    mocks.bindings = [];
    mocks.getAllArguments = [];
    mocks.saveBinding.mockReset();
    queryClient = new QueryClient();
    _renderModalsHost();
  });

  it("opens a modal titled after the slot", async () => {
    void _openCasesModal();

    expect(
      await screen.findByRole("dialog", { name: "Choose records for Cases" }),
    ).toBeInTheDocument();
  });

  it("starts from the slot's current binding for this install", async () => {
    mocks.bindings = [{ ...NEW_DRAFT, conceptId: "concept-current" }];

    void _openCasesModal();

    expect(
      await screen.findByText("Draft source: concept-current"),
    ).toBeInTheDocument();
    expect(mocks.getAllArguments[0]).toEqual({
      where: {
        installation_id: { eq: "installation-id" },
        slot_id: { eq: "cases" },
      },
    });
  });

  it("keeps Save off until the binding is complete", async () => {
    void _openCasesModal();
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves the chosen records for the install", async () => {
    void _openCasesModal();
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Bind Cases" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(mocks.saveBinding).toHaveBeenCalledWith({
      installationId: "installation-id",
      draft: NEW_DRAFT,
    });
  });

  it("refreshes the bindings once saved, and resolves when the modal closes", async () => {
    mocks.saveBinding.mockImplementation(() => {
      mocks.saveOptions?.onSuccess();
    });
    const modalClosed = _openCasesModal();
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Bind Cases" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await expect(modalClosed).resolves.toBeUndefined();
    expect(mocks.saveOptions).toMatchObject({
      queriesToInvalidate: [["PluginDataSlotBindingClient", "getAll"]],
    });
  });

  it("resolves without saving when Cancel closes the modal", async () => {
    const modalClosed = _openCasesModal();
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await expect(modalClosed).resolves.toBeUndefined();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.saveBinding).not.toHaveBeenCalled();
  });

  it("shows a loader while the user's roles load", async () => {
    mocks.appRoles = [undefined, true];

    void _openCasesModal();
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByRole("status", { name: "Checking your access" }),
    ).toBeInTheDocument();
  });

  describe("for a member who cannot manage plugins", () => {
    beforeEach(() => {
      mocks.appRoles = [Permissions.RolesMatrix.Builtins.GlobalEditor, false];
    });

    it("tells them to ask a workspace admin", async () => {
      void _openCasesModal();

      expect(
        await screen.findByText(
          "Ask a workspace admin to choose which records this plugin reads.",
        ),
      ).toBeInTheDocument();
    });

    it("shows no binding panel", async () => {
      void _openCasesModal();
      const dialog = await screen.findByRole("dialog");

      expect(
        within(dialog).queryByRole("button", { name: "Bind Cases" }),
      ).not.toBeInTheDocument();
    });

    it("resolves when they click Close", async () => {
      const modalClosed = _openCasesModal();
      const dialog = await screen.findByRole("dialog");

      // The header's X is also named Close, so find the button by its text.
      fireEvent.click(within(dialog).getByText("Close"));

      await expect(modalClosed).resolves.toBeUndefined();
    });
  });

  // `constructor` is a valid slot id, but an inherited member, not a slot.
  it.each(["deaths", "constructor"])(
    "resolves at once, opening nothing, for the undeclared slot %s",
    async (slotId) => {
      await expect(_openCasesModal(slotId)).resolves.toBeUndefined();

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );
});
