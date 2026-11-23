import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { LOOKUP_VALUES_TOOL } from "$/agent/dataAgent/dataAgentTools";
import { DiscoveryCandidateValues } from "@/components/ChatPanel/ClarificationCard/DiscoveryCandidateValues/DiscoveryCandidateValues";
import { buildCandidateLookupSqlFromDiscovery } from "@/components/ChatPanel/PendingClarificationBlock/buildCandidateLookupSqlFromDiscovery/buildCandidateLookupSqlFromDiscovery";
import { DEFERRED_ANSWER_TEXT } from "@/lib/agent/dataAgent/createDataAgentTools/askUserTool";
import type { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { DataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import type { AgentTool, AgentToolResult } from "@earendil-works/pi-agent-core";

const MAX_LISTED_VALUES = 100;

type LookupContext = Readonly<{
  host: DataAgentHost;
  state: DataAgentRunState;
  tableName: string;
  column: string;
}>;

type LookupMatch = { named: string; storedValue: string | undefined };

/** Text the model may have meant as a page placeholder, with any spacing. */
const PLACEHOLDER_LIKE = /^['"`]?\s*<\s*value\s*(\d+)\s*>\s*['"`]?$/i;

/**
 * The page placeholder (`<value N>`) a looked-up value or one of its forms
 * names, ignoring quotes, case, and spacing, or undefined for a plain value.
 */
function _readPlaceholder(
  value: Readonly<{ named: string; forms: readonly string[] }>,
): string | undefined {
  return [value.named, ...value.forms]
    .map((text) => {
      const number = PLACEHOLDER_LIKE.exec(text.trim())?.[1];
      return number === undefined ? undefined : `<value ${Number(number)}>`;
    })
    .find((placeholder) => {
      return placeholder !== undefined;
    });
}

/**
 * How a value is stored. A page placeholder the host holds (`<value 1>`)
 * is already the stored value as far as the model knows, so it matches
 * itself without a query: a lookup would compare its value in lower case,
 * miss a mixed-case value, and could tell the model what it stands for.
 */
async function _findStoredValue(
  context: LookupContext,
  value: Readonly<{ named: string; forms: readonly string[] }>,
): Promise<LookupMatch> {
  const placeholder = _readPlaceholder(value);
  if (placeholder && context.host.isHeldPlaceholder?.(placeholder)) {
    return { named: placeholder, storedValue: placeholder };
  }
  const candidateValues = [value.named, ...value.forms];
  const sql = buildCandidateLookupSqlFromDiscovery({
    discoveryQuery: `SELECT DISTINCT ${quoteSqlIdentifier(context.column)} FROM ${quoteSqlIdentifier(context.tableName)}`,
    column: context.column,
    candidateValues,
  });
  const matches = sql ? await context.host.readColumnValues(sql) : [];
  return {
    named: value.named,
    storedValue: Array.isArray(matches)
      ? DiscoveryCandidateValues.getUniqueMatch({
          candidateValues,
          discoveredValues: matches,
        })
      : undefined,
  };
}

function _buildListQuery(context: LookupContext): string {
  const column = quoteSqlIdentifier(context.column);
  return `SELECT DISTINCT ${column} FROM ${quoteSqlIdentifier(context.tableName)} WHERE ${column} IS NOT NULL ORDER BY 1 LIMIT ${MAX_LISTED_VALUES}`;
}

async function _listValues(
  context: LookupContext,
  listQuery: string,
): Promise<string[]> {
  const values = await context.host.readColumnValues(listQuery);
  return Array.isArray(values) ? values : [];
}

/** Shows the card for values the device could not match on its own. */
async function _askUserToPick(
  context: LookupContext,
  unmatched: readonly LookupMatch[],
  question: string,
): Promise<string> {
  const listQuery = _buildListQuery(context);
  const answer = await context.host.askUser({
    question,
    options: await _listValues(context, listQuery),
    isMulti: unmatched.length > 1,
    kind: "values",
    lookup: {
      listQuery,
      column: context.column,
      candidateValues: unmatched.map((lookup) => {
        return lookup.named;
      }),
    },
  });
  if (answer.kind === "deferred") {
    context.state.questions.push({
      kind: "values",
      question,
      answer: "(on screen)",
      isAutomatic: false,
    });
    context.state.isWaitingForUser = true;
    return DEFERRED_ANSWER_TEXT;
  }
  if (answer.kind === "dismissed") {
    context.state.questions.push({
      kind: "values",
      question,
      answer: "(dismissed)",
      isAutomatic: false,
    });
    return "The user dismissed the lookup. Do not filter on those values; say so in the summary.";
  }
  const picked = answer.kind === "picked" ? [...answer.values] : [];
  const isApproved = await context.host.approveValuesForModel({
    values: picked,
    reason: "picked_lookup",
  });
  if (!isApproved) {
    return "The user would not share the picked values. Explain how to filter for them in the Data Explorer.";
  }
  context.state.valuesSentToModel.push(...picked);
  const text =
    answer.kind === "typed"
      ? answer.text
      : picked
          .map((value) => {
            return `"${value}"`;
          })
          .join(", ");
  context.state.questions.push({
    kind: "values",
    question,
    answer: text,
    isAutomatic: false,
  });
  return answer.kind === "typed"
    ? `The user wrote: ${text}`
    : `The user picked: ${text}`;
}

function _describeMatches(matches: readonly LookupMatch[]): string {
  return matches
    .map((match) => {
      return `"${match.named}" is stored as "${match.storedValue}"`;
    })
    .join("; ");
}

/**
 * The tool's error result when a value names a page placeholder the host
 * does not hold, so the model fixes it instead of the user seeing a card.
 * Undefined for a host without placeholders.
 */
function _getUnknownPlaceholderResult(
  context: LookupContext,
  values: ReadonlyArray<{ named: string; forms: readonly string[] }>,
): AgentToolResult<undefined> | undefined {
  const { isHeldPlaceholder } = context.host;
  const unknown = isHeldPlaceholder
    ? values.map(_readPlaceholder).find((placeholder) => {
        return placeholder !== undefined && !isHeldPlaceholder(placeholder);
      })
    : undefined;
  return unknown === undefined
    ? undefined
    : {
        content: [
          {
            type: "text",
            text: `${unknown} is an unknown placeholder: use only the placeholders shown on the page.`,
          },
        ],
        details: undefined,
        isError: true,
      };
}

async function _execute(
  context: LookupContext,
  params: Readonly<{
    values: ReadonlyArray<{ named: string; forms: readonly string[] }>;
    question: string;
  }>,
): Promise<AgentToolResult<undefined>> {
  const placeholderError = _getUnknownPlaceholderResult(context, params.values);
  if (placeholderError) {
    return placeholderError;
  }
  const lookups = await Promise.all(
    params.values.map((value) => {
      return _findStoredValue(context, value);
    }),
  );
  const matched = lookups.filter((lookup) => {
    return lookup.storedValue !== undefined;
  });
  const unmatched = lookups.filter((lookup) => {
    return lookup.storedValue === undefined;
  });
  const matchedValues = matched.map((lookup) => {
    return lookup.storedValue!;
  });
  const isApproved = await context.host.approveValuesForModel({
    values: matchedValues,
    reason: "matched_lookup",
  });
  const parts: string[] = [];
  if (matched.length > 0 && isApproved) {
    context.state.valuesSentToModel.push(...matchedValues);
    context.state.questions.push({
      kind: "values",
      question: params.question,
      answer: matchedValues.join(", "),
      isAutomatic: true,
    });
    parts.push(
      `${_describeMatches(matched)} (matched automatically; use only if it means exactly what the user named).`,
    );
  }
  if (unmatched.length > 0) {
    parts.push(await _askUserToPick(context, unmatched, params.question));
  }
  return {
    content: [
      { type: "text", text: parts.join("\n") || "No matching values." },
    ],
    details: undefined,
    terminate: context.state.isWaitingForUser,
  };
}

/**
 * The tool that finds how values the user named are stored. It runs on the
 * device: an exact match (ignoring case and spaces) answers on its own, and
 * anything else shows the user a card of stored values to pick from. Only
 * matched or picked values reach the model.
 */
export function createLookupValuesTool(
  options: Readonly<{
    host: DataAgentHost;
    aliases: readonly SqlTableAlias.T[];
    state: DataAgentRunState;
  }>,
): AgentTool<typeof LOOKUP_VALUES_TOOL.parameters> {
  return {
    ...LOOKUP_VALUES_TOOL,
    executionMode: "sequential",
    execute: async (_toolCallId, params) => {
      const alias = options.aliases.find((entry) => {
        return entry.alias === params.table;
      });
      if (!alias) {
        throw new Error(
          `Unknown table alias "${params.table}". Use one of the aliases under DATASETS.`,
        );
      }
      return await _execute(
        {
          host: options.host,
          state: options.state,
          tableName: alias.tableName,
          column: params.column,
        },
        params,
      );
    },
  };
}
