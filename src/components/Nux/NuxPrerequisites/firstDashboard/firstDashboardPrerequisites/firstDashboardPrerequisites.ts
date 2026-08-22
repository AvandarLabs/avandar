import { addDatasetPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/addDatasetPrerequisite";
import { buildDashboardPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/buildDashboardPrerequisite";
import { runQueryPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/runQueryPrerequisite/runQueryPrerequisite";
import { shareDashboardPrerequisite } from "@/components/Nux/NuxPrerequisites/firstDashboard/shareDashboardPrerequisite/shareDashboardPrerequisite";
import type { NuxPrerequisite } from "@/components/Nux/NuxPrerequisites/NuxPrerequisite.types";

/**
 * Prerequisite strategies for the first_dashboard tutorial.
 *
 * Returns the ordered registry the judge iterates instead of switching on
 * milestone keys.
 */
export const FIRST_DASHBOARD_PREREQUISITES: readonly NuxPrerequisite[] = [
  addDatasetPrerequisite,
  runQueryPrerequisite,
  buildDashboardPrerequisite,
  shareDashboardPrerequisite,
];
