import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { act, cleanup, fireEvent, render, screen, within } from "@/test-utils";
import { PluginDataSlotsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    bindings: [] as unknown[],
    bindingsResult: {} as { isError?: boolean },
    sourcesByConceptId: {} as Record<string, unknown>,
    isSourceLoadPending: false,
    deleteBinding: vi.fn(),
    deleteOptions: undefined as
      | { onSuccess: () => void; onError: (error: Error) => void }
      | undefined,
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    openDataSlotBindingModal: vi.fn(),
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
        useGetAll: () => {
          return [mocks.bindings, false, mocks.bindingsResult];
        },
        useDelete: (options: typeof mocks.deleteOptions) => {
          mocks.deleteOptions = options;
          return [mocks.deleteBinding, false, {}];
        },
      },
    };
  },
);
vi.mock("@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource", () => {
  return {
    loadDataSlotSource: (options: { conceptId: string }) => {
      if (mocks.isSourceLoadPending) {
        return new Promise(() => {});
      }
      const source = mocks.sourcesByConceptId[options.conceptId];
      return source instanceof Error
        ? Promise.reject(source)
        : Promise.resolve(source);
    },
  };
});
vi.mock("@/utils/notifications/notify", () => {
  return { notifySuccess: mocks.notifySuccess, notifyError: mocks.notifyError };
});
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal",
  () => {
    return { openDataSlotBindingModal: mocks.openDataSlotBindingModal };
  },
);

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
      deaths: {
        title: "%slot.deaths.title%",
        required: true,
        attributes: {
          deathDate: { type: "date", title: "%death%", required: true },
        },
      },
    },
  },
  strings: {
    en: {
      "slot.cases.title": "Cases",
      "slot.deaths.title": "Deaths",
      onset: "Onset date",
      death: "Date of death",
    },
  },
  icons: {},
} as unknown as PluginManifestModule;

const MEASLES_CASES: DataSlotSource = {
  kind: "concept",
  conceptId: "concept-cases" as Concept.Id,
  name: "Measles cases",
  fields: [
    { id: "attr-onset", columnName: "Onset", label: "Onset", dataType: "date" },
  ],
};

let queryClient: QueryClient;

function _makeBinding(slotId: string, fieldId = "attr-onset"): unknown {
  return {
    id: `binding-${slotId}`,
    installationId: INSTALLATION.id,
    slotId,
    sourceType: "concept",
    conceptId: "concept-cases",
    datasetId: undefined,
    attributeMap:
      slotId === "cases" ? { onsetDate: fieldId } : { deathDate: fieldId },
  };
}

function Wrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
        {children}
      </ModalsProvider>
    </QueryClientProvider>
  );
}

function _makeSection(canManage = true): JSX.Element {
  return (
    <PluginDataSlotsSection
      pluginName="Epidemiology"
      manifestModule={MANIFEST_MODULE}
      installation={INSTALLATION}
      canManage={canManage}
    />
  );
}

function _renderSection(canManage = true): ReturnType<typeof render> {
  return render(_makeSection(canManage), { wrapper: Wrapper });
}

