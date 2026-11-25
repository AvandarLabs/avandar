# Keep or Delete Imported Datasets at Uninstall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a plugin has imported datasets into the workspace, its uninstall dialog lists them and lets an admin delete the ones they choose, keeping the rest.

**Architecture:** A new modal replaces the uninstall confirm for plugins with imports. It builds one row per imported dataset (current name, whether the user may delete it), shows what reads each checked dataset, and on confirm calls a plain async function that uninstalls, verifies the install is gone, then deletes each chosen dataset through `DatasetClient.fullDelete` after re-checking admin access. No schema change.

**Tech Stack:** React 19, Mantine 9 (`modals`, `Checkbox`, `List`), TanStack Query 5, Lingui 6, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md`. Read it first.

**Rules to read:** `docs/rules/typescript.md` (function keyword, `_` prefix for private helpers, block-bodied arrows with `return`, ≤45-line functions), `docs/rules/testing.md`, `docs/rules/i18n.md`, `docs/rules/e2e-testing.md`.

**Branch:** `feat/plugins-uninstall-content` in `~/src/worktrees/avandar/feat/plugins-uninstall-content`, from `origin/demo/measles` at `4b443e1ed`. No upstream on purpose. Do not push. Merge into `demo/measles` only with Pablo's explicit approval (a push to `demo/**` deploys). No Supabase switch is needed: this plan changes no schema, seed, or config.

**Risk:** Task 2 can delete user data, so it is high-risk and gets a task-level review after its unit reviews pass.

---

## File map

All paths below `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/` are shortened to `WPT/`.

| File | Task | Responsibility |
| --- | --- | --- |
| `WPT/returnFocusFromOpener.ts` (create) | 1 | Moved from `openPluginInstallWizard.tsx`: put focus back on the opener or the card heading |
| `WPT/useKeepModalOpenWhile.ts` (create) | 1 | Moved from `PluginInstallWizard.tsx`: turn off a modal's Escape and close button while work runs |
| `WPT/PluginInstallWizard/openPluginInstallWizard.tsx`, `PluginInstallWizard.tsx` (modify) | 1 | Import the moved helpers |
| `WPT/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets.ts` (+ `.test.ts`) | 2 | Uninstall, verify, delete each chosen dataset, return the failures |
| `WPT/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows.ts` (+ `.test.tsx`) | 3 | One row per imported dataset, plus the hidden count |
| `WPT/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents.ts` (+ `.test.tsx`) | 4 | What reads one dataset: linked datasets and other installs' data slots |
| `WPT/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents.tsx` | 5 | Renders the dependents list under a checked row |
| `WPT/PluginSettingsCard/UninstallPluginModal/UninstallContentRow.tsx` | 5 | One dataset row: checkbox, or the "Kept" reason |
| `WPT/PluginSettingsCard/UninstallPluginModal/useRunUninstall.ts` | 5 | Runs the uninstall, invalidates queries, notifies |
| `WPT/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal.tsx` (+ `.test.tsx`) | 5 | The modal body |
| `WPT/PluginSettingsCard/UninstallPluginModal/openUninstallPluginModal.tsx` | 6 | Opens the modal, returns focus |
| `WPT/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions.ts` (modify) | 6 | New `uninstallWithImportedDatasets` action |
| `WPT/PluginSettingsCard/PluginSettingsCard.tsx`, `PluginActions/PluginActions.tsx`, `PluginActions/PluginActionButton.tsx`, `PluginActions/usePluginActionCopy.ts`, `PluginActions/PluginActions.test.tsx` (modify) | 6 | Route Uninstall to the modal when the plugin has imports |
| `tests/e2e/helpers/mozambiquePackFlow.ts` (create), `tests/e2e/plugins-mozambique-install.spec.ts` (modify), `tests/e2e/plugins-mozambique-uninstall.spec.ts` (create) | 7 | E2E |
| `docs/plugin-authoring.md`, `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md` (modify) | 8 | Docs |
| `src/i18n/locales/*/messages.po`, `messages.ts` | 9 | Strings |

---

### Task 1: Move the two modal helpers out of the install wizard

The uninstall modal needs the same focus return and the same "keep open while running" behavior as the install wizard. Both helpers are private to the wizard today. Move them, unchanged in behavior.

**Files:**
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/returnFocusFromOpener.ts`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/useKeepModalOpenWhile.ts`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/openPluginInstallWizard.tsx`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.tsx`

- [ ] **Step 1: Run the wizard tests as the baseline.**

  Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard`
  Expected: PASS. Note the count.

- [ ] **Step 2: Create `returnFocusFromOpener.ts`.**

  ```ts
  /**
   * Puts focus back where the admin was before a plugin modal opened. The
   * button that opened it may be gone by now, for example when an install or
   * an uninstall changes the card's buttons. Then focus goes to the card's
   * heading, which every card button points to with `aria-describedby`.
   */
  export function returnFocusFromOpener(
    opener: Element | null,
    headingId: string | null,
  ): void {
    const target =
      opener?.isConnected === true
        ? opener
        : headingId === null
          ? null
          : document.getElementById(headingId);
    if (target instanceof HTMLElement) {
      target.focus({ preventScroll: true });
    }
  }
  ```

- [ ] **Step 3: Create `useKeepModalOpenWhile.ts`.**

  ```ts
  import { modals } from "@mantine/modals";
  import { useEffect } from "react";

  /**
   * Keeps a plugin modal open while its work runs, by turning off the modal's
   * Escape key and close button, so the outcome of that work is never lost to
   * a closed modal. Does nothing without a modal id.
   */
  export function useKeepModalOpenWhile(
    isRunning: boolean,
    modalId: string | undefined,
  ): void {
    useEffect(() => {
      if (modalId !== undefined) {
        modals.updateModal({
          modalId,
          closeOnEscape: !isRunning,
          withCloseButton: !isRunning,
        });
      }
    }, [isRunning, modalId]);
  }
  ```

- [ ] **Step 4: Use them in the wizard.** In `openPluginInstallWizard.tsx`, delete `_returnFocusFromOpener` and its docblock, import `returnFocusFromOpener` from `@/views/WorkspaceSettingsPage/WorkspacePluginsTab/returnFocusFromOpener`, and call `returnFocusFromOpener(opener, headingId)` in `onClose`. In `PluginInstallWizard.tsx`, delete the local `useKeepModalOpenWhile` and its docblock, remove the now-unused `useEffect` and `modals` imports if nothing else uses them, and import `useKeepModalOpenWhile` from `@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useKeepModalOpenWhile`. The call site `useKeepModalOpenWhile(isImporting, modalId)` stays the same.

- [ ] **Step 5: Rerun Step 1 and `npx tsc -b`.** Expected: the same tests pass and tsc exits 0.

- [ ] **Step 6: Commit.**

  ```bash
  git add src/views/WorkspaceSettingsPage/WorkspacePluginsTab
  git commit -m "refactor(plugins): share the install wizard's focus and keep-open helpers

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
  ```

---

### Task 2: `uninstallPluginAndDeleteDatasets` (HIGH-RISK: deletes user data)

**Files:**
- Create: `WPT/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets.ts`
- Test: `WPT/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets.test.ts`

Facts this task depends on (verified in the code):
- `PluginInstallationClient.delete({ id })` and the Supabase CRUD client's `delete` do not check rows affected. A delete RLS refuses resolves with no error.
- `PluginInstallationClient.getById({ id })` resolves to the install or `undefined`.
- `DatasetClient.fullDelete({ id })` deletes the parquet and retained original from Storage **before** the `datasets` row.
- `UserClient.canAccessResource({ resourceType: "dataset", resourceId, minRole: "admin" })` is the same rule as the `datasets` DELETE policy.

