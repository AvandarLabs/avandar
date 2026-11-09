/** How a query the agent ran for the user ended. */
export type DataAgentQueryOutcome =
  | {
      kind: "rows" | "empty";
      columns: ReadonlyArray<{ name: string; type: string }>;
      rowCount: number;
      /**
       * The first rows, only when the request asked for a preview. Only an
       * agent whose model runs on the user's device asks for one.
       */
      previewRows?: ReadonlyArray<readonly unknown[]>;
    }
  | { kind: "failed"; error: string };

/**
 * What the user submitted on a question card. `deferred` means the card is on
 * screen and the answer will arrive as the user's next chat message, which
 * is how the browser asks: the agent's turn ends instead of waiting.
 */
export type DataAgentUserAnswer =
  | { kind: "picked"; values: readonly string[] }
  | { kind: "typed"; text: string }
  | { kind: "dismissed" }
  | { kind: "deferred" };

/**
 * Everything the data agent's tools need from the place they run: the browser
 * (Data Explorer, DuckDB-Wasm, question cards, consent prompts) or the eval
 * (DuckDB in Node and a simulated user). The agent itself never reads rows.
 */
export type DataAgentHost = {
  /**
   * Runs SQL (table names already resolved) and shows the result to the user
   * as a table or chart. Resolves with the result's shape, and with its first
   * rows only when `previewRowCount` asks for them.
   */
  showQuery: (
    request: Readonly<{
      sql: string;
      summary: string;
      chart?: string;
      /** Rows to return in `previewRows`. Omitted: return no rows. */
      previewRowCount?: number;
    }>,
  ) => Promise<DataAgentQueryOutcome>;
  /**
   * Runs a read-only query locally and returns the first column's distinct
   * values, for value lookups. The values stay on this device unless a tool
   * decides to send a matched value to the model.
   */
  readColumnValues: (sql: string) => Promise<string[] | { error: string }>;
  /** Shows a question card with options and waits for the user's answer. */
  askUser: (
    request: Readonly<{
      question: string;
      options: readonly string[];
      isMulti: boolean;
      kind: "choice" | "values";
      /**
       * For a values card, the column the values come from, so the browser
       * can show its searchable list of stored values.
       */
      lookup?: Readonly<{
        listQuery: string;
        column: string;
        candidateValues: readonly string[];
      }>;
    }>,
  ) => Promise<DataAgentUserAnswer>;
  /**
   * Asks for consent before data values reach the model, when the values
   * call for it (for example they look like personal data). Resolves true
   * when the values may be sent.
   */
  approveValuesForModel: (
    request: Readonly<{
      values: readonly string[];
      reason: "matched_lookup" | "picked_lookup" | "query_filter";
    }>,
  ) => Promise<boolean>;
  /**
   * True when `text` is exactly a page placeholder (`<value 1>`) this host
   * restores before SQL runs. A lookup treats such a value as already
   * stored, since the value it stands for never reaches the model. Absent
   * for a host whose model sees no placeholders.
   */
  isHeldPlaceholder?: (text: string) => boolean;
};
