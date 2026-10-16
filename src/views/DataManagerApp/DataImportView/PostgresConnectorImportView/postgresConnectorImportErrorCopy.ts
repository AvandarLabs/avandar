import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import type { ExternalDatasetErrorCode } from "@sbfn/connectors/connectors/ExternalDatasetConnector";
import type { I18n, MessageDescriptor } from "@lingui/core";

/** The notification a failed Postgres connection attempt shows. */
export type PostgresConnectorImportErrorCopy = {
  title: string;
  message: string;
};

type CopyDescriptors = {
  title: MessageDescriptor;
  message: MessageDescriptor;
};

const GENERIC_FAILURE: CopyDescriptors = {
  title: msg`Could not connect to the database`,
  message: msg`An unexpected error occurred while connecting.`,
};

/**
 * Chooses the message pair for one `connectors` connection failure.
 *
 * Split out from the `i18n._` calls so every string stays a `msg` macro at its
 * own call site: `docs/rules/i18n.md` bans relocating a `` t`…` `` macro out of
 * its lexical scope, because the extractor cannot follow it and the strings
 * never reach the catalogs.
 */
function _getCopyDescriptors(code: ExternalDatasetErrorCode): CopyDescriptors {
  return matchLiteral(code, {
    auth_failed: {
      title: msg`Authentication failed`,
      message: msg`The username or password was not accepted. Check the credentials and try again.`,
    },
    unreachable: {
      title: msg`Database is unreachable`,
      message: msg`Avandar could not reach that host and port. Check the address and that the server allows connections from Avandar.`,
    },
    ssl_required: {
      title: msg`A secure connection is required`,
      message: msg`This server requires SSL. Set SSL mode to "Require" and try again.`,
    },
    timeout: {
      title: msg`Connection timed out`,
      message: msg`The database did not respond in time. Check the address and try again.`,
    },
    too_large: {
      title: msg`This table is too large to import`,
      message: msg`This table has more rows than Avandar can import at once. Try a smaller table or view.`,
    },
    unknown: GENERIC_FAILURE,
  });
}

/**
 * Turns a failed Postgres connection/import attempt into the copy the user
 * sees. Branches on the edge function's `ExternalDatasetErrorCode`, never on
 * message prose, so each failure kind gets its own specific recovery
 * instruction instead of one generic "Could not connect" string.
 *
 * @param params The error code the `connectors` edge function
 *   returned, and the reactive `i18n` from `useLingui()`.
 * @returns The notification title and message.
 */
export function postgresConnectorImportErrorCopy(
  params: Readonly<{
    code: ExternalDatasetErrorCode | undefined;
    i18n: I18n;
  }>,
): PostgresConnectorImportErrorCopy {
  const descriptors =
    params.code === undefined
      ? GENERIC_FAILURE
      : _getCopyDescriptors(params.code);
  return {
    title: params.i18n._(descriptors.title),
    message: params.i18n._(descriptors.message),
  };
}
