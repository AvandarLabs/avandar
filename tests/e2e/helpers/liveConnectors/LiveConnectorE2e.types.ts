import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { E2EWorkerDb } from "../../fixtures/e2e.fixture";
import type { SavedDataset } from "../saveCloudOnlyDataset";
import type { Page } from "@playwright/test";

/** One row of the table every live connector spec reads from its source. */
export type LiveSourceRow = Readonly<{
  region: string;
  cases: number;

  /** An ISO date, `YYYY-MM-DD`. */
  reportedOn: string;
}>;

/** What a live connector needs to stub its boundary and seed its account. */
export type LiveConnectorInstallOptions = {
  page: Page;
  e2eWorkerDb: E2EWorkerDb;
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
};

/**
 * One live connector's stubbed source, from the moment it is installed until
 * it is cleaned up. Its rows start as `LiveSourceTable.initialRows`.
 */
export type LiveConnectorSession = {
  /**
   * Imports the source table through the data import page, starting from
   * any signed-in page of the workspace, and returns the saved dataset once
   * its page has opened.
   */
  importDataset: (page: Page) => Promise<SavedDataset>;

  /** Changes the rows the source returns from now on. */
  setSourceRows: (rows: readonly LiveSourceRow[]) => void;

  /**
   * Every read the browser made through the dataset-keyed edge function
   * route, by URL, in the order it made them.
   */
  getDatasetReadUrls: () => string[];

  /** Removes everything the install and the import created. */
  cleanUp: () => Promise<void>;
};

/**
 * How the live connector specs drive one live source type. Its stubs sit at
 * the browser's own network boundary, so the connector's UI and client code
 * run for real.
 */
export type LiveConnectorE2e = Readonly<{
  /** The dataset page's menu item that re-reads the source. */
  refreshMenuItemName: string;

  /** The title of the notification a finished refresh shows. */
  refreshedNotificationTitle: string;

  /** Seeds the connector's account, stubs its boundary, starts a session. */
  install: (
    options: Readonly<LiveConnectorInstallOptions>,
  ) => Promise<LiveConnectorSession>;
}>;
