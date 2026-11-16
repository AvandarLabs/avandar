import { isDefined } from "@avandar/utils";
import { useState } from "react";
import { getInstallWizardStepsFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { InstallWizardStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type {
  PluginDataSlot,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";

/**
 * One screen of the install wizard. The Data slots step has one page per
 * data slot. `key` is unique per page, so a page remounts, and its heading
 * takes focus, whenever the wizard moves.
 */
export type InstallWizardPage =
  | Readonly<{
      key: string;
      step: "dataSlots";
      slotId: string;
      slot: PluginDataSlot;
    }>
  | Readonly<{ key: string; step: Exclude<InstallWizardStep, "dataSlots"> }>;

/** The binding an admin chose for each data slot so far, by slot id. */
type DraftsBySlotId = Readonly<
  Record<string, PluginDataSlotBinding.Draft | undefined>
>;

/**
 * Where an admin is in the install wizard and what they chose so far.
 * `PluginInstallWizard` reads it to pick the page to draw, the footer
 * buttons to offer, and what to install.
 */
export type InstallWizardState = Readonly<{
  steps: readonly InstallWizardStep[];
  page: InstallWizardPage;
  isFirstPage: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  draftsBySlotId: DraftsBySlotId;
  setSlotDraft: (
    slotId: string,
    draft: PluginDataSlotBinding.Draft | undefined,
  ) => void;

  /** Leaves the current page's data slot unbound and moves on. */
  skipDataSlot: () => void;

  /** Every data slot binding chosen, to install with the plugin. */
  bindings: readonly PluginDataSlotBinding.Draft[];

  /** The content items to import, by id. Every item to start with. */
  chosenContentIds: readonly string[];
  setIsContentChosen: (contentId: string, isChosen: boolean) => void;
}>;

function _makePagesFromManifest(manifest: PluginManifest): InstallWizardPage[] {
  return getInstallWizardStepsFromManifest(manifest).flatMap(
    (step): InstallWizardPage[] => {
      if (step !== "dataSlots") {
        return [{ key: step, step }];
      }
      return Object.entries(manifest.dataSlots).map(([slotId, slot]) => {
        return { key: `dataSlots.${slotId}`, step, slotId, slot };
      });
    },
  );
}

/** The content items an admin left checked, all of them to start with. */
function useChosenContentIds(
  manifest: PluginManifest,
): Pick<InstallWizardState, "chosenContentIds" | "setIsContentChosen"> {
  const [chosenContentIds, setChosenContentIds] = useState<readonly string[]>(
    () => {
      return manifest.contributes.content.map((item) => {
        return item.id;
      });
    },
  );
  return {
    chosenContentIds,
    setIsContentChosen: (contentId, isChosen) => {
      const otherContentIds = chosenContentIds.filter((chosenContentId) => {
        return chosenContentId !== contentId;
      });
      setChosenContentIds(
        isChosen ? [...otherContentIds, contentId] : otherContentIds,
      );
    },
  };
}

/**
 * Tracks the install wizard for one plugin's manifest: the current page, the
 * steps the manifest needs, the data slot bindings chosen so far, and the
 * content items to import. Moving past the last page or before the first
 * does nothing.
 */
export function useInstallWizardState(
  manifest: PluginManifest,
): InstallWizardState {
  const [pageIndex, setPageIndex] = useState(0);
  const [draftsBySlotId, setDraftsBySlotId] = useState<DraftsBySlotId>({});
  const chosenContent = useChosenContentIds(manifest);
  const pages = _makePagesFromManifest(manifest);
  const page = pages[pageIndex]!;
  const setSlotDraft: InstallWizardState["setSlotDraft"] = (slotId, draft) => {
    setDraftsBySlotId({ ...draftsBySlotId, [slotId]: draft });
  };
  const goToNextPage = (): void => {
    setPageIndex(Math.min(pageIndex + 1, pages.length - 1));
  };
  return {
    steps: getInstallWizardStepsFromManifest(manifest),
    page,
    isFirstPage: pageIndex === 0,
    goToNextPage,
    goToPreviousPage: () => {
      setPageIndex(Math.max(pageIndex - 1, 0));
    },
    draftsBySlotId,
    setSlotDraft,
    skipDataSlot: () => {
      if (page.step === "dataSlots") {
        setSlotDraft(page.slotId, undefined);
      }
      goToNextPage();
    },
    bindings: Object.values(draftsBySlotId).filter(isDefined),
    ...chosenContent,
  };
}