- [ ] **Step 1: Write the failing tests.**

  ```ts
  import { beforeEach, describe, expect, it, vi } from "vitest";
  import { uninstallPluginAndDeleteDatasets } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets";
  import type { Dataset } from "$/models/datasets/Dataset/Dataset";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

  const mocks = vi.hoisted(() => {
    return {
      deleteInstallation: vi.fn(),
      getInstallationById: vi.fn(),
      fullDelete: vi.fn(),
      canAccessResource: vi.fn(),
      calls: [] as string[],
    };
  });

  vi.mock(
    "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
    () => {
      return {
        PluginInstallationClient: {
          delete: mocks.deleteInstallation,
          getById: mocks.getInstallationById,
        },
      };
    },
  );
  vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
    return { DatasetClient: { fullDelete: mocks.fullDelete } };
  });
  vi.mock("@/clients/UserClient", () => {
    return { UserClient: { canAccessResource: mocks.canAccessResource } };
  });

  const INSTALLATION_ID = "installation-1" as PluginInstallation.Id;
  const PROVINCES = "dataset-provinces" as Dataset.Id;
  const DISTRICTS = "dataset-districts" as Dataset.Id;

  function _run(datasetIds: readonly Dataset.Id[]) {
    return uninstallPluginAndDeleteDatasets({
      installationId: INSTALLATION_ID,
      datasetIds,
    });
  }

  describe("uninstallPluginAndDeleteDatasets", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.calls = [];
      mocks.deleteInstallation.mockImplementation(async () => {
        mocks.calls.push("uninstall");
      });
      mocks.getInstallationById.mockResolvedValue(undefined);
      mocks.canAccessResource.mockResolvedValue(true);
      mocks.fullDelete.mockImplementation(async ({ id }: { id: string }) => {
        mocks.calls.push(`delete ${id}`);
      });
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("uninstalls before it deletes any dataset, then deletes in the order given", async () => {
      const outcome = await _run([PROVINCES, DISTRICTS]);

      expect(mocks.calls).toEqual([
        "uninstall",
        `delete ${PROVINCES}`,
        `delete ${DISTRICTS}`,
      ]);
      expect(outcome).toEqual({ failedDatasetIds: [] });
    });

    it("deletes nothing when the uninstall throws", async () => {
      mocks.deleteInstallation.mockRejectedValue(new Error("network down"));

      await expect(_run([PROVINCES])).rejects.toThrow("network down");
      expect(mocks.fullDelete).not.toHaveBeenCalled();
    });

    it("deletes nothing when the install is still there after a delete that did not throw", async () => {
      mocks.getInstallationById.mockResolvedValue({ id: INSTALLATION_ID });

      await expect(_run([PROVINCES])).rejects.toThrow(
        /was not uninstalled/,
      );
      expect(mocks.fullDelete).not.toHaveBeenCalled();
    });

    it("goes on after a failed delete and returns it", async () => {
      mocks.fullDelete.mockImplementation(async ({ id }: { id: string }) => {
        if (id === PROVINCES) {
          throw new Error("storage down");
        }
      });

      const outcome = await _run([PROVINCES, DISTRICTS]);

      expect(mocks.fullDelete).toHaveBeenCalledWith({ id: DISTRICTS });
      expect(outcome).toEqual({ failedDatasetIds: [PROVINCES] });
    });

    it("never calls fullDelete for a dataset the user may no longer delete", async () => {
      mocks.canAccessResource.mockImplementation(
        async ({ resourceId }: { resourceId: string }) => {
          return resourceId !== PROVINCES;
        },
      );

      const outcome = await _run([PROVINCES, DISTRICTS]);

      expect(mocks.fullDelete).not.toHaveBeenCalledWith({ id: PROVINCES });
      expect(mocks.fullDelete).toHaveBeenCalledWith({ id: DISTRICTS });
      expect(outcome).toEqual({ failedDatasetIds: [PROVINCES] });
    });

    it("checks admin access on the dataset itself", async () => {
      await _run([PROVINCES]);

      expect(mocks.canAccessResource).toHaveBeenCalledWith({
        resourceType: "dataset",
        resourceId: PROVINCES,
        minRole: "admin",
      });
    });

    it("counts an access check that throws as a failure and does not delete", async () => {
      mocks.canAccessResource.mockRejectedValue(new Error("rpc failed"));

      const outcome = await _run([PROVINCES]);

      expect(mocks.fullDelete).not.toHaveBeenCalled();
      expect(outcome).toEqual({ failedDatasetIds: [PROVINCES] });
    });
  });
  ```

  If the repo's `Logger` (`@/utils/Logger`) does not write through `console.error`, keep the spy anyway: it costs nothing and keeps the output clean if it does.

