import { useState } from "react";
import { getInstallWizardStepsFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { InstallWizardStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/**
 * One screen of the install wizard. `key` is unique per page, so a page
 * remounts, and its heading takes focus, whenever the wizard moves.
 */
export type InstallWizardPage = Readonly<{
  key: string;
  step: InstallWizardStep;
}>;

/**
 * Where an admin is in the install wizard. `PluginInstallWizard` reads it to
 * pick the page to draw and the footer buttons to offer.
 */
export type InstallWizardState = Readonly<{
  steps: readonly InstallWizardStep[];
  page: InstallWizardPage;
  isFirstPage: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
}>;

function _makePagesFromSteps(
  steps: readonly InstallWizardStep[],
): InstallWizardPage[] {
  return steps.map((step) => {
    return { key: step, step };
  });
}

/**
 * Tracks the install wizard's current page for one plugin's manifest, with
 * the steps the manifest needs. Moving past the last page or before the
 * first does nothing.
 */
export function useInstallWizardState(
  manifest: PluginManifest,
): InstallWizardState {
  const [pageIndex, setPageIndex] = useState(0);
  const steps = getInstallWizardStepsFromManifest(manifest);
  const pages = _makePagesFromSteps(steps);
  return {
    steps,
    page: pages[pageIndex]!,
    isFirstPage: pageIndex === 0,
    goToNextPage: () => {
      setPageIndex(Math.min(pageIndex + 1, pages.length - 1));
    },
    goToPreviousPage: () => {
      setPageIndex(Math.max(pageIndex - 1, 0));
    },
  };
}
