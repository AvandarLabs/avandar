import { msg } from "@lingui/core/macro";
import { APIClient } from "@/clients/APIClient";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import type { I18n } from "@lingui/core";
import type { ConnectorRelation } from "@sbfn/connectors/Connector";
import type { PostgresConnectionFormValues } from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable/useLoadPostgresTable";

/**
 * Tests the submitted credentials by opening a live connection, and saves
 * them if that succeeds - there is no separate "test" step, the connection
 * succeeding is the proof.
 *
 * `i18n` (not `t`) is threaded in rather than resolving these labels at the
 * call site: `docs/rules/i18n.md` bans relocating a `` t`…` `` macro out of
 * its lexical scope, since the extractor cannot follow it and the strings
 * never reach the catalogs. Resolving through `i18n._(msg\`…\`)` here is the
 * safe form for a non-component module.
 */
export async function testAndSavePostgresConnection(
  params: Readonly<{
    workspaceId: string;
    values: PostgresConnectionFormValues;
    i18n: I18n;
  }>,
): Promise<{ connectionId: string; relations: ConnectorRelation[] }> {
  const { workspaceId, values, i18n } = params;
  const jobId = JobProgressStore.startJob(i18n._(msg`Connecting to database`));
  try {
    JobProgressStore.updateJob(jobId, {
      status: "indeterminate",
      label: i18n._(msg`Connecting to database`),
      detail: i18n._(msg`Listing tables...`),
    });
    const result = await APIClient.post({
      route: "connectors/:connectorType/connections/test-and-save",
      pathParams: { connectorType: "postgres" },
      body: {
        workspaceId,
        name: values.name,
        host: values.host,
        port: values.port,
        databaseName: values.databaseName,
        username: values.username,
        password: values.password,
        sslMode: values.sslMode,
      },
    });
    if ("error" in result) {
      JobProgressStore.failJob(jobId, result.error.message);
      throw Object.assign(new Error(result.error.message), {
        code: result.error.code,
      });
    }
    JobProgressStore.finishJob(jobId);
    return result;
  } catch (error) {
    if (!(error instanceof Error && "code" in error)) {
      JobProgressStore.failJob(
        jobId,
        error instanceof Error ? error.message : String(error),
      );
    }
    throw error;
  }
}
