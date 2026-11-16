import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@/test-utils";
import { ConfirmDataSlotsSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmDataSlotsSummary";
import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

type GetAllArgument = {
  where?: Record<string, { eq?: unknown }>;
  useQueryOptions?: { enabled?: boolean };
};

const mocks = vi.hoisted(() => {
  return { install: vi.fn(), datasetId: "dataset-line-list" };
});

const DATASET_ID = mocks.datasetId;

/** A client's `useGetAll` returning the rows, filtered by one column. */
function _makeUseGetAll(
  rows: unknown[],
  filter?: { column: string; field: string },
): (argument: GetAllArgument) => unknown[] {
  return (argument) => {
    if (argument.useQueryOptions?.enabled === false) {
      return [undefined, false, {}];
    }
    return [
      rows.filter((row) => {
        return (
          filter === undefined ||
          (row as Record<string, unknown>)[filter.field] ===
            argument.where?.[filter.column]?.eq
        );
      }),
      false,
      {},
    ];
  };
}

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    return {
      PluginInstallationClient: {
        QueryKeys: {
          getAll: () => {
            return [];
          },
        },
        useInstall: () => {
          return [mocks.install, false, {}];
        },
      },
    };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return { notifySuccess: vi.fn(), notifyError: vi.fn() };
});
vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: { useGetAll: _makeUseGetAll([]) } };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return { ConceptAttributeClient: { useGetAll: _makeUseGetAll([]) } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: _makeUseGetAll([
        Model.make("Dataset", { id: mocks.datasetId, name: "line_list.csv" }),
      ]),
    },
  };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: _makeUseGetAll(
        [
          Model.make("DatasetColumn", {
            id: "col_onset",
            name: "onset",
            columnIdx: 0,
            dataType: "date",
            datasetId: mocks.datasetId,
          }),
        ],
        { column: "dataset_id", field: "datasetId" },
      ),
    },
  };
});
// The panel has its own tests. This stand-in only reports whether the wizard
// handed it a draft, and offers a complete and an incomplete draft to choose.
// The wizard's real rule for when a draft is complete still runs.
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel",
  () => {
    return {
      DataSlotPanel: (props: {
        slotId: string;
        slotTitle: string;
        draft: unknown;
        onDraftChange: (draft: PluginDataSlotBinding.Draft) => void;
      }) => {
        return (
          <div>
            <p>{`${props.slotTitle} draft: ${props.draft === undefined ? "none" : "present"}`}</p>
            <button
              type="button"
              onClick={() => {
                props.onDraftChange(_makeDraft(props.slotId, true));
              }}
            >
              {`Complete ${props.slotTitle}`}
            </button>
            <button
              type="button"
              onClick={() => {
                props.onDraftChange(_makeDraft(props.slotId, false));
              }}
            >
              {`Partial ${props.slotTitle}`}
            </button>
          </div>
        );
      },
    };
  },
);

let queryClient: QueryClient;

function _makeDraft(
  slotId: string,
  isComplete: boolean,
): PluginDataSlotBinding.Draft {
  return {
    slotId,
    sourceType: "dataset",
    conceptId: undefined,
    datasetId: DATASET_ID as PluginDataSlotBinding.Draft["datasetId"],
    attributeMap: isComplete ? { onsetDate: "col_onset" } : {},
  };
}

function _makeSlot(isRequired: boolean): Record<string, unknown> {
  return {
    title: "%slot.title%",
    required: isRequired,
    attributes: {
      onsetDate: { type: "date", title: "%onset%", required: true },
    },
  };
}

function _makeManifestModule(
  dataSlots: Record<string, unknown>,
): PluginManifestModule {
  return {
    manifest: {
      id: "avandar.epidemiology",
      name: "%name%",
      description: "%description%",
      version: "1.2.0",
      license: "MIT",
      icon: "chart-dots",
      permissions: ["data:slots"],
      dataSlots,
      contributes: {
        commands: [],
        menus: {},
        vizTypes: [],
        aiTools: [],
        content: [],
      },
    },
    strings: {
      en: {
        name: "Epidemiology",
        description: "Charts disease spread.",
        "slot.title": "Cases",
      },
    },
    icons: {},
  } as unknown as PluginManifestModule;
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderWizard(dataSlots: Record<string, unknown>): void {
  render(
    <PluginInstallWizard
      pluginName="Epidemiology"
      manifestModule={_makeManifestModule(dataSlots)}
      onClose={vi.fn()}
    />,
    { wrapper: QueryWrapper },
  );
}

function _clickButton(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("PluginInstallWizard data slots with the real completeness rule", () => {
  beforeEach(() => {
    cleanup();
    mocks.install.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("keeps Next off for a required slot whose draft misses a required attribute", () => {
    _renderWizard({ cases: _makeSlot(true) });
    _clickButton("Next");

    _clickButton("Partial Cases");

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    _clickButton("Complete Cases");
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("keeps the drafts when the admin goes Back and then Next", () => {
    _renderWizard({ cases: _makeSlot(true) });
    _clickButton("Next");
    _clickButton("Complete Cases");
    _clickButton("Next");

    _clickButton("Back");

    expect(screen.getByText("Cases draft: present")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    _clickButton("Next");
    expect(
      screen.getByText("Cases: Dataset: line_list.csv"),
    ).toBeInTheDocument();
  });

  it("blocks an optional slot with an incomplete draft until it is skipped", () => {
    _renderWizard({ cases: _makeSlot(false) });
    _clickButton("Next");

    _clickButton("Partial Cases");

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    _clickButton("Skip for now");
    expect(screen.getByText("Cases: not chosen yet")).toBeInTheDocument();
    _clickButton("Install");
    expect(mocks.install).toHaveBeenCalledWith(
      expect.objectContaining({ bindings: [] }),
    );
  });

  describe("a data slot id named like a prototype member", () => {
    it("still needs a draft before Next, and then installs it", () => {
      _renderWizard({ constructor: _makeSlot(true) });
      _clickButton("Next");

      expect(screen.getByText("Cases draft: none")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      _clickButton("Complete Cases");
      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
      _clickButton("Next");
      _clickButton("Install");

      expect(mocks.install).toHaveBeenCalledWith(
        expect.objectContaining({
          bindings: [_makeDraft("constructor", true)],
        }),
      );
    });

    it("lists the slot as not chosen on Confirm instead of throwing", () => {
      render(
        <ConfirmDataSlotsSummary
          manifestModule={_makeManifestModule({
            constructor: _makeSlot(false),
          })}
          draftsBySlotId={{}}
        />,
        { wrapper: QueryWrapper },
      );

      expect(screen.getByText("Cases: not chosen yet")).toBeInTheDocument();
    });

    it("names a bound source that cannot be found as unavailable", () => {
      render(
        <ConfirmDataSlotsSummary
          manifestModule={_makeManifestModule({ cases: _makeSlot(false) })}
          draftsBySlotId={{
            cases: {
              ..._makeDraft("cases", true),
              datasetId: "deleted" as PluginDataSlotBinding.Draft["datasetId"],
            },
          }}
        />,
        { wrapper: QueryWrapper },
      );

      expect(
        screen.getByText("Cases: Dataset: unavailable"),
      ).toBeInTheDocument();
    });
  });
});