- [ ] **Step 2: Run it.** `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement.**

  ```ts
  import { promiseMapSequential } from "@avandar/utils";
  import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
  import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
  import { UserClient } from "@/clients/UserClient";
  import { Logger } from "@/utils/Logger";
  import type { Dataset } from "$/models/datasets/Dataset/Dataset";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

  /** What an uninstall left behind: the chosen datasets it could not delete. */
  export type UninstallOutcome = Readonly<{
    failedDatasetIds: readonly Dataset.Id[];
  }>;

  /**
   * Deletes the install and proves it is gone. The CRUD client's delete does
   * not report how many rows it removed, so a delete that RLS refuses would
   * otherwise look like a success.
   */
  async function _deleteInstallationOrThrow(
    installationId: PluginInstallation.Id,
  ): Promise<void> {
    await PluginInstallationClient.delete({ id: installationId });
    const remaining = await PluginInstallationClient.getById({
      id: installationId,
    });
    if (remaining !== undefined) {
      throw new Error(
        `Plugin install ${installationId} was not uninstalled. The current user may not be allowed to uninstall plugins.`,
      );
    }
  }

  /**
   * Deletes one dataset if the user may still delete it, and says whether it
   * was deleted. The access check comes first because `fullDelete` removes
   * the dataset's files before its row: a row that RLS refuses to delete
   * would be left with no data.
   */
  async function _deleteDatasetIfAllowed(
    datasetId: Dataset.Id,
  ): Promise<boolean> {
    try {
      const canDelete = await UserClient.canAccessResource({
        resourceType: "dataset",
        resourceId: datasetId,
        minRole: "admin",
      });
      if (!canDelete) {
        return false;
      }
      await DatasetClient.fullDelete({ id: datasetId });
      return true;
    } catch (error) {
      Logger.error("Could not delete a dataset while uninstalling a plugin", {
        datasetId,
        error,
      });
      return false;
    }
  }

  /**
   * Uninstalls a plugin, then deletes the datasets the admin chose, one at a
   * time in the order given. The uninstall modal on a plugin's card calls it.
   * Nothing is deleted unless the install is gone. A dataset that cannot be
   * deleted does not stop the others, and is returned so the admin can be
   * told it is still in Data Sources.
   */
  export async function uninstallPluginAndDeleteDatasets(
    options: Readonly<{
      installationId: PluginInstallation.Id;
      datasetIds: readonly Dataset.Id[];
    }>,
  ): Promise<UninstallOutcome> {
    await _deleteInstallationOrThrow(options.installationId);
    const results = await promiseMapSequential(
      options.datasetIds,
      async (datasetId) => {
        return {
          datasetId,
          isDeleted: await _deleteDatasetIfAllowed(datasetId),
        };
      },
    );
    return {
      failedDatasetIds: results
        .filter((result) => {
          return !result.isDeleted;
        })
        .map((result) => {
          return result.datasetId;
        }),
    };
  }
  ```

  Check `Logger.error`'s signature in `src/utils/Logger` (it is called as `Logger.error(message, { error })` in `getVirtualRelationDefinitions.ts`). Check that `PluginInstallation.Id` is the type `PluginInstallationClient.delete` takes. If it takes a different id type, follow it.

- [ ] **Step 4: Run Step 2 again.** Expected: PASS, 7 tests.

- [ ] **Step 5: Commit.** `feat(plugins): uninstall a plugin and delete the datasets an admin chose`

---

### Task 3: `useUninstallContentRows`

**Files:**
- Create: `WPT/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows.ts`
- Test: `.../useUninstallContentRows/useUninstallContentRows.test.tsx`

- [ ] **Step 1: Write the failing tests.** Mock the three inputs, following `usePluginContentImports.test.tsx` for the wrapper (`TestProviders` plus a fresh `QueryClient`).

  ```tsx
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { beforeEach, describe, expect, it, vi } from "vitest";
  import { renderHook, TestProviders, waitFor } from "@/test-utils";
  import { useUninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
  import type { ReactNode } from "react";

  const mocks = vi.hoisted(() => {
    return {
      importsByContentId: {} as Record<string, { datasetId: string }>,
      datasets: [] as Array<{ id: string; name: string }>,
      canAccessResource: vi.fn(),
    };
  });

  vi.mock(
    "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent",
    () => {
      return {
        useImportedPluginContent: () => {
          return {
            importsByContentId: mocks.importsByContentId,
            isLoading: false,
          };
        },
      };
    },
  );
  vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
    return {
      DatasetClient: {
        useGetAll: () => {
          return [mocks.datasets, false];
        },
      },
    };
  });
  vi.mock("@/clients/UserClient", () => {
    return { UserClient: { canAccessResource: mocks.canAccessResource } };
  });

  let queryClient: QueryClient;

  function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <TestProviders>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </TestProviders>
    );
  }

  function _renderRows() {
    return renderHook(
      () => {
        return useUninstallContentRows("avandar.mozambique");
      },
      { wrapper: Wrapper },
    );
  }

  describe("useUninstallContentRows", () => {
    beforeEach(() => {
      queryClient = new QueryClient();
      mocks.importsByContentId = {
        provinces: { datasetId: "dataset-provinces" },
        districts: { datasetId: "dataset-districts" },
      };
      mocks.datasets = [
        { id: "dataset-provinces", name: "Provinces (renamed)" },
        { id: "dataset-districts", name: "Districts" },
      ];
      mocks.canAccessResource.mockReset();
      mocks.canAccessResource.mockResolvedValue(true);
    });

    it("names each row after the dataset's current name, sorted by name", async () => {
      const { result } = _renderRows();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(
        result.current.rows.map((row) => {
          return row.name;
        }),
      ).toEqual(["Districts", "Provinces (renamed)"]);
    });

    it("marks a dataset the user may not delete", async () => {
      mocks.canAccessResource.mockImplementation(
        async ({ resourceId }: { resourceId: string }) => {
          return resourceId === "dataset-districts";
        },
      );

      const { result } = _renderRows();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.rows).toEqual([
        { datasetId: "dataset-districts", name: "Districts", canDelete: true },
        {
          datasetId: "dataset-provinces",
          name: "Provinces (renamed)",
          canDelete: false,
        },
      ]);
    });

    it("counts imports whose dataset the user cannot read instead of naming them", async () => {
      mocks.datasets = [{ id: "dataset-districts", name: "Districts" }];

      const { result } = _renderRows();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.rows).toHaveLength(1);
      expect(result.current.hiddenCount).toBe(1);
    });

    it("treats a failed access check as not deletable", async () => {
      mocks.canAccessResource.mockRejectedValue(new Error("rpc failed"));

      const { result } = _renderRows();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(
        result.current.rows.every((row) => {
          return !row.canDelete;
        }),
      ).toBe(true);
    });
  });
  ```

  Set `retry: false` on the test `QueryClient` (`new QueryClient({ defaultOptions: { queries: { retry: false } } })`) so the failed-check test does not wait on retries.

- [ ] **Step 2: Run.** `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement.**

  ```ts
  import { useQueries } from "@tanstack/react-query";
  import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
  import { UserClient } from "@/clients/UserClient";
  import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
  import type { Dataset } from "$/models/datasets/Dataset/Dataset";

  /** One imported dataset as the uninstall modal lists it. */
  export type UninstallContentRow = Readonly<{
    datasetId: Dataset.Id;

    /** The dataset's current name, which may differ after a rename. */
    name: string;

    /** Whether the current user may delete the dataset. */
    canDelete: boolean;
  }>;

  /** The datasets a plugin imported, as the uninstall modal lists them. */
  export type UninstallContentRows = Readonly<{
    rows: readonly UninstallContentRow[];

    /** Imports whose dataset the current user cannot read. */
    hiddenCount: number;
    isLoading: boolean;
  }>;

  /**
   * Whether the user may delete each dataset, by the same rule as the
   * `datasets` DELETE policy. A failed check reads as not allowed.
   */
  function _useCanDeleteByDatasetId(datasetIds: readonly Dataset.Id[]): {
    canDeleteById: ReadonlyMap<Dataset.Id, boolean>;
    isLoading: boolean;
  } {
    const results = useQueries({
      queries: datasetIds.map((datasetId) => {
        return {
          queryKey: ["plugins", "uninstall", "canDeleteDataset", datasetId],
          queryFn: () => {
            return UserClient.canAccessResource({
              resourceType: "dataset",
              resourceId: datasetId,
              minRole: "admin",
            });
          },
          staleTime: 0,
          meta: { persist: false },
        };
      }),
    });
    return {
      canDeleteById: new Map(
        datasetIds.map((datasetId, index) => {
          return [datasetId, results[index]?.data === true];
        }),
      ),
      isLoading: results.some((result) => {
        return result.isPending && result.fetchStatus !== "idle";
      }),
    };
  }

  /**
   * The datasets a plugin imported into the current workspace, named as they
   * are now, with whether the current user may delete each one. Imports whose
   * dataset the user cannot read are only counted. The uninstall modal lists
   * these rows.
   */
  export function useUninstallContentRows(
    pluginId: string,
  ): UninstallContentRows {
    const imported = useImportedPluginContent(pluginId);
    const importedIds = Object.values(imported.importsByContentId).map(
      (contentImport) => {
        return contentImport.datasetId;
      },
    );
    const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
      where: { id: { in: importedIds } },
      useQueryOptions: { enabled: importedIds.length > 0 },
    });
    const readable = datasets ?? [];
    const access = _useCanDeleteByDatasetId(
      readable.map((dataset) => {
        return dataset.id;
      }),
    );
    return {
      rows: readable
        .map((dataset) => {
          return {
            datasetId: dataset.id,
            name: dataset.name,
            canDelete: access.canDeleteById.get(dataset.id) === true,
          };
        })
        .sort((left, right) => {
          return left.name.localeCompare(right.name);
        }),
      hiddenCount: importedIds.length - readable.length,
      isLoading:
        imported.isLoading ||
        (importedIds.length > 0 && isLoadingDatasets) ||
        access.isLoading,
    };
  }
  ```

  Check `DatasetClient.useGetAll`'s options shape against `src/components/DatasetColumnPickerList.tsx:89` and `useLinkedDatasets.ts:67-72`, and whether `meta: { persist: false }` is the repo's way to skip persisting a query (see `useBundledPluginManifests.ts`). An access answer must never be served from a persisted cache, so keep it unpersisted. If the file grows past 45 lines in one function, extract the row mapping into `_makeRowsFromDatasets`.

- [ ] **Step 4: Run Step 2 again.** Expected: PASS, 4 tests.

- [ ] **Step 5: Commit.** `feat(plugins): list a plugin's imported datasets for uninstall`

---

### Task 4: `useDatasetDependents`

**Files:**
- Create: `WPT/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents.ts`
- Test: `.../useDatasetDependents/useDatasetDependents.test.tsx`

