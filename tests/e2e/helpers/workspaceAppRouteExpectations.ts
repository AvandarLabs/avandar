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
  settings: {
    label: "Workspace Settings",
    path: "/settings",
    allowedUrlPattern: /\/settings/,
  },
} as const satisfies Record<string, WorkspaceAppRouteCase>;

/**
 * Asserts the member is redirected to the workspace access-denied page.
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
 * Asserts the member can open the app route (not access-denied).
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
