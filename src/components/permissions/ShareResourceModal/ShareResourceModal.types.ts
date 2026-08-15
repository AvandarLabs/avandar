import type { GeneralAccessValue } from "./GeneralAccessModule/GeneralAccessModule";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

/**
 * Publishing, supplied by the dashboard-only wrapper.
 *
 * `ShareResourceModal` renders datasets too, so publishing arrives as an
 * optional prop rather than an internal branch on `resourceType`. When it is
 * absent the modal behaves exactly as it did before dashboards could be
 * published to a workspace.
 *
 * The modal reads `targetVisibility` for one purpose only: deciding whether
 * the dropdown shows "Anyone with the link". It never writes it.
 */
export type ShareResourcePublishing = {
  targetVisibility: Dashboard.Visibility;
  /** Set when the public option must render disabled, with this reason. */
  publicOptionDisabledReason: string | undefined;
  section: ReactNode;
  actions: ReactNode;
  onGeneralAccessChange: (value: GeneralAccessValue) => void;
};