- [ ] **Step 1: Write the failing tests.** Mock `useLinkedDatasets`, `PluginDataSlotBindingClient.useGetAll`, `PluginInstallationClient.useGetAll`, `useBundledPluginManifests`, and `useCurrentWorkspace`.

  ```tsx
  import { describe, expect, it, vi, beforeEach } from "vitest";
  import { renderHook, TestProviders } from "@/test-utils";
  import { useDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
  import type { Dataset } from "$/models/datasets/Dataset/Dataset";

  const mocks = vi.hoisted(() => {
    return {
      linkedDatasets: [] as Array<{ id: string; name: string }>,
      bindings: [] as Array<{ id: string; installationId: string; slotId: string }>,
      installations: [] as Array<{ id: string; pluginId: string }>,
    };
  });

  vi.mock("@/hooks/datasets/useLinkedDatasets/useLinkedDatasets", () => {
    return {
      useLinkedDatasets: () => {
        return { linkedDatasets: mocks.linkedDatasets, isLoading: false };
      },
    };
  });
  vi.mock(
    "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient",
    () => {
      return {
        PluginDataSlotBindingClient: {
          useGetAll: () => {
            return [mocks.bindings, false];
          },
        },
      };
    },
  );
  vi.mock(
    "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
    () => {
      return {
        PluginInstallationClient: {
          useGetAll: () => {
            return [mocks.installations, false];
          },
        },
      };
    },
  );
  vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
    return {
      useCurrentWorkspace: () => {
        return { id: "workspace-id" };
      },
    };
  });
  vi.mock(
    "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useBundledPluginManifests",
    () => {
      return {
        useBundledPluginManifests: () => {
          return [
            {
              hasFailures: false,
              manifestModules: [
                {
                  manifest: {
                    id: "avandar.epidemiology",
                    name: "%plugin.name%",
                    dataSlots: { cases: { title: "%slot.cases.title%" } },
                  },
                  strings: {
                    en: { "plugin.name": "Epidemiology", "slot.cases.title": "Cases" },
                  },
                },
              ],
            },
            false,
          ];
        },
      };
    },
  );

  const UNINSTALLING = "installation-mozambique" as PluginInstallation.Id;

  function _renderDependents() {
    return renderHook(
      () => {
        return useDatasetDependents({
          datasetId: "dataset-districts" as Dataset.Id,
          installationId: UNINSTALLING,
        });
      },
      { wrapper: TestProviders },
    );
  }

  describe("useDatasetDependents", () => {
    beforeEach(() => {
      mocks.linkedDatasets = [];
      mocks.bindings = [];
      mocks.installations = [
        { id: "installation-epi", pluginId: "avandar.epidemiology" },
        { id: "installation-other", pluginId: "acme.unbundled" },
        { id: UNINSTALLING, pluginId: "avandar.mozambique" },
      ];
    });

    it("lists the linked datasets that read the dataset", () => {
      mocks.linkedDatasets = [{ id: "linked-1", name: "Districts with population" }];

      const { result } = _renderDependents();

      expect(result.current.dependents).toEqual([
        { key: "linked-1", kind: "linkedDataset", label: "Districts with population" },
      ]);
    });

    it("labels another plugin's data slot with the plugin and slot names", () => {
      mocks.bindings = [
        { id: "binding-1", installationId: "installation-epi", slotId: "cases" },
      ];

      const { result } = _renderDependents();

      expect(result.current.dependents).toEqual([
        { key: "binding-1", kind: "dataSlot", label: "Epidemiology: Cases" },
      ]);
    });

    it("leaves out the bindings of the plugin being uninstalled", () => {
      mocks.bindings = [
        { id: "binding-own", installationId: UNINSTALLING, slotId: "boundaries" },
      ];

      const { result } = _renderDependents();

      expect(result.current.dependents).toEqual([]);
    });

    it("falls back to the plugin id and slot id for a plugin with no manifest in this build", () => {
      mocks.bindings = [
        { id: "binding-2", installationId: "installation-other", slotId: "rows" },
      ];

      const { result } = _renderDependents();

      expect(result.current.dependents).toEqual([
        { key: "binding-2", kind: "dataSlot", label: "acme.unbundled: rows" },
      ]);
    });
  });
  ```

  `TestProviders` must provide Lingui in English. If it does not, wrap with whatever the neighbouring hook tests use.

- [ ] **Step 2: Run.** `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents`. Expected: FAIL.

- [ ] **Step 3: Implement.**

  ```ts
  import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
  import { useLingui } from "@lingui/react/macro";
  import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
  import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
  import { useLinkedDatasets } from "@/hooks/datasets/useLinkedDatasets/useLinkedDatasets";
  import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
  import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
  import { useBundledPluginManifests } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useBundledPluginManifests";
  import type { Dataset } from "$/models/datasets/Dataset/Dataset";
  import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
  import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

  /** One thing that reads a dataset and stops working once it is deleted. */
  export type DatasetDependent = Readonly<{
    key: string;
    kind: "linkedDataset" | "dataSlot";
    label: string;
  }>;

  /**
   * Names a data slot binding as "<plugin>: <slot>" in the reader's language,
   * or by the plugin id and slot id when this build has no manifest for it.
   */
  function _makeSlotLabelFromBinding(
    options: Readonly<{
      binding: PluginDataSlotBinding.T;
      pluginId: string;
      manifestModule: PluginManifestModule | undefined;
      locale: string;
      t: (pluginName: string, slotTitle: string) => string;
    }>,
  ): string {
    const { binding, pluginId, manifestModule, locale } = options;
    if (manifestModule === undefined) {
      return options.t(pluginId, binding.slotId);
    }
    const { manifest, strings } = manifestModule;
    const slot = getOwnValue(manifest.dataSlots, binding.slotId);
    const localize = (value: string): string => {
      return getLocalizedTextFromManifestStrings({ strings, locale, value });
    };
    return options.t(
      localize(manifest.name),
      slot === undefined ? binding.slotId : localize(slot.title),
    );
  }

  /** Other installs' data slots that read the dataset, labelled. */
  function _useDataSlotDependents(
    options: Readonly<{
      datasetId: Dataset.Id;
      installationId: PluginInstallation.Id;
    }>,
  ): { dependents: DatasetDependent[]; isLoading: boolean } {
    const { t, i18n } = useLingui();
    const workspace = useCurrentWorkspace();
    const [bindings, isLoadingBindings] = PluginDataSlotBindingClient.useGetAll({
      where: { dataset_id: { eq: options.datasetId } },
    });
    const [installations, isLoadingInstallations] =
      PluginInstallationClient.useGetAll({
        where: { workspace_id: { eq: workspace.id } },
      });
    const [loadedManifests] = useBundledPluginManifests();
    const dependents = (bindings ?? [])
      .filter((binding) => {
        return binding.installationId !== options.installationId;
      })
      .map((binding) => {
        const pluginId =
          installations?.find((installation) => {
            return installation.id === binding.installationId;
          })?.pluginId ?? binding.installationId;
        return {
          key: binding.id,
          kind: "dataSlot" as const,
          label: _makeSlotLabelFromBinding({
            binding,
            pluginId,
            manifestModule: loadedManifests?.manifestModules.find((module) => {
              return module.manifest.id === pluginId;
            }),
            locale: i18n.locale,
            t: (pluginName, slotTitle) => {
              return t`${pluginName}: ${slotTitle}`;
            },
          }),
        };
      });
    return { dependents, isLoading: isLoadingBindings || isLoadingInstallations };
  }

  /**
   * What reads one dataset and stops working once it is deleted: the linked
   * datasets that read it, and other plugins' data slots bound to it. The
   * install being uninstalled is left out, since its bindings go with it.
   * The uninstall modal shows these under each dataset marked for deletion.
   */
  export function useDatasetDependents(
    options: Readonly<{
      datasetId: Dataset.Id;
      installationId: PluginInstallation.Id;
    }>,
  ): { dependents: readonly DatasetDependent[]; isLoading: boolean } {
    const linked = useLinkedDatasets(options.datasetId);
    const slots = _useDataSlotDependents(options);
    return {
      dependents: [
        ...linked.linkedDatasets.map((linkedDataset) => {
          return {
            key: linkedDataset.id,
            kind: "linkedDataset" as const,
            label: linkedDataset.name,
          };
        }),
        ...slots.dependents,
      ],
      isLoading: linked.isLoading || slots.isLoading,
    };
  }
  ```

  `_useDataSlotDependents` is close to the 45-line limit. If it goes over, extract the `.map` callback into `_makeSlotDependentFromBinding`. Check the `where` shape `PluginDataSlotBindingClient.useGetAll` takes (it is a generated CRUD client like `PluginContentImportClient`, so snake_case columns). If a binding's `installationId` is not in `installations` (it should always be), the fallback label uses the installation id.

- [ ] **Step 4: Run Step 2 again.** Expected: PASS, 4 tests.

- [ ] **Step 5: Commit.** `feat(plugins): find what reads a dataset before it is deleted at uninstall`

---

### Task 5: The uninstall modal

**Files:**
- Create: `WPT/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents.tsx`
- Create: `WPT/PluginSettingsCard/UninstallPluginModal/UninstallContentRow.tsx`
- Create: `WPT/PluginSettingsCard/UninstallPluginModal/useRunUninstall.ts`
- Create: `WPT/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal.tsx`
- Test: `WPT/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal.test.tsx`

