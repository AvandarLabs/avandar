import { expect } from "@playwright/test";
import { LONG_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

/**
 * Hard navigation so TanStack Query refetches roles after admin-side role
 * changes.
 */
export async function reloadWorkspaceAppSession(
  page: Page,
  workspaceSlug: string,
): Promise<void> {
  await page.goto(`/${workspaceSlug}/`, { waitUntil: "load" });
}

export type WorkspaceAppRouteCase = {
  label: string;
  path: string;
  allowedUrlPattern: RegExp;
};

export const WORKSPACE_APP_ROUTES = {
  dataSources: {
    label: "Data Sources",
    path: "/data-manager",
    allowedUrlPattern: /\/data-manager/,
  },
  dataExplorer: {
    label: "Data Explorer",
    path: "/data-explorer",
    allowedUrlPattern: /\/data-explorer/,
  },
  dashboards: {
    label: "Dashboards",
    path: "/dashboards",
    allowedUrlPattern: /\/dashboards/,
  },
  gis: {
    label: "Maps",
    path: "/map",
    allowedUrlPattern: /\/map/,
  },
  caseTypes: {
    label: "Case Types",
    path: "/ontology-designer",
    allowedUrlPattern: /\/ontology-designer/,
  },
  caseRecords: {
    label: "Case Records",
    path: "/individual-manager",
    allowedUrlPattern: /\/individual-manager\//,
  },
  settings: {
    label: "Workspace Settings",
    path: "/settings",
    allowedUrlPattern: /\/settings/,
  },
} as const satisfies Record<string, WorkspaceAppRouteCase>;

/**
 * Asserts that opening a workspace app route leads to the access-denied page.
 * Use it, for example, in an E2E test of a member's route permissions.
 */
export async function expectWorkspaceAppAccessDenied(
  page: Page,
  options: { workspaceSlug: string; appPath: string },
): Promise<void> {
  await page.goto(`/${options.workspaceSlug}${options.appPath}`);
  await expect(page).toHaveURL(
    new RegExp(`/${options.workspaceSlug}/access-denied`),
    { timeout: LONG_WAIT },
  );
  await expect(
    page.getByText(/You do not have permission to open/),
  ).toBeVisible();
}

/**
 * Asserts that a workspace app route opens at the expected allowed URL.
 * Use it, for example, in an E2E test of a member's route permissions.
 */
export async function expectWorkspaceAppAccessAllowed(
  page: Page,
  options: {
    workspaceSlug: string;
    appPath: string;
    allowedUrlPattern: RegExp;
  },
): Promise<void> {
  await page.goto(`/${options.workspaceSlug}${options.appPath}`);
  await expect(page).not.toHaveURL(/access-denied/, { timeout: LONG_WAIT });
  await expect(page).toHaveURL(options.allowedUrlPattern, {
    timeout: LONG_WAIT,
  });
}
