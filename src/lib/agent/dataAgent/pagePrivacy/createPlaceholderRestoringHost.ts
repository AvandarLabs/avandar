import { mapDashboardBlockText } from "$/agent/dashboardBlocks/DashboardBlockFields";
import type {
  DataAgentHost,
  DataAgentQueryOutcome,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { SqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";

/**
 * A query's outcome as the model may read it: held values in column names
 * (DuckDB names an unaliased expression after its SQL, restored values
 * included), preview cells, and errors become their placeholders.
 */
function _maskOutcome(
  outcome: DataAgentQueryOutcome,
  vault: SqlPlaceholderVault,
): DataAgentQueryOutcome {
  if (outcome.kind === "failed") {
    return { ...outcome, error: vault.maskResultText(outcome.error) };
  }
  const columns = outcome.columns.map((column) => {
    return { ...column, name: vault.maskResultText(column.name) };
  });
  const previewRows = outcome.previewRows?.map((row) => {
    return row.map((cell) => {
      return typeof cell === "string" ? vault.maskResultText(cell) : cell;
    });
  });
  return {
    ...outcome,
    columns,
    ...(previewRows === undefined ? {} : { previewRows }),
  };
}

/** The host's chart check, with placeholders restored and the result masked. */
function _restoringCheckQuery(
  checkQuery: NonNullable<DataAgentHost["checkQuery"]>,
  vault: SqlPlaceholderVault,
): NonNullable<DataAgentHost["checkQuery"]> {
  return async (sql) => {
    const problem = vault.getPlaceholderError(sql);
    if (problem !== undefined) {
      return { kind: "failed", error: problem };
    }
    return _maskOutcome(await checkQuery(vault.restore(sql)), vault);
  };
}

/**
 * The host's dashboard add, with the dashboard name and every string the
 * block shows restored, and its SQL restored, so the user sees and saves
 * real values. Nothing restored here goes back to the model.
 */
function _restoringAddDashboardBlock(
  addDashboardBlock: NonNullable<DataAgentHost["addDashboardBlock"]>,
  vault: SqlPlaceholderVault,
): NonNullable<DataAgentHost["addDashboardBlock"]> {
  return (request) => {
    return addDashboardBlock({
      ...request,
      dashboard: vault.unmaskText(request.dashboard),
      block: mapDashboardBlockText(request.block, {
        mapSql: vault.restore,
        mapText: vault.unmaskText,
      }),
    });
  };
}

/**
 * The host's query run: placeholders in the SQL restored, the summary the
 * user may read shown with real values, and the outcome masked for the
 * model. A summary with an unknown placeholder keeps it as written.
 */
function _restoringShowQuery(
  showQuery: DataAgentHost["showQuery"],
  vault: SqlPlaceholderVault,
): DataAgentHost["showQuery"] {
  return async (request) => {
    const problem = vault.getPlaceholderError(request.sql);
    if (problem !== undefined) {
      return { kind: "failed", error: problem };
    }
    const outcome = await showQuery({
      ...request,
      sql: vault.restore(request.sql),
      summary: vault.unmaskText(request.summary),
    });
    return _maskOutcome(outcome, vault);
  };
}

/**
 * The host's question card with the question's placeholders shown as their
 * values, and each option's label too. The options themselves stay as the
 * model wrote them: the one the user picks is posted back to the model as
 * their next message, which must never carry a held value. Labels are added
 * only when one differs from its option.
 */
function _restoringAskUser(
  askUser: DataAgentHost["askUser"],
  vault: SqlPlaceholderVault,
): DataAgentHost["askUser"] {
  return (request) => {
    const optionLabels = request.options.map(vault.unmaskText);
    const hasRealLabel = optionLabels.some((label, index) => {
      return label !== request.options[index];
    });
    return askUser({
      ...request,
      question: vault.unmaskText(request.question),
      ...(hasRealLabel ? { optionLabels } : {}),
    });
  };
}

/**
 * Wraps a data agent host so SQL the model writes with page placeholders
 * (`'<value 1>'`) runs with the values the vault holds. `showQuery` and
 * `readColumnValues` restore before running, so the explorer, the chat
 * result card, and DuckDB all get the real SQL. SQL with an unknown
 * placeholder, or one inside a longer string, fails without running, with
 * the reason for the model.
 *
 * A dashboard chart's check is restored and masked like a query. A
 * dashboard block is restored before the host shows or saves it. The text
 * the user reads (a query's summary, a question card's question and option
 * labels) shows real values, and none of it goes back to the model.
 *
 * Nothing the model reads back carries a restored value: a query's column
 * names, preview cells, and error are masked, and a lookup that ran with
 * placeholders returns each held value as its placeholder.
 *
 * Use it for any host whose model is hosted, for example the browser's
 * conversation host or an eval host that mirrors it.
 */
export function createPlaceholderRestoringHost(
  host: DataAgentHost,
  vault: SqlPlaceholderVault,
): DataAgentHost {
  return {
    ...host,
    showQuery: _restoringShowQuery(host.showQuery, vault),
    askUser: _restoringAskUser(host.askUser, vault),
    readColumnValues: async (sql) => {
      const problem = vault.getPlaceholderError(sql);
      if (problem !== undefined) {
        return { error: problem };
      }
      const restoredSql = vault.restore(sql);
      const values = await host.readColumnValues(restoredSql);
      if (!Array.isArray(values)) {
        return { error: vault.maskResultText(values.error) };
      }
      return restoredSql === sql
        ? values
        : values.map((value) => {
            return vault.getPlaceholder(value) ?? value;
          });
    },
    isHeldPlaceholder: vault.isHeldPlaceholder,
    checkQuery: host.checkQuery
      ? _restoringCheckQuery(host.checkQuery, vault)
      : undefined,
    addDashboardBlock: host.addDashboardBlock
      ? _restoringAddDashboardBlock(host.addDashboardBlock, vault)
      : undefined,
  };
}