- [ ] **Step 1: Write the failing component tests.** Mock `useUninstallContentRows`, `UninstallDatasetDependents` (render a marker), `uninstallPluginAndDeleteDatasets`, `useKeepModalOpenWhile`, and `@/utils/notifications/notify`.

  ```tsx
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { beforeEach, describe, expect, it, vi } from "vitest";
  import { fireEvent, render, screen, TestProviders, waitFor } from "@/test-utils";
  import { UninstallPluginModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

  const mocks = vi.hoisted(() => {
    return {
      rows: [] as Array<{ datasetId: string; name: string; canDelete: boolean }>,
      hiddenCount: 0,
      uninstall: vi.fn(),
      keepOpen: vi.fn(),
      notifySuccess: vi.fn(),
      notifyWarning: vi.fn(),
      notifyError: vi.fn(),
      onClose: vi.fn(),
    };
  });

  vi.mock(
    "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows",
    () => {
      return {
        useUninstallContentRows: () => {
          return {
            rows: mocks.rows,
            hiddenCount: mocks.hiddenCount,
            isLoading: false,
          };
        },
      };
    },
  );
  vi.mock(
    "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents",
    () => {
      return {
        UninstallDatasetDependents: ({ datasetId }: { datasetId: string }) => {
          return <p>{`dependents of ${datasetId}`}</p>;
        },
      };
    },
  );
  vi.mock(
    "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets",
    () => {
      return { uninstallPluginAndDeleteDatasets: mocks.uninstall };
    },
  );
  vi.mock(
    "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useKeepModalOpenWhile",
    () => {
      return { useKeepModalOpenWhile: mocks.keepOpen };
    },
  );
  vi.mock("@/utils/notifications/notify", () => {
    return {
      notifySuccess: mocks.notifySuccess,
      notifyWarning: mocks.notifyWarning,
      notifyError: mocks.notifyError,
    };
  });

  function _renderModal(): void {
    const queryClient = new QueryClient();
    render(
      <TestProviders>
        <QueryClientProvider client={queryClient}>
          <UninstallPluginModal
            pluginName="Mozambique"
            pluginId="avandar.mozambique"
            installationId={"installation-1" as PluginInstallation.Id}
            modalId="modal-1"
            onClose={mocks.onClose}
          />
        </QueryClientProvider>
      </TestProviders>,
    );
  }

  describe("UninstallPluginModal", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.rows = [
        { datasetId: "dataset-districts", name: "Mozambique districts", canDelete: true },
        { datasetId: "dataset-provinces", name: "Mozambique provinces", canDelete: true },
        { datasetId: "dataset-facilities", name: "Health facilities", canDelete: false },
      ];
      mocks.hiddenCount = 0;
      mocks.uninstall.mockResolvedValue({ failedDatasetIds: [] });
    });

    it("starts with every dataset kept", () => {
      _renderModal();

      screen.getAllByRole("checkbox").forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
      expect(screen.getByRole("button", { name: "Uninstall" })).toBeEnabled();
    });

    it("gives a dataset the user cannot delete no checkbox and says why", () => {
      _renderModal();

      expect(
        screen.queryByRole("checkbox", { name: "Delete Health facilities" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("Kept. Only a dataset admin can delete it."),
      ).toBeInTheDocument();
    });

    it("counts the datasets the user cannot see", () => {
      mocks.hiddenCount = 2;

      _renderModal();

      expect(
        screen.getByText("2 more datasets you can't see stay."),
      ).toBeInTheDocument();
    });

    it("shows what reads a dataset only once it is checked, and names the count on the button", () => {
      _renderModal();
      expect(
        screen.queryByText("dependents of dataset-districts"),
      ).not.toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("checkbox", { name: "Delete Mozambique districts" }),
      );

      expect(
        screen.getByText("dependents of dataset-districts"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
      ).toBeInTheDocument();
    });

    it("uninstalls and deletes the checked datasets in the order shown, then closes", async () => {
      _renderModal();
      fireEvent.click(
        screen.getByRole("checkbox", { name: "Delete Mozambique provinces" }),
      );
      fireEvent.click(
        screen.getByRole("checkbox", { name: "Delete Mozambique districts" }),
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Uninstall and delete 2 datasets" }),
      );

      await waitFor(() => {
        expect(mocks.onClose).toHaveBeenCalledTimes(1);
      });
      expect(mocks.uninstall).toHaveBeenCalledWith({
        installationId: "installation-1",
        datasetIds: ["dataset-districts", "dataset-provinces"],
      });
      expect(mocks.notifySuccess).toHaveBeenCalledWith({
        title: "Mozambique uninstalled",
        message: "2 datasets deleted.",
      });
    });

    it("keeps the modal open and the buttons disabled while it runs", async () => {
      let finish: (value: { failedDatasetIds: string[] }) => void = () => {};
      mocks.uninstall.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      _renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

      await waitFor(() => {
        expect(mocks.keepOpen).toHaveBeenLastCalledWith(true, "modal-1");
      });
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      finish({ failedDatasetIds: [] });
      await waitFor(() => {
        expect(mocks.onClose).toHaveBeenCalled();
      });
    });

    it("warns with the names of the datasets it could not delete", async () => {
      mocks.uninstall.mockResolvedValue({
        failedDatasetIds: ["dataset-districts"],
      });
      _renderModal();
      fireEvent.click(
        screen.getByRole("checkbox", { name: "Delete Mozambique districts" }),
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
      );

      await waitFor(() => {
        expect(mocks.notifyWarning).toHaveBeenCalledWith({
          title: "Mozambique uninstalled",
          message:
            "These datasets could not be deleted and are still in Data Sources: Mozambique districts",
        });
      });
    });

    it("stays open and reports the error when the uninstall fails", async () => {
      mocks.uninstall.mockRejectedValue(new Error("not allowed"));
      _renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

      await waitFor(() => {
        expect(mocks.notifyError).toHaveBeenCalledWith({
          title: "Could not update Mozambique",
          message: "not allowed",
        });
      });
      expect(mocks.onClose).not.toHaveBeenCalled();
    });

    it("says only that the plugin was uninstalled when nothing was deleted", async () => {
      _renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

      await waitFor(() => {
        expect(mocks.notifySuccess).toHaveBeenCalledWith(
          "Mozambique uninstalled",
        );
      });
    });
  });
  ```

- [ ] **Step 2: Run.** `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal.test.tsx`. Expected: FAIL (module missing).

- [ ] **Step 3: `UninstallDatasetDependents.tsx`.**

  ```tsx
  import { Trans, useLingui } from "@lingui/react/macro";
  import { List, Loader, Stack, Text } from "@mantine/core";
  import { useDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents";
  import type { Dataset } from "$/models/datasets/Dataset/Dataset";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

  type Props = Readonly<{
    datasetId: Dataset.Id;

    /** The install being uninstalled, whose own bindings are left out. */
    installationId: PluginInstallation.Id;
  }>;

  /**
   * Under a dataset marked for deletion in the uninstall modal, what reads it
   * and stops working once it is deleted. Renders nothing when nothing does.
   */
  export function UninstallDatasetDependents({
    datasetId,
    installationId,
  }: Props): JSX.Element | null {
    const { t } = useLingui();
    const { dependents, isLoading } = useDatasetDependents({
      datasetId,
      installationId,
    });
    if (isLoading) {
      return (
        <Loader
          size="xs"
          role="status"
          aria-label={t`Checking what reads this dataset`}
        />
      );
    }
    if (dependents.length === 0) {
      return null;
    }
    return (
      <Stack gap="xxs">
        <Text size="sm">
          <Trans>These read it and stop working once it is deleted:</Trans>
        </Text>
        <List size="sm">
          {dependents.map(({ key, kind, label }) => {
            return (
              <List.Item key={key}>
                {kind === "linkedDataset"
                  ? t`${label} (linked dataset)`
                  : t`${label} (data slot)`}
              </List.Item>
            );
          })}
        </List>
      </Stack>
    );
  }
  ```

- [ ] **Step 4: `UninstallContentRow.tsx`.**

  ```tsx
  import { useLingui } from "@lingui/react/macro";
  import { Checkbox, Stack, Text } from "@mantine/core";
  import { UninstallDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
  import type { UninstallContentRow as Row } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";

  type Props = Readonly<{
    row: Row;
    installationId: PluginInstallation.Id;
    isChecked: boolean;
    isDisabled: boolean;
    onIsCheckedChange: (isChecked: boolean) => void;
  }>;

  /**
   * One dataset a plugin imported, in the uninstall modal: a "Delete <name>"
   * checkbox and, while it is checked, what reads the dataset. A dataset the
   * user may not delete shows its name and why it is kept instead.
   */
  export function UninstallContentRow({
    row,
    installationId,
    isChecked,
    isDisabled,
    onIsCheckedChange,
  }: Props): JSX.Element {
    const { t } = useLingui();
    const { name } = row;
    if (!row.canDelete) {
      return (
        <Stack gap={0}>
          <Text size="sm">{name}</Text>
          <Text size="xs" c="dimmed">
            {t`Kept. Only a dataset admin can delete it.`}
          </Text>
        </Stack>
      );
    }
    return (
      <Stack gap="xxs">
        <Checkbox
          label={t`Delete ${name}`}
          checked={isChecked}
          disabled={isDisabled}
          onChange={(event) => {
            onIsCheckedChange(event.currentTarget.checked);
          }}
        />
        {isChecked ? (
          <Stack pl="xl">
            <UninstallDatasetDependents
              datasetId={row.datasetId}
              installationId={installationId}
            />
          </Stack>
        ) : null}
      </Stack>
    );
  }
  ```

