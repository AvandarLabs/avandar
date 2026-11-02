import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { GeneralAccessValue } from "./GeneralAccessModule/GeneralAccessModule";
import type { ReactNode } from "react";

/**
 * Publishing, supplied by the dashboard-only wrapper.
 *
 * `ShareResourceModal` renders datasets too, so publishing arrives as an
 * optional prop rather than an internal branch on `resourceType`. When it is
 * absent the modal renders no publishing UI.
 *
 * The modal reads `targetVisibility` for one purpose only: deciding whether
 * the dropdown shows "Anyone with the link". It never writes it.
 */
export type ShareResourcePublishing = {
  /**
   * What the user has ASKED for. The dropdown moves this; only the footer
   * button applies it. Safe to drive display with, never safe to reason about
   * exposure with: it is true of a draft the moment someone picks "Anyone with
   * the link", and false of a live public dashboard the moment someone picks
   * anything else.
   */
  targetVisibility: Dashboard.Visibility;
  /**
   * What is actually PUBLISHED right now. Diverges from `targetVisibility`
   * between a pick and the publish that applies it, which is exactly the
   * window in which the "still public" warning has to be right: revoking
   * shares does not stop public reads, so the warning has to follow what the
   * internet can read today, not what the user just selected.
   */
  currentVisibility: Dashboard.Visibility;
  /** Set when the public option must render disabled, with this reason. */
  publicOptionDisabledReason: string | undefined;
  section: ReactNode;
  actions: ReactNode;
  onGeneralAccessChange: (value: GeneralAccessValue) => void;
};
