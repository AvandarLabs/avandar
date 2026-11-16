import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { cleanup, fireEvent, render, screen, within } from "@/test-utils";
import { PluginDataSlotsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    bindings: [] as unknown[],
    sourcesByConceptId: {} as Record<string, unknown>,
    deleteBinding: vi.fn(),
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
          return [mocks.bindings, false, {}];
        },
        useDelete: () => {
          return [mocks.deleteBinding, false, {}];
        },
      },
    };
  },
);
vi.mock("@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource", () => {
  return {
    loadDataSlotSource: (options: { conceptId: string }) => {
      return Promise.resolve(mocks.sourcesByConceptId[options.conceptId]);
    },
  };
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

function _renderSection(canManage = true): void {
  render(
    <PluginDataSlotsSection
      pluginName="Epidemiology"
      manifestModule={MANIFEST_MODULE}
      installation={INSTALLATION}
      canManage={canManage}
    />,
    { wrapper: Wrapper },
  );
}

describe("PluginDataSlotsSection", () => {
  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.bindings = [_makeBinding("cases")];
    mocks.sourcesByConceptId = { "concept-cases": MEASLES_CASES };
    mocks.deleteBinding.mockReset();
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
