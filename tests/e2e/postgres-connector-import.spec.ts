import { signInWithEmailPassword } from "./helpers/auth";
import { expect, test } from "./fixtures/e2e.fixture";
import { parseDatasetIdFromDataManagerUrl } from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  deleteAllDatasetsInWorkspaceForE2E,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page, Route } from "@playwright/test";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * The Postgres connector, end to end: a saved connection, the schema-grouped
 * table picker, the preview, and the import form the rows land in.
 *
 * Only the two `external-datasets` HTTP calls that would otherwise open a
 * real TCP connection to an external Postgres server are stubbed
 * (`relations`, `preview`) - mirroring exactly why
 * `google-sheets-import.spec.ts` stubs the Google API boundary and nothing
 * else. Unlike Sheets, where the
 * browser talks to the third party directly and Playwright's `page.route()`
 * can intercept it, this connector's actual database round trip happens
 * server-side, inside the edge function - Playwright cannot intercept a raw
 * Postgres wire-protocol connection the way it intercepts a `fetch`. Loosening
 * the edge function's SSRF guard (`validateHostNotPrivate.ts`) so this test
 * could dial a loopback/Docker-internal address was considered and rejected:
 * that guard is security-critical, already has its own dedicated unit-test
 * matrix (`validateHostNotPrivate.test.ts`), and a standing bypass mechanism
 * is a bigger permanent risk than the marginal coverage gained by this one
 * e2e spec also exercising it. So the HTTP boundary between the browser and
 * our own edge function is stubbed instead - the same boundary choice the
 * Sheets test makes, just one layer further down this feature's own stack.
 *
 * The connection-creation form itself (host/port/username/password/SSL mode)
 * is therefore not exercised here - it is plain Mantine form state with no
 * network call this test can observe without also stubbing test-and-save,
 * and is covered instead by `PostgresConnectorImportView.test.tsx`'s
 * component test. This spec starts from an already-saved connection (seeded
 * directly, the same "pre-test setup purely to save time" exception the
 * Sheets test's own token seeding relies on) and covers the parts genuinely
 * specific to this connector: the saved-connection auto-select, the
 * schema-grouped relation picker, the preview, and a real dataset save.
 */

const SEEDED_RELATION = {
  relationId: "public.e2e_customers",
  label: "public.e2e_customers",
  kind: "table",
};

const PREVIEW_COLUMNS = [
  { columnName: "id", sourceType: "integer" },
  { columnName: "full_name", sourceType: "text" },
];

const PREVIEW_ROWS = [
  { id: 1, full_name: "Ada Lovelace" },
  { id: 2, full_name: "Grace Hopper" },
];

/** Matches the dataset detail URL a completed save lands on. */
function _datasetMetaUrlPattern(workspaceSlug: string): RegExp {
  const escaped = workspaceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`/${escaped}/data-manager/[0-9a-f-]{36}`, "i");
}

/**
 * Answers the two `external-datasets` routes this view calls for an
 * already-saved connection, out of the fixture above. `test-and-save` is
 * deliberately not stubbed here - see the file docstring for why the
 * connection-creation path is out of scope for this spec.
 */
async function _stubExternalDatasetsRoutes(page: Page): Promise<void> {
  await page.route(
    "**/functions/v1/external-datasets/postgres/connections/*/relations",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ relations: [SEEDED_RELATION] }),
      });
    },
  );

  await page.route(
    "**/functions/v1/external-datasets/postgres/connections/*/relations/*/preview",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          columns: PREVIEW_COLUMNS,
          previewRows: PREVIEW_ROWS,
        }),
      });
    },
  );
}

/**
 * Seeds one saved Postgres connection (`db_connections` +
 * `db_connections__postgres`) for the workspace, with a real Vault secret
 * (the password value is never dialed in this spec, since the live-DB round
 * trip is stubbed, but the FK and the RLS/Vault shape are real). Returns the
 * ids so cleanup can remove exactly what this test created.
 */
