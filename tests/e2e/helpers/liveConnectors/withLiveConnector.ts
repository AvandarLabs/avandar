import { signInWithEmailPassword } from "../auth";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "../supabaseAdminClient";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { E2EWorkerDb } from "../../fixtures/e2e.fixture";
import type {
  LiveConnectorE2e,
  LiveConnectorSession,
} from "./LiveConnectorE2e.types";
import type { Page } from "@playwright/test";

/** What a live connector check runs with, signed in as the importer. */
export type LiveConnectorTestContext = {
  page: Page;
  e2eWorkerDb: E2EWorkerDb;
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  session: LiveConnectorSession;
};

type WithLiveConnectorOptions = {
  page: Page;
  e2eWorkerDb: E2EWorkerDb;
  connector: LiveConnectorE2e;

  /** The check itself. */
  body: (context: Readonly<LiveConnectorTestContext>) => Promise<void>;
};

/**
 * Installs a live connector, signs in as the importer, runs `body`, and
 * removes everything the connector created, even when `body` fails.
 */
export async function withLiveConnector(
  options: Readonly<WithLiveConnectorOptions>,
): Promise<void> {
  const { page, e2eWorkerDb } = options;
  const supabaseAdminClient = createSupabaseAdminClient();
  const workspaceId = await getWorkspaceIdBySlug({
    supabaseAdminClient,
    slug: e2eWorkerDb.workspaceSlug,
  });
  const session = await options.connector.install({
    page,
    e2eWorkerDb,
    supabaseAdminClient,
    workspaceId,
  });
  try {
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });
    await options.body({
      page,
      e2eWorkerDb,
      supabaseAdminClient,
      workspaceId,
      session,
    });
  } finally {
    await session.cleanUp();
  }
}