describe("PluginDataSlotsSection", () => {
  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.bindings = [_makeBinding("cases")];
    mocks.bindingsResult = {};
    mocks.sourcesByConceptId = { "concept-cases": MEASLES_CASES };
    mocks.isSourceLoadPending = false;
    mocks.deleteBinding.mockReset();
    mocks.notifySuccess.mockReset();
    mocks.notifyError.mockReset();
    mocks.openDataSlotBindingModal.mockReset();
  });

  it("shows Bound and the case type a bound slot reads", async () => {
    _renderSection();

    expect(
      await screen.findByText("Case type: Measles cases"),
    ).toBeInTheDocument();
    expect(screen.getByText("Bound")).toBeInTheDocument();
  });

  it("shows Not bound and offers Choose for a slot with no binding", async () => {
    _renderSection();

    expect(await screen.findByText("Not bound")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose the records for Deaths" }),
    ).toHaveTextContent("Choose");
  });

  it("shows Broken and why when a mapped field no longer exists", async () => {
    mocks.bindings = [_makeBinding("cases", "attr-deleted")];

    _renderSection();

    expect(await screen.findByText("Broken")).toBeInTheDocument();
    expect(
      screen.getByText("The field for Onset date no longer exists."),
    ).toBeInTheDocument();
  });

  it("says the source is gone when the bound case type no longer loads", async () => {
    mocks.sourcesByConceptId = {};

    _renderSection();

    expect(
      await screen.findByText(
        "The case type or dataset was deleted, or you cannot read it.",
      ),
    ).toBeInTheDocument();
  });

  it("opens the slot's binding modal from Change", async () => {
    _renderSection();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Change the records for Cases",
      }),
    );

    expect(mocks.openDataSlotBindingModal).toHaveBeenCalledWith({
      pluginName: "Epidemiology",
      manifestModule: MANIFEST_MODULE,
      installation: INSTALLATION,
      slotId: "cases",
    });
  });

  it("removes an optional slot's binding once the admin confirms", async () => {
    _renderSection();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Remove the records for Cases",
      }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Remove the records for Cases?",
    });
    expect(mocks.deleteBinding).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(mocks.deleteBinding).toHaveBeenCalledWith({ id: "binding-cases" });
  });

  it("says the records were removed, and moves focus to Choose", async () => {
    _renderSection();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Remove the records for Cases",
      }),
    );

    act(() => {
      mocks.deleteOptions?.onSuccess();
    });

    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      "Removed the records for Cases",
    );
    expect(
      screen.getByRole("button", { name: "Change the records for Cases" }),
    ).toHaveFocus();
  });

  it("says why when the records could not be removed", async () => {
    _renderSection();
    await screen.findByText("Case type: Measles cases");

    act(() => {
      mocks.deleteOptions?.onError(new Error("permission denied"));
    });

    expect(mocks.notifyError).toHaveBeenCalledWith({
      title: "Could not remove the records for Cases",
      message: "permission denied",
    });
    expect(mocks.notifySuccess).not.toHaveBeenCalled();
  });

  it("says the records did not load, rather than loading forever", async () => {
    mocks.sourcesByConceptId = { "concept-cases": new Error("network down") };

    _renderSection();

    expect(
      await screen.findByText("Could not load the records this plugin reads."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading the records" }),
    ).not.toBeInTheDocument();
  });

  it("says the records did not load when their bindings failed to load", async () => {
    mocks.bindings = undefined as never;
    mocks.bindingsResult = { isError: true };

    _renderSection();

    expect(
      await screen.findByText("Could not load the records this plugin reads."),
    ).toBeInTheDocument();
  });

  it("keeps the rows on screen while a save or remove reloads them", async () => {
    const view = _renderSection();
    const changeButton = await screen.findByRole("button", {
      name: "Change the records for Cases",
    });
    mocks.isSourceLoadPending = true;

    mocks.bindings = [
      _makeBinding("cases", "attr-onset"),
      _makeBinding("deaths"),
    ];
    view.rerender(_makeSection());

    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen.queryByRole("status", { name: "Loading the records" }),
    ).not.toBeInTheDocument();
    expect(changeButton).toBeInTheDocument();
    expect(screen.getByText("Case type: Measles cases")).toBeInTheDocument();
  });

  it("offers no Remove for a required slot", async () => {
    mocks.bindings = [_makeBinding("cases"), _makeBinding("deaths")];

    _renderSection();

    expect(
      await screen.findByRole("button", {
        name: "Change the records for Deaths",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove the records for Deaths" }),
    ).not.toBeInTheDocument();
  });

  it("offers no buttons to members who cannot manage plugins", async () => {
    _renderSection(false);

    await screen.findByText("Case type: Measles cases");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