async function _seedSavedConnection(options: {
  admin: AvaSupabaseDBClient;
  workspaceId: string;
}): Promise<{ connectionId: string; vaultSecretId: string }> {
  const { admin, workspaceId } = options;

  const { data: secretId, error: secretError } = await admin.rpc(
    "rpc_db_connections__create_vault_secret",
    {
      p_secret: "e2e-throwaway-password",
      p_name: `e2e-postgres-connector-${Date.now()}`,
      p_description: "Created by postgres-connector-import.spec.ts; safe to delete.",
    },
  );
  if (secretError || !secretId) {
    throw new Error(`vault secret seed failed: ${secretError?.message}`);
  }

  // From here, a failure must roll back whatever already succeeded (the
  // Vault secret at minimum) before rethrowing, so a mid-seed failure never
  // leaves a row behind that the caller has no id to clean up.
  try {
    const { data: connection, error: connectionError } = await admin
      .from("db_connections")
      .insert({
        workspace_id: workspaceId,
        connection_type: "postgres",
        name: "E2E reporting replica",
      })
      .select("id")
      .single();
    if (connectionError || !connection) {
      throw new Error(`db_connections seed failed: ${connectionError?.message}`);
    }

    const { error: postgresError } = await admin
      .from("db_connections__postgres")
      .insert({
        connection_id: connection.id,
        workspace_id: workspaceId,
        host: "db.e2e-fixture.invalid",
        port: 5432,
        database_name: "reporting",
        username: "readonly_user",
        ssl_mode: "require",
        vault_secret_id: secretId,
        last_verified_at: new Date().toISOString(),
      });
    if (postgresError) {
      await admin.from("db_connections").delete().eq("id", connection.id);
      throw new Error(`db_connections__postgres seed failed: ${postgresError.message}`);
    }

    return { connectionId: connection.id, vaultSecretId: secretId };
  } catch (error) {
    await admin.rpc("rpc_db_connections__delete_vault_secret", {
      p_secret_id: secretId,
    });
    throw error;
  }
}

/**
 * Deletes the seeded `db_connections`/`db_connections__postgres` rows and
 * the Vault secret they point at, so nothing from this test outlives it.
 */
async function _cleanUpSavedConnection(options: {
  admin: AvaSupabaseDBClient;
  connectionId: string;
  vaultSecretId: string;
}): Promise<void> {
  const { admin, connectionId, vaultSecretId } = options;

  // Children before the parent: `db_connections__postgres.connection_id` is
  // a foreign key onto `db_connections.id`.
  await admin
    .from("db_connections__postgres")
    .delete()
    .eq("connection_id", connectionId);
  await admin.from("db_connections").delete().eq("id", connectionId);
  await admin.rpc("rpc_db_connections__delete_vault_secret", {
    p_secret_id: vaultSecretId,
  });
}

test.describe("Postgres connector", () => {
  test("imports a table from a saved connection", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });

    let connectionId: string | undefined;
    let vaultSecretId: string | undefined;
    try {
      ({ connectionId, vaultSecretId } = await _seedSavedConnection({
        admin,
        workspaceId,
      }));

      await _stubExternalDatasetsRoutes(page);

      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await page.goto(`/${e2eWorkerDb.workspaceSlug}/data-manager/data-import`);
      await page.getByRole("tab", { name: "Connectors" }).click();

      // The most-recently-verified saved connection is picked automatically
      // and its relations are listed eagerly - no click needed to reach the
      // table picker.
      const relationSelect = page.getByRole("combobox", {
        name: "Table or view to import",
      });
      await expect(relationSelect).toBeVisible({ timeout: LONG_WAIT });
      await relationSelect.click();
      await page
        .getByRole("option", { name: SEEDED_RELATION.label, exact: true })
        .click();

      await expect(
        page.getByRole("heading", { name: "Data preview" }),
      ).toBeVisible({ timeout: LONG_WAIT });
      await expect(
        page.getByRole("columnheader", { name: "full_name" }),
      ).toBeVisible({ timeout: SHORT_WAIT });

      await page.getByRole("button", { name: "Save Dataset" }).click();
      await expect
        .poll(
          () => {
            return _datasetMetaUrlPattern(e2eWorkerDb.workspaceSlug).test(
              page.url(),
            );
          },
          { timeout: LONG_WAIT },
        )
        .toBe(true);

      const datasetId = parseDatasetIdFromDataManagerUrl({
        url: page.url(),
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      expect(datasetId).toBeTruthy();
    } finally {
      await deleteAllDatasetsInWorkspaceForE2E({
        supabaseAdminClient: admin,
        workspaceId,
      });
      if (connectionId && vaultSecretId) {
        await _cleanUpSavedConnection({ admin, connectionId, vaultSecretId });
      }
    }
  });
});