- [ ] **Step 5: `useRunUninstall.ts`.**

  ```ts
  import { plural } from "@lingui/core/macro";
  import { useLingui } from "@lingui/react/macro";
  import { useQueryClient } from "@tanstack/react-query";
  import { useState } from "react";
  import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
  import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
  import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
  import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
  import { notifyError, notifySuccess, notifyWarning } from "@/utils/notifications/notify";
  import { uninstallPluginAndDeleteDatasets } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets";
  import type { Dataset } from "$/models/datasets/Dataset/Dataset";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
  import type { UninstallContentRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
  import type { QueryClient } from "@tanstack/react-query";

  /** Refreshes every list an uninstall can change, such as Data Sources. */
  function _invalidateUninstallQueries(queryClient: QueryClient): void {
    [
      PluginInstallationClient.QueryKeys.getAll(),
      PluginContentImportClient.QueryKeys.getAll(),
      PluginDataSlotBindingClient.QueryKeys.getAll(),
      DatasetClient.QueryKeys.getAll(),
    ].forEach((queryKey) => {
      void queryClient.invalidateQueries({ queryKey });
    });
  }

  /** Says how the uninstall went, naming any dataset it could not delete. */
  function useNotifyUninstallOutcome(
    pluginName: string,
  ): (options: { deletedCount: number; failedNames: string[] }) => void {
    const { t, i18n } = useLingui();
    return ({ deletedCount, failedNames }) => {
      const title = t`${pluginName} uninstalled`;
      if (failedNames.length > 0) {
        const names = new Intl.ListFormat(i18n.locale, {
          type: "conjunction",
        }).format(failedNames);
        notifyWarning({
          title,
          message: t`These datasets could not be deleted and are still in Data Sources: ${names}`,
        });
        return;
      }
      if (deletedCount === 0) {
        notifySuccess(title);
        return;
      }
      notifySuccess({
        title,
        message: plural(deletedCount, {
          one: "# dataset deleted.",
          other: "# datasets deleted.",
        }),
      });
    };
  }

  /**
   * Runs an uninstall from the uninstall modal: uninstalls, deletes the
   * chosen datasets, refreshes the lists they appear in, says how it went,
   * and closes the modal. When the uninstall itself fails, it says so and
   * leaves the modal open.
   */
  export function useRunUninstall(
    options: Readonly<{
      pluginName: string;
      installationId: PluginInstallation.Id;
      rows: readonly UninstallContentRow[];
      onDone: () => void;
    }>,
  ): { run: (datasetIds: readonly Dataset.Id[]) => Promise<void>; isRunning: boolean } {
    const { t } = useLingui();
    const { pluginName } = options;
    const queryClient = useQueryClient();
    const notifyOutcome = useNotifyUninstallOutcome(pluginName);
    const [isRunning, setIsRunning] = useState(false);
    const run = async (datasetIds: readonly Dataset.Id[]): Promise<void> => {
      setIsRunning(true);
      try {
        const { failedDatasetIds } = await uninstallPluginAndDeleteDatasets({
          installationId: options.installationId,
          datasetIds,
        });
        _invalidateUninstallQueries(queryClient);
        notifyOutcome({
          deletedCount: datasetIds.length - failedDatasetIds.length,
          failedNames: options.rows
            .filter((row) => {
              return failedDatasetIds.includes(row.datasetId);
            })
            .map((row) => {
              return row.name;
            }),
        });
        options.onDone();
      } catch (error) {
        notifyError({
          title: t`Could not update ${pluginName}`,
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsRunning(false);
      }
    };
    return { run, isRunning };
  }
  ```

  `t\`${pluginName} uninstalled\`` and `t\`Could not update ${pluginName}\`` reuse the message ids `usePluginInstallationMutations.ts` already has, so they need no new translation. `useRunUninstall` is over 45 lines with its signature. If lint or review flags it, move `run`'s body into `_runUninstall({ ... })` above the hook.

- [ ] **Step 6: `UninstallPluginModal.tsx`.**

  ```tsx
  import { plural } from "@lingui/core/macro";
  import { useLingui } from "@lingui/react/macro";
  import { Button, Group, Loader, Stack, Text, Title } from "@mantine/core";
  import { useState } from "react";
  import { UninstallContentRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallContentRow";
  import { useRunUninstall } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useRunUninstall";
  import { useUninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
  import { useKeepModalOpenWhile } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useKeepModalOpenWhile";
  import type { Dataset } from "$/models/datasets/Dataset/Dataset";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

  type Props = Readonly<{
    pluginName: string;
    pluginId: string;
    installationId: PluginInstallation.Id;

    /** The modal this is in, kept open while the uninstall runs. */
    modalId: string;
    onClose: () => void;
  }>;

  function _getConfirmLabel(checkedCount: number, uninstallLabel: string): string {
    return checkedCount === 0
      ? uninstallLabel
      : plural(checkedCount, {
          one: "Uninstall and delete # dataset",
          other: "Uninstall and delete # datasets",
        });
  }

  /**
   * The uninstall dialog of a plugin that imported datasets into the
   * workspace. It lists them, every one kept unless the admin checks it for
   * deletion, then uninstalls and deletes the checked ones. Opened by
   * `openUninstallPluginModal` from the plugin's card.
   */
  export function UninstallPluginModal(props: Props): JSX.Element {
    const { t } = useLingui();
    const content = useUninstallContentRows(props.pluginId);
    const [checkedIds, setCheckedIds] = useState<ReadonlySet<Dataset.Id>>(
      new Set(),
    );
    const uninstaller = useRunUninstall({
      pluginName: props.pluginName,
      installationId: props.installationId,
      rows: content.rows,
      onDone: props.onClose,
    });
    useKeepModalOpenWhile(uninstaller.isRunning, props.modalId);
    const { hiddenCount } = content;
    return (
      <Stack gap="md">
        <Text size="sm">{t`Its features are removed from this workspace.`}</Text>
        <Title order={3} size="h6">{t`Datasets it imported`}</Title>
        {content.isLoading ? (
          <Loader size="sm" role="status" aria-label={t`Loading datasets`} />
        ) : (
          <Stack gap="sm" role="group" aria-label={t`Datasets it imported`}>
            {content.rows.map((row) => {
              return (
                <UninstallContentRow
                  key={row.datasetId}
                  row={row}
                  installationId={props.installationId}
                  isChecked={checkedIds.has(row.datasetId)}
                  isDisabled={uninstaller.isRunning}
                  onIsCheckedChange={(isChecked) => {
                    setCheckedIds((previousIds) => {
                      const nextIds = new Set(previousIds);
                      if (isChecked) {
                        nextIds.add(row.datasetId);
                      } else {
                        nextIds.delete(row.datasetId);
                      }
                      return nextIds;
                    });
                  }}
                />
              );
            })}
            {hiddenCount > 0 ? (
              <Text size="sm" c="dimmed">
                {plural(hiddenCount, {
                  one: "# more dataset you can't see stays.",
                  other: "# more datasets you can't see stay.",
                })}
              </Text>
            ) : null}
          </Stack>
        )}
        <Text size="sm" c="dimmed">{t`Unchecked datasets stay in Data Sources.`}</Text>
        <Group justify="flex-end">
          <Button variant="default" disabled={uninstaller.isRunning} onClick={props.onClose}>
            {t`Cancel`}
          </Button>
          <Button
            color="danger"
            loading={uninstaller.isRunning}
            disabled={content.isLoading}
            onClick={() => {
              void uninstaller.run(
                content.rows
                  .filter((row) => {
                    return checkedIds.has(row.datasetId);
                  })
                  .map((row) => {
                    return row.datasetId;
                  }),
              );
            }}
          >
            {_getConfirmLabel(checkedIds.size, t`Uninstall`)}
          </Button>
        </Group>
      </Stack>
    );
  }
  ```

  This body is over 45 lines. Split it before committing: move the list (the `Stack role="group"` with rows and the hidden count) into `UninstallContentList.tsx` (props: `rows`, `hiddenCount`, `installationId`, `checkedIds`, `isDisabled`, `onIsCheckedChange(datasetId, isChecked)`), and the two buttons into `UninstallModalFooter.tsx` (props: `confirmLabel`, `isRunning`, `isLoading`, `onCancel`, `onConfirm`). Keep the exact copy and roles above, which the tests assert. Check the heading level: the Mantine modal title is the dialog's name. Pick `order` so the heading nests under it (read how `InstallWizardStepHeading` does it and match).

- [ ] **Step 7: Run Step 2 again.** Expected: PASS, 9 tests. Then run Tasks 2-4's tests together: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal`. Expected: PASS.

- [ ] **Step 8: Commit.** `feat(plugins): add the uninstall modal for plugins that imported datasets`

---

### Task 6: Open the modal from the plugin card

**Files:**
- Create: `WPT/PluginSettingsCard/UninstallPluginModal/openUninstallPluginModal.tsx`
- Modify: `WPT/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions.ts`
- Modify: `WPT/PluginSettingsCard/PluginSettingsCard.tsx`
- Modify: `WPT/PluginSettingsCard/PluginActions/PluginActions.tsx`
- Modify: `WPT/PluginSettingsCard/PluginActions/PluginActionButton.tsx`
- Modify: `WPT/PluginSettingsCard/PluginActions/usePluginActionCopy.ts`
- Test: `WPT/PluginSettingsCard/PluginActions/PluginActions.test.tsx`

- [ ] **Step 1: Update `PluginActions.test.tsx` first (red).**

  - `_makeActions`: add `uninstallWithImportedDatasets: vi.fn(),`.
  - `_renderActions`: replace the `hasBundledContent` option and prop with `hasImportedDatasets = false` and `isLoadingImportedDatasets = false`, passed to `PluginActions` under the same names.
  - Delete the test "says in the uninstall dialog that the datasets a plugin imported stay".
  - Rename "leaves the uninstall dialog text as it was for a plugin with no bundled datasets" to "keeps the one-line uninstall confirm for a plugin with no imported datasets", and pass `hasImportedDatasets: false`. Its assertions stay.
  - Add:

  ```tsx
  it("opens the uninstall modal without a confirm first when the plugin imported datasets", () => {
    const actions = _makeActions();
    _renderActions({ status: "installed", hasImportedDatasets: true, actions });

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    expect(actions.uninstallWithImportedDatasets).toHaveBeenCalledTimes(1);
    expect(actions.uninstall).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("waits for the imported datasets to load before Uninstall can be clicked", () => {
    _renderActions({ status: "installed", isLoadingImportedDatasets: true });

    expect(screen.getByRole("button", { name: "Uninstall" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disable" })).toBeEnabled();
  });
  ```

- [ ] **Step 2: Run.** `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions`. Expected: FAIL (type errors or the new tests fail).

- [ ] **Step 3: `openUninstallPluginModal.tsx`.**

  ```tsx
  import { t } from "@lingui/core/macro";
  import { randomId } from "@mantine/hooks";
  import { modals } from "@mantine/modals";
  import { UninstallPluginModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal";
  import { returnFocusFromOpener } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/returnFocusFromOpener";
  import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

  /**
   * Opens the uninstall dialog of a plugin that imported datasets, titled
   * "Uninstall <plugin name>?". A plugin's settings card calls it from its
   * Uninstall button. A click outside never closes it, and while the
   * uninstall runs neither do Escape and the close button.
   */
  export function openUninstallPluginModal(
    options: Readonly<{
      pluginName: string;
      pluginId: string;
      installationId: PluginInstallation.Id;
    }>,
  ): void {
    const { pluginName } = options;
    const opener = document.activeElement;
    const headingId = opener?.getAttribute("aria-describedby") ?? null;
    const modalId = randomId();
    modals.open({
      modalId,
      title: t`Uninstall ${pluginName}?`,
      closeOnClickOutside: false,
      closeButtonProps: { "aria-label": t`Close` },
      // A finished uninstall removes the Uninstall button, so focus goes to
      // the card heading then.
      returnFocus: false,
      onClose: () => {
        window.setTimeout(() => {
          returnFocusFromOpener(opener, headingId);
        }, 0);
      },
      children: (
        <UninstallPluginModal
          {...options}
          modalId={modalId}
          onClose={() => {
            modals.close(modalId);
          }}
        />
      ),
    });
  }
  ```

  `t\`Uninstall ${pluginName}?\`` matches the confirm title already in `usePluginActionCopy.ts`, so it reuses that message id.

- [ ] **Step 4: `usePluginInstallationActions.ts`.** Add to `PluginInstallationActions`:

  ```ts
  /**
   * Opens the uninstall dialog that lets an admin delete the datasets the
   * plugin imported. The card uses it instead of `uninstall` when the plugin
   * imported datasets into this workspace.
   */
  uninstallWithImportedDatasets: () => void;
  ```

  Add `"uninstallWithImportedDatasets"` to the `Pick` that `_makeInstallActionsFromContext` returns, and to its object:

  ```ts
  uninstallWithImportedDatasets: () => {
    if (installation !== undefined) {
      openUninstallPluginModal({
        pluginName,
        pluginId: installation.pluginId,
        installationId: installation.id,
      });
    }
  },
  ```

- [ ] **Step 5: `usePluginActionCopy.ts`.** Remove the `hasBundledContent` option. The uninstall `confirmBody` becomes `t\`Its features are removed from this workspace.\`` unconditionally. Update the docblock: drop the sentence about bundled datasets and add "A plugin that imported datasets gets the uninstall modal instead of this confirmation."

- [ ] **Step 6: `PluginActionButton.tsx`.** Replace the `hasBundledContent` prop with:

  ```ts
  /** Whether the plugin imported datasets into this workspace. */
  hasImportedDatasets: boolean;

  /** True until the card knows whether the plugin imported datasets. */
  isLoadingImportedDatasets: boolean;
  ```

  Call `usePluginActionCopy({ pluginName })`. Then:

  ```tsx
  const isUninstallWithDatasets =
    kind === "uninstall" && hasImportedDatasets;
  ...
  disabled={
    isDisabled || (kind === "uninstall" && isLoadingImportedDatasets)
  }
  onClick={() => {
    if (isUninstallWithDatasets) {
      actions.uninstallWithImportedDatasets();
      return;
    }
    modals.openConfirmModal({ ...unchanged });
  }}
  ```

  Update the component docblock: "Uninstall of a plugin that imported datasets opens the uninstall modal instead, which is its own confirmation."

- [ ] **Step 7: `PluginActions.tsx`.** Replace the `hasBundledContent` prop with `hasImportedDatasets` and `isLoadingImportedDatasets` (same docblocks as Step 6) and pass both to `PluginActionButton`.

- [ ] **Step 8: `PluginSettingsCard.tsx`.**

  ```tsx
  import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
  ...
  // A card always has an install or a manifest, so one of the ids is set.
  const importedContent = useImportedPluginContent(
    installation?.pluginId ?? manifest?.id ?? "",
  );
  ...
  <PluginActions
    ...
    hasImportedDatasets={
      Object.keys(importedContent.importsByContentId).length > 0
    }
    isLoadingImportedDatasets={importedContent.isLoading}
    actions={actions}
  />
  ```

  Remove the `hasBundledContent` expression. If `PluginSettingsCard` goes over 45 lines, move the two values into a small `_usePluginImportState` hook above it in the same file.

- [ ] **Step 9: Run.** Step 2's command, then `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab` and `npx tsc -b`. Expected: PASS and exit 0. Fix any other test that passed `hasBundledContent` (`grep -rn hasBundledContent src`, expect no hits afterwards).

- [ ] **Step 10: Commit.** `feat(plugins): offer to delete imported datasets when uninstalling a plugin`

---

### Task 7: End-to-end test

**Files:**
- Create: `tests/e2e/helpers/mozambiquePackFlow.ts`
- Modify: `tests/e2e/plugins-mozambique-install.spec.ts`
- Create: `tests/e2e/plugins-mozambique-uninstall.spec.ts`

Read `docs/rules/e2e-testing.md` and the `CLAUDE.md` E2E rules first: drive the feature through the UI, 45-second local limit, restore state in `finally`.

- [ ] **Step 1: Move the shared helpers.** From `plugins-mozambique-install.spec.ts`, move `PLUGIN_ID`, `PLUGIN_NAME`, `DATASET_NAMES`, `_expectEveryDatasetImported`, `_deleteImportedContent`, and `_deletePluginInstallation` into `tests/e2e/helpers/mozambiquePackFlow.ts`, exported as `MOZAMBIQUE_PLUGIN_ID`, `MOZAMBIQUE_PLUGIN_NAME`, `MOZAMBIQUE_DATASET_NAMES`, `expectEveryMozambiqueDatasetImported`, `deleteMozambiqueImportedContent`, and `deleteMozambiquePluginInstallation`, with their docblocks. Import them in the install spec. Run `pnpm test:e2e plugins-mozambique-install.spec.ts`. Expected: PASS, unchanged behavior. Check `docker ps -q | wc -l` first. Commit: `test(plugins): share the Mozambique pack e2e helpers`.

- [ ] **Step 2: Write the uninstall spec.**

  ```ts
  /*
   * Uninstalling the Mozambique pack lets an admin delete some of the
   * datasets it imported: the chosen one leaves Data Sources and the other
   * stays.
   */
  import { expect, test } from "./fixtures/e2e.fixture";
  import { signInWithEmailPassword } from "./helpers/auth";
  import {
    deleteMozambiqueImportedContent,
    deleteMozambiquePluginInstallation,
    expectEveryMozambiqueDatasetImported,
    MOZAMBIQUE_PLUGIN_NAME,
  } from "./helpers/mozambiquePackFlow";
  import {
    getPluginCard,
    installPluginThroughWizard,
  } from "./helpers/pluginFlow";
  import {
    createSupabaseAdminClient,
    getWorkspaceIdBySlug,
  } from "./helpers/supabaseAdminClient";
  import { LONG_WAIT } from "./helpers/timeouts";

  const KEPT_DATASET = "Mozambique provinces";
  const DELETED_DATASET = "Mozambique districts";

  test.describe("Mozambique plugin uninstall", () => {
    test("deletes only the imported datasets the admin chose", async ({
      page,
      e2eWorkerDb,
    }) => {
      const admin = createSupabaseAdminClient();
      const { workspaceSlug, primaryUser } = e2eWorkerDb;
      const workspaceId = await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      });
      let didInstall = false;
      try {
        await signInWithEmailPassword(page, {
          email: primaryUser.email,
          password: primaryUser.password,
          workspaceSlug,
        });
        await installPluginThroughWizard(page, {
          workspaceSlug,
          pluginName: MOZAMBIQUE_PLUGIN_NAME,
          onInstallStarted: () => {
            didInstall = true;
          },
          beforeDone: expectEveryMozambiqueDatasetImported,
        });

        const card = getPluginCard(page, MOZAMBIQUE_PLUGIN_NAME);
        await card.getByRole("button", { name: "Uninstall" }).click();
        const dialog = page.getByRole("dialog", {
          name: `Uninstall ${MOZAMBIQUE_PLUGIN_NAME}?`,
        });
        await dialog
          .getByRole("checkbox", { name: `Delete ${DELETED_DATASET}` })
          .check();
        await dialog
          .getByRole("button", { name: "Uninstall and delete 1 dataset" })
          .click();
        await expect(dialog).toBeHidden({ timeout: LONG_WAIT });
        await expect(card.getByRole("button", { name: "Install" })).toBeVisible();

        await page
          .getByRole("link", { name: "Data Sources", exact: true })
          .click();
        await expect(page.getByRole("link", { name: KEPT_DATASET })).toBeVisible({
          timeout: LONG_WAIT,
        });
        await expect(page.getByRole("link", { name: DELETED_DATASET })).toHaveCount(0);
      } finally {
        await deleteMozambiqueImportedContent({ admin, workspaceId }).catch(
          (error: unknown) => {
            console.warn(`[e2e] Mozambique content cleanup: ${String(error)}`);
          },
        );
        if (didInstall) {
          await deleteMozambiquePluginInstallation({ admin, workspaceId });
        }
      }
    });
  });
  ```

  The Data Sources check navigates client-side on purpose (see the install spec's `_expectDataSourcesListsEveryDataset` note: a reload could restore a cached list).

- [ ] **Step 3: Run.** `pnpm test:e2e plugins-mozambique-uninstall.spec.ts`. Expected: PASS within the 45-second limit. If it times out, find the slow step and fix it rather than raising the timeout.

- [ ] **Step 4: Commit.** `test(plugins): uninstall the Mozambique pack and delete one of its datasets end to end`

---

### Task 8: Docs

- [ ] **Step 1:** In `docs/plugin-authoring.md` section 14, "Bundle datasets", add after the paragraph on importing:

  > When an admin uninstalls a plugin that imported datasets, the uninstall dialog lists each one with an unchecked "Delete" box, so every dataset is kept unless the admin chooses otherwise. Only datasets the admin could delete from Data Sources can be deleted there. A checked dataset lists the linked datasets and other plugins' data slots that read it.

  Match the section's existing voice and wrap width.

- [ ] **Step 2:** In `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`, under the "Disable and uninstall" table, add:

  > Built so far: the keep or delete choice for imported datasets (`docs/superpowers/specs/2026-11-16-plugins-uninstall-content-design.md`). Plugin storage retention, secrets, and plugin-created datasets do not exist yet.

- [ ] **Step 3: Commit.** `docs(plugins): describe the keep or delete choice at uninstall`

---

### Task 9: Strings

- [ ] **Step 1:** `pnpm i18n:extract`.
- [ ] **Step 2:** Translate every new `msgid` in `ar es fr pt sw zh-Hans zh-Hant` by hand. Keep the terms the catalogs already use for "dataset", "data slot", "linked dataset", "Data Sources", and "uninstall" (`grep -a -A1 'msgid "Data Sources' src/i18n/locales/<lang>/messages.po`). Keep every `{placeholder}` and `#` in plurals. The new ids are: "Checking what reads this dataset", "These read it and stop working once it is deleted:", "{label} (linked dataset)", "{label} (data slot)", "Kept. Only a dataset admin can delete it.", "Delete {name}", "These datasets could not be deleted and are still in Data Sources: {names}", the two plurals ("# dataset deleted." / "# datasets deleted.", "Uninstall and delete # dataset" / "...datasets", "# more dataset you can't see stays." / "...datasets you can't see stay."), "{pluginName}: {slotTitle}", "Datasets it imported", "Unchecked datasets stay in Data Sources." Arabic needs all six plural forms.
- [ ] **Step 3:** `pnpm i18n:compile`, then `pnpm i18n:check`. Expected: exit 0.
- [ ] **Step 4: Commit.** `chore(i18n): translate the uninstall dialog`

---

### Task 10: Verify

- [ ] **Step 1:** Run one at a time: `npx tsc -b`, `npx eslint src/views/WorkspaceSettingsPage tests/e2e`, `pnpm test:frontend`, `pnpm check:plugin-bundle`. Expected: exit 0. `pnpm test:frontend` may still show the pre-existing maplibre failure in `src/routes/_auth/$workspaceSlug/dashboards/edit/-$dashboardId.test.tsx` until `fix/plugins-leftovers` merges. Report it, but it is not caused by this branch.
- [ ] **Step 2:** E2E one at a time: `pnpm test:e2e plugins-mozambique-install.spec.ts`, `pnpm test:e2e plugins-mozambique-uninstall.spec.ts`, `pnpm test:e2e plugins-epidemiology-case-slot.spec.ts` (it uses the plugin card).
- [ ] **Step 3: Manual check, headless.** Start the app with `npx concurrently --names "vite,functions" --prefix "{name}" "vite --host 127.0.0.1" "pnpm fns:serve"` (`pnpm dev` exits on this machine because ngrok is unauthenticated; read the port Vite prints), sign in with the credentials in `seed/SeedData.ts`, install the Mozambique pack, open Uninstall, check one dataset, and screenshot the modal before confirming into `.temp/feat-plugins-uninstall-content/`. Confirm the dependents list and the button label render, then cancel and clean up (uninstall with nothing checked, then delete the two datasets from Data Sources).
