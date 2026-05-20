import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_REQUEST } from "@sbfn/_shared/httpCodes.ts";
import {
  defineRoutes,
  GET,
  POST,
} from "@sbfn/_shared/MiniServer/MiniServer.ts";
import {
  deriveSessionSecret,
  hashTextPayload,
  verifyAckToken,
} from "@sbfn/_shared/privacy/ackToken.ts";
import {
  isReadOnlyDiscoveryQuery,
  MAX_DISCOVERY_QUERY_CHARS,
} from "@sbfn/_shared/privacy/discoveryQuery.ts";
import {
  buildSQLSystemPrompt,
  cleanGeneratedSQL,
} from "@sbfn/_shared/sql/buildSQLSystemPrompt.ts";
import cachedChatModelsResponseJSON from "@sbfn/chat/models.generated.json" with { type: "json" };
import { AppConfig } from "$/config/AppConfig.ts";
import { getAppURL } from "$/env/getAppURL.ts";
import {
  parseUseCacheFromURL,
  resolveChatModelsResponse,
} from "$/utils/chat/chatModelsCache.ts";
import { curateOpenRouterModels } from "$/utils/chat/curateOpenRouterModels.ts";
import { z } from "zod";
import type {
  ChatAPI,
  ChatClarifyRequest,
  ChatDashboardVizType,
  ChatGeneratedDashboardBlock,
  ChatGeneratedSQL,
  ChatModelsResponse,
  ChatPlan,
  ChatPlanStep,
  ChatResponse,
  ChatSessionSecretResponse,
  RegeneratePlanResponse,
} from "@sbfn/chat/chat.types.ts";
import type { OpenRouterModelInput } from "$/utils/chat/curateOpenRouterModels.ts";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");
if (!openRouterApiKey) {
  throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
}

const openRouterReferer = getAppURL();

const OPENROUTER_MODELS_URL =
  "https://openrouter.ai/api/v1/models?output_modalities=text&supported_parameters=tools";

/** Matches OpenRouter model ids such as `openai/gpt-4o-mini`. */
const OPENROUTER_MODEL_ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9._-]+$/i;

type OpenRouterModelsResponse = {
  data?: OpenRouterModelInput[];
};

const cachedChatModelsResponse =
  cachedChatModelsResponseJSON as ChatModelsResponse;

function _resolveChatModel(model: string | undefined): string {
  if (model && OPENROUTER_MODEL_ID_PATTERN.test(model)) {
    return model;
  }
  return AppConfig.chat.defaultModelId;
}

async function _loadLiveChatModelsResponse(): Promise<ChatModelsResponse> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      "HTTP-Referer": openRouterReferer,
      "X-Title": "Avandar",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter models API error: ${errorText}`);
  }

  const payload = (await response.json()) as OpenRouterModelsResponse;
  const groups = curateOpenRouterModels(payload.data ?? []);
  return { groups };
}

// Cheap heuristic for "this prompt is a refinement of the previous turn."
// When it matches AND the client gave us a `lastSql`, we attach the prior
// SQL to the system prompt so the model can edit it instead of rebuilding
// from scratch. The brief calls for "prior prompt + SQL only when relevant"
// to keep token spend honest; this regex is the relevance gate.
const REFINEMENT_HINTS =
  /^\s*(now|instead|also|actually|and|but|wait)\b|\b(it|that|this query|this one|the result|the previous|same|earlier|again|now also|drop|add|clean|remove)\b/i;

// OpenRouter speaks the OpenAI Chat Completions wire format, so we POST
// directly the same way `queries.routes.ts` calls OpenAI. The brief names
// Vercel AI SDK as the target stack; using it here means npm: imports inside
// a Deno edge function, which adds runtime risk we don't need yet. We can
// migrate once the rest of the chat flow is stable.

type Dataset = { id: string; name: string };
type DatasetColumn = { dataset_id: string; name: string; data_type: string };

type OpenRouterToolCall = {
  function?: { name?: string; arguments?: string };
};

/**
 * Thrown when an ack token fails verification. The MiniServer wraps
 * `AvaHTTPError` into a 4xx automatically, so this is the only thing
 * we need to do to surface a real `UNAPPROVED_DATA_TRANSFER` to
 * callers. Prefixed message lets the client / our logs distinguish
 * this from generic bad-request errors.
 */
function _rejectUnapprovedTransfer(detail: string): never {
  throw new AvaHTTPError(`UNAPPROVED_DATA_TRANSFER: ${detail}`, BAD_REQUEST);
}

function _arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

const MAX_CLARIFICATIONS_PER_QUESTION = 3;

const CLARIFICATION_MARKER_RE = /^\[Clarification answer:/m;

/**
 * Counts how many clarification answers the user has already provided in
 * the visible thread. The frontend tags each answered clarification by
 * appending a `[Clarification answer: ...]` block to the user message.
 * Once we reach the cap, we omit the `clarify` tool from the next turn so
 * the model has to commit to SQL.
 */
function _countClarificationsInHistory(
  messages: ReadonlyArray<{ role: string; content: string }>,
): number {
  let count = 0;
  for (const msg of messages) {
    if (msg.role !== "user") {
      continue;
    }
    if (CLARIFICATION_MARKER_RE.test(msg.content)) {
      count += 1;
    }
  }
  return count;
}

type RawClarifyArgs = {
  question?: unknown;
  rationale?: unknown;
  responseShape?: {
    kind?: unknown;
    placeholder?: unknown;
    options?: unknown;
    multi?: unknown;
    query?: unknown;
    column?: unknown;
  };
};

function _parseClarify(
  argsJson: string | undefined,
  priorClarifications: number,
): ChatClarifyRequest | undefined {
  if (priorClarifications >= MAX_CLARIFICATIONS_PER_QUESTION) {
    return undefined;
  }
  if (!argsJson) {
    return undefined;
  }
  let parsed: RawClarifyArgs;
  try {
    parsed = JSON.parse(argsJson) as RawClarifyArgs;
  } catch {
    return undefined;
  }

  if (
    typeof parsed.question !== "string" ||
    parsed.question.trim().length === 0
  ) {
    return undefined;
  }
  const rationale =
    typeof parsed.rationale === "string" ?
      parsed.rationale.trim() || undefined
    : undefined;

  const shape = parsed.responseShape;
  if (!shape || typeof shape !== "object") {
    return undefined;
  }
  const turnNumber = (priorClarifications + 1) as 1 | 2 | 3;

  if (shape.kind === "free_text") {
    return {
      question: parsed.question.trim(),
      rationale,
      responseShape: {
        kind: "free_text",
        ...(typeof shape.placeholder === "string" ?
          { placeholder: shape.placeholder.slice(0, 80) }
        : {}),
      },
      turnNumber,
    };
  }
  if (shape.kind === "fixed_options") {
    if (!Array.isArray(shape.options)) {
      return undefined;
    }
    const options = shape.options
      .filter((o): o is string => {
        return typeof o === "string";
      })
      .slice(0, 8);
    if (options.length < 2) {
      return undefined;
    }
    return {
      question: parsed.question.trim(),
      rationale,
      responseShape: {
        kind: "fixed_options",
        options,
        multi: shape.multi === true,
      },
      turnNumber,
    };
  }
  if (shape.kind === "discovery") {
    if (typeof shape.query !== "string" || typeof shape.column !== "string") {
      return undefined;
    }
    const query = shape.query.trim();
    const column = shape.column.trim();
    if (!isReadOnlyDiscoveryQuery(query) || column.length === 0) {
      return undefined;
    }
    return {
      question: parsed.question.trim(),
      rationale,
      responseShape: {
        kind: "discovery",
        query,
        column,
        multi: shape.multi === true,
      },
      turnNumber,
    };
  }
  return undefined;
}

type RawPlanStep = {
  id?: unknown;
  description?: unknown;
  type?: unknown;
  code?: unknown;
  inputs?: unknown;
  predictedSchema?: unknown;
  defaultViz?: unknown;
};

type RawProposePlanArgs = {
  steps?: unknown;
  rootMessage?: unknown;
};

const ALLOWED_PLAN_STEP_TYPES = new Set<ChatPlanStep["type"]>([
  "sql",
  "python",
  "r",
  "clarification",
]);
const ALLOWED_DEFAULT_VIZ = new Set(["table", "bar", "line", "scatter", "pie"]);
const MAX_PLAN_STEPS = 8;

const ALLOWED_DASHBOARD_VIZ_TYPES = new Set<ChatDashboardVizType>([
  "table",
  "bar",
  "line",
  "area",
  "scatter",
  "pie",
]);

const ALLOWED_DASHBOARD_BLOCK_KINDS = new Set([
  "DataViz",
  "HeadingBlock",
  "ParagraphBlock",
  "QuoteBlock",
  "DividerBlock",
  "CalloutBlock",
  "ListBlock",
  "CodeBlock",
  "TableBlock",
  "Card",
]);

const ALLOWED_BLOCK_ALIGN = new Set(["left", "center", "right"]);
const ALLOWED_HEADING_LEVELS = new Set([1, 2, 3, 4]);
const ALLOWED_CALLOUT_TONES = new Set(["info", "warning", "neutral"]);
const ALLOWED_LIST_TYPES = new Set(["ordered", "unordered"]);
const ALLOWED_TABLE_DELIMITERS = new Set(["comma", "tab", "pipe"]);

type RawDashboardBlockArgs = {
  kind?: unknown;
  prompt?: unknown;
  sql?: unknown;
  vizType?: unknown;
  text?: unknown;
  level?: unknown;
  align?: unknown;
  quote?: unknown;
  cite?: unknown;
  title?: unknown;
  body?: unknown;
  tone?: unknown;
  items?: unknown;
  listType?: unknown;
  code?: unknown;
  language?: unknown;
  data?: unknown;
  delimiter?: unknown;
  hasHeader?: unknown;
};

function _trimString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function _parseAddDashboardBlock(
  argsJson: string | undefined,
): ChatGeneratedDashboardBlock | undefined {
  if (!argsJson) {
    return undefined;
  }
  let parsed: RawDashboardBlockArgs;
  try {
    parsed = JSON.parse(argsJson) as RawDashboardBlockArgs;
  } catch {
    return undefined;
  }

  let kind = typeof parsed.kind === "string" ? parsed.kind.trim() : undefined;

  // Backward compatibility: older tool calls omitted `kind` for DataViz.
  if (
    kind === undefined &&
    typeof parsed.sql === "string" &&
    typeof parsed.prompt === "string"
  ) {
    kind = "DataViz";
  }

  if (kind === undefined || !ALLOWED_DASHBOARD_BLOCK_KINDS.has(kind)) {
    return undefined;
  }

  switch (kind) {
    case "DataViz": {
      const prompt = _trimString(parsed.prompt);
      const sqlRaw = _trimString(parsed.sql);
      const vizTypeRaw = _trimString(parsed.vizType);
      if (!prompt || !sqlRaw || !vizTypeRaw) {
        return undefined;
      }
      const sql = cleanGeneratedSQL(sqlRaw).trim();
      const vizType = vizTypeRaw as ChatDashboardVizType;
      if (sql.length === 0 || !ALLOWED_DASHBOARD_VIZ_TYPES.has(vizType)) {
        return undefined;
      }
      return { kind: "DataViz", prompt, sql, vizType };
    }
    case "HeadingBlock": {
      const text = _trimString(parsed.text);
      if (!text) {
        return undefined;
      }
      const level =
        (
          typeof parsed.level === "number" &&
          ALLOWED_HEADING_LEVELS.has(parsed.level as 1 | 2 | 3 | 4)
        ) ?
          (parsed.level as 1 | 2 | 3 | 4)
        : undefined;
      const alignRaw = _trimString(parsed.align);
      const align =
        alignRaw && ALLOWED_BLOCK_ALIGN.has(alignRaw) ?
          (alignRaw as "left" | "center" | "right")
        : undefined;
      return {
        kind: "HeadingBlock",
        text,
        ...(level ? { level } : {}),
        ...(align ? { align } : {}),
      };
    }
    case "ParagraphBlock": {
      const text = _trimString(parsed.text);
      if (!text) {
        return undefined;
      }
      const alignRaw = _trimString(parsed.align);
      const align =
        alignRaw && ALLOWED_BLOCK_ALIGN.has(alignRaw) ?
          (alignRaw as "left" | "center" | "right")
        : undefined;
      return { kind: "ParagraphBlock", text, ...(align ? { align } : {}) };
    }
    case "QuoteBlock": {
      const quote = _trimString(parsed.quote);
      if (!quote) {
        return undefined;
      }
      const cite = _trimString(parsed.cite);
      return { kind: "QuoteBlock", quote, ...(cite ? { cite } : {}) };
    }
    case "DividerBlock":
      return { kind: "DividerBlock" };
    case "CalloutBlock": {
      const title = _trimString(parsed.title);
      const body = _trimString(parsed.body);
      if (!title || !body) {
        return undefined;
      }
      const toneRaw = _trimString(parsed.tone);
      const tone =
        toneRaw && ALLOWED_CALLOUT_TONES.has(toneRaw) ?
          (toneRaw as "info" | "warning" | "neutral")
        : undefined;
      return { kind: "CalloutBlock", title, body, ...(tone ? { tone } : {}) };
    }
    case "ListBlock": {
      if (!Array.isArray(parsed.items)) {
        return undefined;
      }
      const items = parsed.items
        .filter((item): item is string => {
          return typeof item === "string" && item.trim().length > 0;
        })
        .map((item) => {
          return item.trim();
        });
      if (items.length === 0) {
        return undefined;
      }
      const listTypeRaw = _trimString(parsed.listType);
      const listType =
        listTypeRaw && ALLOWED_LIST_TYPES.has(listTypeRaw) ?
          (listTypeRaw as "ordered" | "unordered")
        : undefined;
      return { kind: "ListBlock", items, ...(listType ? { listType } : {}) };
    }
    case "CodeBlock": {
      const code = _trimString(parsed.code);
      if (!code) {
        return undefined;
      }
      const language = _trimString(parsed.language);
      return { kind: "CodeBlock", code, ...(language ? { language } : {}) };
    }
    case "TableBlock": {
      const data = _trimString(parsed.data);
      if (!data) {
        return undefined;
      }
      const delimiterRaw = _trimString(parsed.delimiter);
      const delimiter =
        delimiterRaw && ALLOWED_TABLE_DELIMITERS.has(delimiterRaw) ?
          (delimiterRaw as "comma" | "tab" | "pipe")
        : undefined;
      const hasHeader =
        typeof parsed.hasHeader === "boolean" ? parsed.hasHeader : undefined;
      return {
        kind: "TableBlock",
        data,
        ...(delimiter ? { delimiter } : {}),
        ...(hasHeader !== undefined ? { hasHeader } : {}),
      };
    }
    case "Card": {
      const title = _trimString(parsed.title);
      if (!title) {
        return undefined;
      }
      return { kind: "Card", title };
    }
    default:
      return undefined;
  }
}

function _dashboardBlockSummary(block: ChatGeneratedDashboardBlock): string {
  switch (block.kind) {
    case "DataViz":
      return `Added "${block.prompt}" to your dashboard as a ${block.vizType}.`;
    case "HeadingBlock":
      return `Added a heading: "${block.text}".`;
    case "ParagraphBlock":
      return `Added a paragraph to your dashboard.`;
    case "QuoteBlock":
      return `Added a quote to your dashboard.`;
    case "DividerBlock":
      return `Added a divider to your dashboard.`;
    case "CalloutBlock":
      return `Added a callout: "${block.title}".`;
    case "ListBlock":
      return `Added a list with ${block.items.length} item(s) to your dashboard.`;
    case "CodeBlock":
      return `Added a code block to your dashboard.`;
    case "TableBlock":
      return `Added a table to your dashboard.`;
    case "Card":
      return `Added a card: "${block.title}".`;
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

function _parseProposePlan(argsJson: string | undefined): ChatPlan | undefined {
  if (!argsJson) {
    return undefined;
  }
  let parsed: RawProposePlanArgs;
  try {
    parsed = JSON.parse(argsJson) as RawProposePlanArgs;
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    return undefined;
  }
  const rootMessage =
    typeof parsed.rootMessage === "string" ? parsed.rootMessage.trim() : "";

  const cleaned: ChatPlanStep[] = [];
  for (const raw of (parsed.steps as RawPlanStep[]).slice(0, MAX_PLAN_STEPS)) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    if (
      typeof raw.id !== "string" ||
      typeof raw.description !== "string" ||
      typeof raw.code !== "string"
    ) {
      continue;
    }
    const id = raw.id.trim();
    const description = raw.description.trim();
    const code = raw.code.trim();
    if (id.length === 0 || description.length === 0 || code.length === 0) {
      continue;
    }
    const stepType =
      (
        typeof raw.type === "string" &&
        ALLOWED_PLAN_STEP_TYPES.has(raw.type as ChatPlanStep["type"])
      ) ?
        (raw.type as ChatPlanStep["type"])
      : "sql";
    const inputs: string[] =
      Array.isArray(raw.inputs) ?
        raw.inputs.filter((i): i is string => {
          return typeof i === "string";
        })
      : [];
    const predictedSchema: Array<{ name: string; type: string }> =
      Array.isArray(raw.predictedSchema) ?
        (raw.predictedSchema as Array<{ name?: unknown; type?: unknown }>)
          .filter((c) => {
            return typeof c?.name === "string" && typeof c?.type === "string";
          })
          .map((c) => {
            return { name: c.name as string, type: c.type as string };
          })
      : [];
    const defaultViz =
      (
        typeof raw.defaultViz === "string" &&
        ALLOWED_DEFAULT_VIZ.has(raw.defaultViz)
      ) ?
        (raw.defaultViz as ChatPlanStep["defaultViz"])
      : undefined;
    cleaned.push({
      id,
      description,
      type: stepType,
      code,
      inputs,
      predictedSchema,
      ...(defaultViz ? { defaultViz } : {}),
    });
  }
  if (cleaned.length === 0) {
    return undefined;
  }
  return { steps: cleaned, rootMessage };
}

/**
 * Shared persona for all Avandar chat surfaces. A clear expert role in the
 * system prompt improves tool use, clarification quality, and plain-language
 * explanations for non-technical users.
 */
const avandarPersonaPrefix = `
You are Avandar, an embedded data analyst inside the Avandar workspace.

PERSONA AND EXPERTISE
You are a senior data analyst with deep hands-on expertise in:
- Data analytics: exploratory analysis, KPIs, trends, and communicating findings
  clearly to program managers and decision-makers.
- DuckDB, SQL, and Python (and R when appropriate): idiomatic queries, sound joins
  and aggregations, and knowing when SQL vs a short script step is the right tool.
- Social-sector and program data: NGOs, government programs, grants, beneficiaries,
  service delivery, M&E indicators, and survey-style fields.
- Real-world bias and ethics: subjective labels ("vulnerable", "at-risk", "success"),
  proxy metrics, missing data, and definitions that embed human judgment.

AUDIENCE AND TONE
Most users are not software engineers. Use plain language, avoid jargon unless the
user uses it first, and never talk down. When a question is underspecified or uses
loaded terms, ask one neutral clarifying question before assuming a definition.
State choices briefly when you proceed with a reasonable default.

`;

const dataExplorerSystemPrefix = `${avandarPersonaPrefix}
The user is currently in the Data Explorer. When they ask a data question,
either call the \`generateSql\` tool with a DuckDB SELECT, or call the
\`clarify\` tool first if the question is materially ambiguous.

CLARIFYING QUESTIONS

Use your social-sector and bias expertise to spot loaded or subjective terms
before generating SQL. Prefer \`clarify\` over guessing when the answer would
change who or what is counted.

When to call \`clarify\`:
- Subjective terms without a clear metric ("good", "best", "poor",
  "important", "successful").
- Multi-meaning columns (e.g. "client" could mean customer or beneficiary).
- Subjective categorizations the model has to guess at ("poverty
  indicators", "at-risk groups").
- Ambiguous scopes ("this year" when the data spans multiple years).

When NOT to call \`clarify\`:
- The metadata already disambiguates the question.
- The ambiguity is minor and a reasonable default exists — make the
  choice, explain it briefly in your reply, and proceed with SQL.
- The question is straightforward ("monthly revenue by region").

How to clarify:
- Ask ONE question at a time. Keep it under 25 words.
- Prefer \`fixed_options\` (≤8 choices) when you can enumerate from the
  metadata. Use \`free_text\` for open-ended or numeric answers.
- For "which of the values in column X..." questions where you do NOT
  know the values from metadata alone, use the \`discovery\` shape:
  emit a short \`SELECT DISTINCT "col" FROM "dataset" ORDER BY "col"
  LIMIT 100\` query. The user will be shown a dropdown of the actual
  values, pick from them, and their selection is returned to you.
  Only emit read-only SELECT or WITH statements; no semicolons.
- State neutrally. Do not assume the answer.
- NEVER use gendered, ethnic, religious, or culturally loaded framing.
- Include a brief \`rationale\` so the user understands why you're asking.

When the user has answered prior clarification(s), the answers appear as
\`[Clarification answer: ...]\` lines. Formats you may see:
- A preset choice you offered (plain text after the prefix).
- \`(none of the listed options)\` — your options did not fit; ask a
  follow-up \`clarify\` (often \`free_text\`) to learn what they mean.
- \`(custom answer: ...)\` — they typed their own answer; treat it as
  authoritative user intent, not as one of your listed options.

Re-analyze every clarification answer before calling \`generateSql\`:
- If the answer is still underspecified for confident SQL (which tables,
  columns, filters, metrics, or time range), call \`clarify\` again with a
  more targeted question. Do not guess at data the user has not explicitly
  named or selected.
- Discovery dropdown values are the only raw data values you may treat as
  user-selected filters; never invent or assume unseen column values.
- Build on prior answers; do not repeat the same question.

After at most 3 clarification turns within one analytic question, make
a reasonable assumption, state it briefly in \`assistantText\`, and call
\`generateSql\`. The client will ask the user to approve any filter literals
in the SQL that they did not explicitly provide, or that look like personal
data, before the query runs.

MULTI-STEP PLANS

When the analysis is clearer broken into 2-N steps — especially when an
intermediate result feeds the next, or the user wants a "build up to it"
breakdown — call the \`proposePlan\` tool. Each step has a stable id;
later steps reference earlier ones via the temp view \`step_<id>\`.

Plans can mix languages. Each step's \`type\` is one of:
- \`sql\`: a DuckDB SELECT. PREFER this. Even when the analysis spans
  many steps, multi-step SQL is the default.
- \`python\`: when the work is genuinely statistical (regression,
  clustering, fuzzy matching, custom dedup) or a heavy
  pandas-style dataframe transformation that SQL handles awkwardly.
- \`r\`: when the work is statistics-heavy and tidyverse idioms apply
  (hypothesis tests, mixed models, time-series decomposition).

Heuristic — if a plan is going to need MORE than 7 SQL steps, that
is still allowed, but PAUSE and ask: would a single Python or R step
express this more cleanly? When in doubt, stay with SQL.

DO NOT use Python or R for things SQL does well: filtering,
aggregation, JOINs, window functions, ORDER BY/LIMIT, simple
arithmetic. Reach for Python only when you genuinely can't do it in
SQL or it would take >7 steps.

Calling conventions for non-SQL steps:
- Each \`inputs\` entry maps to a local variable named after the
  upstream view (e.g. \`step_filter\`). For python, the variable is
  a pandas.DataFrame. For r, it's a tibble.
- The step's \`code\` must assign the final result to a variable
  named \`result\` (pandas.DataFrame for python, tibble for r). The
  runtime serialises \`result\` back to parquet for downstream SQL
  steps to reference as \`step_<id>\`.
- Don't import anything that would need network access — the
  sandbox blocks all outbound connections. The standard scientific
  stack (pandas, numpy, scipy, scikit-learn, statsmodels for python;
  tidyverse, broom for r) is pre-installed.

When NOT to use \`proposePlan\`:
- Single-query answers — use \`generateSql\` directly.
- When the user explicitly asks for "just the SQL" or "one query".

After you call \`proposePlan\`, the user will see the plan as a
visual DAG and APPROVE OR REJECT it before any step runs. Phrase
step descriptions clearly enough that a non-technical user can
read them and decide.

If the user asks something that is not a data question, answer it
concisely without calling any tool.`;

const dashboardsSystemPrefix = `${avandarPersonaPrefix}
The user is currently editing a dashboard. To add content, call
\`addDashboardBlock\` with a \`kind\` and the fields for that block. The
editor appends the block to the page immediately.

Rules for \`addDashboardBlock\`:
- ONE block per turn. If the user asks for multiple items, add the most
  important one and mention the rest in your reply.
- \`kind\` must be one of:
  - \`DataViz\` — charts and tables (requires \`prompt\`, \`sql\`, \`vizType\`).
  - \`HeadingBlock\` — title text (requires \`text\`; optional \`level\` 1–4).
  - \`ParagraphBlock\` — body copy (requires \`text\`).
  - \`QuoteBlock\` — quotation (requires \`quote\`; optional \`cite\`).
  - \`DividerBlock\` — horizontal rule (no extra fields).
  - \`CalloutBlock\` — highlighted box (requires \`title\`, \`body\`; optional \`tone\`: info, warning, neutral).
  - \`ListBlock\` — bullet or numbered list (requires \`items\` string array; optional \`listType\`: ordered, unordered).
  - \`CodeBlock\` — code snippet (requires \`code\`; optional \`language\`).
  - \`TableBlock\` — markdown-style table data as CSV text (requires \`data\`).
  - \`Card\` — titled card container (requires \`title\`).

DataViz rules:
- \`vizType\`: table, bar, line, area, scatter, pie.
- Wrap dataset ids and column names in double quotes in \`sql\`.
- \`prompt\` is a short label for the chart ("Monthly revenue").

For headings, copy, callouts, lists, etc., use the matching \`kind\` — do not
use DataViz unless the user wants data from SQL.

If the user is only asking a general question (not to add a block), answer in
text without calling the tool.`;

const genericSystemPrompt = `${avandarPersonaPrefix}
The user is not currently on a page where data tools are available. Be concise and
helpful, and let them know they can switch to the Data Explorer to ask questions about their data.`;

async function fetchSchemaForWorkspace(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any;
  workspaceId: string;
}): Promise<{ datasets: Dataset[]; columns: DatasetColumn[] }> {
  const { supabaseClient, workspaceId } = args;

  const { data: datasets } = await supabaseClient
    .from("datasets")
    .select("id, name, workspace_id")
    .eq("workspace_id", workspaceId)
    .throwOnError();

  if (!datasets || datasets.length === 0) {
    return { datasets: [], columns: [] };
  }

  const { data: columns } = await supabaseClient
    .from("dataset_columns")
    .select("dataset_id, name, data_type")
    .eq("workspace_id", workspaceId)
    .in(
      "dataset_id",
      datasets.map((d: Dataset) => {
        return d.id;
      }),
    )
    .throwOnError();

  return { datasets: datasets ?? [], columns: columns ?? [] };
}

/**
 * Routes for the persistent chat panel ("Ask Avandar"). The client posts the
 * current thread plus page context; the model decides whether to call the
 * `generateSql` tool. When it does, the resulting SQL is returned to the
 * client which auto-applies it to the Data Explorer canvas.
 */
export const Routes = defineRoutes<ChatAPI>("chat", {
  /**
   * Returns the OpenRouter model catalog for the chat panel model picker.
   * The edge function proxies OpenRouter so the API key stays server-side.
   * Returns a curated, grouped catalog (allowlist, deduped slugs, open vs
   * proprietary) for the chat panel model picker.
   */
  "/models": {
    GET: GET("/models").action(
      async ({ request }): Promise<ChatModelsResponse> => {
        return await resolveChatModelsResponse({
          useCache: parseUseCacheFromURL(request.url),
          cachedResponse: cachedChatModelsResponse,
          loadLiveResponse: _loadLiveChatModelsResponse,
        });
      },
    ),
  },
  /**
   * Handles a chat turn for the Ask Avandar panel in a workspace.
   * The client sends the thread, page context, and optional model id; we call
   * OpenRouter and may invoke `generateSql` on the Data Explorer.
   * The response is assistant text plus optional SQL for the canvas to run.
   */
  "/:workspaceId/messages": {
    POST: POST({
      path: "/:workspaceId/messages",
      schema: {
        workspaceId: z.uuid(),
      },
    })
      .bodySchema({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant", "system"]),
            content: z.string(),
          }),
        ),
        context: z.object({
          app: z.enum(["data-explorer", "data-sources", "dashboards", "other"]),
          openDatasetId: z.string().optional(),
          lastSql: z.string().optional(),
          lastError: z.string().optional(),
          dashboardId: z.string().optional(),
        }),
        model: z.string().optional(),
        consentAcks: z
          .array(
            z.object({
              ackToken: z.string(),
              scope: z.union([
                z.object({
                  kind: z.literal("message_index"),
                  index: z.number().int().nonnegative(),
                }),
                z.object({
                  kind: z.literal("values"),
                  sourceColumn: z.string().optional(),
                }),
              ]),
            }),
          )
          .optional(),
      })
      .action(async ({ pathParams, body, supabaseClient, user }) => {
        const { workspaceId } = pathParams;
        const { messages, context, model: requestedModel, consentAcks } = body;
        const model = _resolveChatModel(requestedModel);

        // Verify any consent acks BEFORE we burn an LLM call. Each ack
        // proves the user actually approved a flagged payload through
        // the client-side consent modal. If any ack is invalid the whole
        // request is rejected with UNAPPROVED_DATA_TRANSFER (400).
        if (consentAcks && consentAcks.length > 0) {
          for (const ack of consentAcks) {
            if (ack.scope.kind === "message_index") {
              const msg = messages[ack.scope.index];
              if (!msg) {
                return _rejectUnapprovedTransfer(
                  `consentAck scope.index=${ack.scope.index} out of range`,
                );
              }
              const expectedHash = await hashTextPayload(msg.content);
              const result = await verifyAckToken({
                token: ack.ackToken,
                expectedWorkspaceId: workspaceId,
                expectedUserId: user.id,
                expectedPayloadHash: expectedHash,
              });
              if (!result.valid) {
                return _rejectUnapprovedTransfer(
                  `consentAck failed verification: ${result.reason}`,
                );
              }
            }
            // `values` scope is wired for Phase 2+ row-data flows;
            // until those land we don't have a value payload to hash
            // against on this turn, so we accept-on-presence and let
            // the future row-data path tighten the contract.
          }
        }

        const isDataExplorer = context.app === "data-explorer";
        const isDashboards = context.app === "dashboards";
        const needsSchema = isDataExplorer || isDashboards;

        // Only fetch the schema when we'll actually use it.
        const schema =
          needsSchema ?
            await fetchSchemaForWorkspace({ supabaseClient, workspaceId })
          : { datasets: [], columns: [] };

        const lastUserPrompt =
          [...messages].reverse().find((m) => {
            return m.role === "user";
          })?.content ?? "";

        const sqlSystemPrompt =
          needsSchema ?
            buildSQLSystemPrompt({
              prompt: lastUserPrompt,
              datasets: schema.datasets,
              columns: schema.columns,
            })
          : "";

        const hasLastSql =
          typeof context.lastSql === "string" && context.lastSql.length > 0;

        const isLikelyRefinement =
          isDataExplorer && hasLastSql && REFINEMENT_HINTS.test(lastUserPrompt);

        const refinementContext =
          isLikelyRefinement && hasLastSql ?
            `\n\nThe user's previous turn produced this SQL, and the current message looks like a refinement of it. When generating SQL, edit this prior query rather than starting over.\n\nPrevious SQL:\n\`\`\`sql\n${context.lastSql}\n\`\`\``
          : "";

        // When the prior SQL produced a runtime error and the client passed
        // it back, surface it so the model can fix the query in this turn.
        const errorContext =
          isDataExplorer && hasLastSql && context.lastError ?
            `\n\nThe previous SQL failed at runtime with this error. Use the error to fix the query.\n\nPrevious SQL:\n\`\`\`sql\n${context.lastSql}\n\`\`\`\n\nError:\n${context.lastError}`
          : "";

        const systemContent =
          isDataExplorer ?
            `${dataExplorerSystemPrefix}\n\n${sqlSystemPrompt}${refinementContext}${errorContext}`
          : isDashboards ? `${dashboardsSystemPrefix}\n\n${sqlSystemPrompt}`
          : genericSystemPrompt;

        const requestBody: Record<string, unknown> = {
          model,
          messages: [{ role: "system", content: systemContent }, ...messages],
          temperature: 0.3,
        };

        const priorClarifications = _countClarificationsInHistory(messages);
        const clarificationCapReached =
          priorClarifications >= MAX_CLARIFICATIONS_PER_QUESTION;

        if (isDataExplorer) {
          requestBody.tools = [
            {
              type: "function",
              function: {
                name: "generateSql",
                description:
                  "Submit a DuckDB SELECT statement that answers the user's data question. Use this whenever the user asks about their data.",
                parameters: {
                  type: "object",
                  properties: {
                    sql: {
                      type: "string",
                      description:
                        "Valid DuckDB SELECT. Wrap all table IDs and column names in double quotes.",
                    },
                  },
                  required: ["sql"],
                  additionalProperties: false,
                },
              },
            },
            ...(clarificationCapReached ?
              []
            : [
                {
                  type: "function",
                  function: {
                    name: "clarify",
                    description:
                      "Ask the user one clarifying question when their request is materially ambiguous and the answer would change the SQL. Prefer fixed_options when the choices can be enumerated from metadata; the UI always offers Something else and None of the above, so re-clarify if their answer is still ambiguous. Use this BEFORE generateSql when ambiguous.",
                    parameters: {
                      type: "object",
                      properties: {
                        question: {
                          type: "string",
                          maxLength: 200,
                          description:
                            "≤25 words, neutrally phrased, single question.",
                        },
                        rationale: {
                          type: "string",
                          maxLength: 200,
                          description:
                            "Optional one-sentence explanation of why you are asking.",
                        },
                        responseShape: {
                          oneOf: [
                            {
                              type: "object",
                              properties: {
                                kind: { const: "free_text" },
                                placeholder: { type: "string", maxLength: 80 },
                              },
                              required: ["kind"],
                              additionalProperties: false,
                            },
                            {
                              type: "object",
                              properties: {
                                kind: { const: "fixed_options" },
                                options: {
                                  type: "array",
                                  minItems: 2,
                                  maxItems: 8,
                                  items: { type: "string", maxLength: 80 },
                                },
                                multi: { type: "boolean" },
                              },
                              required: ["kind", "options", "multi"],
                              additionalProperties: false,
                            },
                            {
                              type: "object",
                              properties: {
                                kind: { const: "discovery" },
                                query: {
                                  type: "string",
                                  description:
                                    "A short DuckDB SELECT statement whose results populate the dropdown. Read-only; no semicolons.",
                                  maxLength: MAX_DISCOVERY_QUERY_CHARS,
                                },
                                column: {
                                  type: "string",
                                  description:
                                    "The column the user is choosing values from. Informs PII detection.",
                                  maxLength: 80,
                                },
                                multi: { type: "boolean" },
                              },
                              required: ["kind", "query", "column", "multi"],
                              additionalProperties: false,
                            },
                          ],
                        },
                      },
                      required: ["question", "responseShape"],
                      additionalProperties: false,
                    },
                  },
                },
              ]),
            {
              type: "function",
              function: {
                name: "proposePlan",
                description:
                  "Propose a multi-step analytic plan (≤8 SQL steps) when the analysis is clearer broken down than as a single query.",
                parameters: {
                  type: "object",
                  properties: {
                    rootMessage: {
                      type: "string",
                      description:
                        "One short paragraph explaining the plan to the user, shown above the DAG.",
                      maxLength: 400,
                    },
                    steps: {
                      type: "array",
                      minItems: 2,
                      maxItems: MAX_PLAN_STEPS,
                      items: {
                        type: "object",
                        properties: {
                          id: {
                            type: "string",
                            description:
                              "Stable id used by `step_<id>` references in later steps.",
                            maxLength: 40,
                          },
                          description: { type: "string", maxLength: 200 },
                          type: {
                            type: "string",
                            enum: ["sql", "python", "r", "clarification"],
                          },
                          code: { type: "string" },
                          inputs: {
                            type: "array",
                            items: { type: "string" },
                            default: [],
                          },
                          predictedSchema: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                type: { type: "string" },
                              },
                              required: ["name", "type"],
                              additionalProperties: false,
                            },
                          },
                          defaultViz: {
                            type: "string",
                            enum: ["table", "bar", "line", "scatter", "pie"],
                          },
                        },
                        required: ["id", "description", "type", "code"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["steps", "rootMessage"],
                  additionalProperties: false,
                },
              },
            },
          ];
          requestBody.tool_choice = "auto";
        }

        if (isDashboards) {
          requestBody.tools = [
            {
              type: "function",
              function: {
                name: "addDashboardBlock",
                description:
                  "Append a new dashboard block (P-block) to the page the user is editing. Set `kind` and the fields for that block type.",
                parameters: {
                  type: "object",
                  properties: {
                    kind: {
                      type: "string",
                      enum: [
                        "DataViz",
                        "HeadingBlock",
                        "ParagraphBlock",
                        "QuoteBlock",
                        "DividerBlock",
                        "CalloutBlock",
                        "ListBlock",
                        "CodeBlock",
                        "TableBlock",
                        "Card",
                      ],
                      description:
                        "Block type to create. Use HeadingBlock for titles, ParagraphBlock for body text, DataViz only for SQL-driven charts/tables.",
                    },
                    prompt: {
                      type: "string",
                      description: "DataViz only: short label for the chart.",
                      maxLength: 200,
                    },
                    sql: {
                      type: "string",
                      description:
                        "DataViz only: DuckDB SELECT. Wrap dataset ids and column names in double quotes.",
                    },
                    vizType: {
                      type: "string",
                      enum: ["table", "bar", "line", "area", "scatter", "pie"],
                      description: "DataViz only: visualization type.",
                    },
                    text: {
                      type: "string",
                      description:
                        "HeadingBlock or ParagraphBlock: display text.",
                    },
                    level: {
                      type: "number",
                      description: "HeadingBlock only: 1, 2, 3, or 4.",
                    },
                    align: {
                      type: "string",
                      enum: ["left", "center", "right"],
                      description: "HeadingBlock or ParagraphBlock alignment.",
                    },
                    quote: {
                      type: "string",
                      description: "QuoteBlock: quotation body.",
                    },
                    cite: {
                      type: "string",
                      description: "QuoteBlock: attribution.",
                    },
                    title: {
                      type: "string",
                      description: "CalloutBlock or Card title.",
                    },
                    body: {
                      type: "string",
                      description: "CalloutBlock body text.",
                    },
                    tone: {
                      type: "string",
                      enum: ["info", "warning", "neutral"],
                      description: "CalloutBlock tone.",
                    },
                    items: {
                      type: "array",
                      items: { type: "string" },
                      description: "ListBlock: list item strings.",
                    },
                    listType: {
                      type: "string",
                      enum: ["ordered", "unordered"],
                      description: "ListBlock list style.",
                    },
                    code: {
                      type: "string",
                      description: "CodeBlock source code.",
                    },
                    language: {
                      type: "string",
                      description: "CodeBlock language hint.",
                    },
                    data: {
                      type: "string",
                      description: "TableBlock: CSV or delimited table text.",
                    },
                    delimiter: {
                      type: "string",
                      enum: ["comma", "tab", "pipe"],
                      description: "TableBlock delimiter.",
                    },
                    hasHeader: {
                      type: "boolean",
                      description: "TableBlock: first row is header.",
                    },
                  },
                  required: ["kind"],
                  additionalProperties: false,
                },
              },
            },
          ];
          requestBody.tool_choice = "auto";
        }

        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterApiKey}`,
              "HTTP-Referer": openRouterReferer,
              "X-Title": "Avandar",
            },
            body: JSON.stringify(requestBody),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API error: ${errorText}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await response.json();
        const message = data.choices?.[0]?.message;
        const text = (message?.content ?? "").trim();

        let generatedSql: ChatGeneratedSQL | undefined;
        let clarification: ChatClarifyRequest | undefined;
        let plan: ChatPlan | undefined;
        let dashboardBlock: ChatGeneratedDashboardBlock | undefined;
        const toolCalls: OpenRouterToolCall[] = message?.tool_calls ?? [];

        const generateSqlToolCall = toolCalls.find((tc) => {
          return tc?.function?.name === "generateSql";
        });
        if (generateSqlToolCall?.function) {
          try {
            const args = JSON.parse(
              generateSqlToolCall.function.arguments ?? "{}",
            );
            if (typeof args.sql === "string" && args.sql.trim()) {
              generatedSql = {
                sql: cleanGeneratedSQL(args.sql),
                prompt: lastUserPrompt,
              };
            }
          } catch {
            // Malformed tool args: ignore this tool call. The assistant
            // will still get a chance to produce text below.
          }
        }

        // Only honor `clarify` if no SQL was also produced this turn — the
        // SQL path is the terminal one. If the model emitted both, it
        // already knows what to do, so we skip the clarification.
        if (!generatedSql) {
          const clarifyToolCall = toolCalls.find((tc) => {
            return tc?.function?.name === "clarify";
          });
          if (clarifyToolCall?.function) {
            const parsed = _parseClarify(
              clarifyToolCall.function.arguments,
              priorClarifications,
            );
            if (parsed) {
              clarification = parsed;
            }
          }
        }

        // proposePlan is terminal like generateSql — only honor if neither
        // of the other two terminal paths fired this turn.
        if (!generatedSql && !clarification) {
          const planToolCall = toolCalls.find((tc) => {
            return tc?.function?.name === "proposePlan";
          });
          if (planToolCall?.function) {
            const parsed = _parseProposePlan(planToolCall.function.arguments);
            if (parsed) {
              plan = parsed;
            }
          }
        }

        // Dashboard block creation. Only honored on the dashboards surface.
        if (isDashboards && !generatedSql && !clarification && !plan) {
          const blockToolCall = toolCalls.find((tc) => {
            return tc?.function?.name === "addDashboardBlock";
          });
          if (blockToolCall?.function) {
            const parsed = _parseAddDashboardBlock(
              blockToolCall.function.arguments,
            );
            if (parsed) {
              dashboardBlock = parsed;
            }
          }
        }

        const assistantText =
          text ||
          (generatedSql ?
            "Here is the SQL I ran. Results are on the canvas to the left."
          : plan ? plan.rootMessage || "Here is a plan to answer your question."
          : clarification ? clarification.question
          : dashboardBlock ? _dashboardBlockSummary(dashboardBlock)
          : "I could not generate a query for that. Try rephrasing.");

        const result: ChatResponse = {
          assistantText,
          ...(generatedSql ? { generatedSql: generatedSql } : {}),
          ...(clarification ? { clarification } : {}),
          ...(plan ? { plan } : {}),
          ...(dashboardBlock ? { dashboardBlock } : {}),
        };
        return result;
      }),
  },

  /**
   * Phase 4 — Schema-Drift Regen. When a plan step's actual schema
   * doesn't match its predicted schema, the frontend posts the drift
   * report here and we ask the LLM to regenerate just the affected
   * downstream steps. The response is a list of `{ stepId, code,
   * predictedSchema }` items the frontend dispatches to
   * `replaceStepCode`.
   */
  "/:workspaceId/regenerate-plan": {
    POST: POST({
      path: "/:workspaceId/regenerate-plan",
      schema: { workspaceId: z.uuid() },
    })
      .bodySchema({
        driftReport: z.object({
          driftedStepId: z.string(),
          driftedStepDescription: z.string(),
          predictedSchema: z.array(
            z.object({ name: z.string(), type: z.string() }),
          ),
          actualSchema: z.array(
            z.object({ name: z.string(), type: z.string() }),
          ),
          affectedStepIds: z.array(z.string()),
          plan: z.object({
            steps: z.array(
              z.object({
                id: z.string(),
                description: z.string(),
                type: z.enum(["sql", "python", "r", "clarification"]),
                code: z.string(),
                inputs: z.array(z.string()),
                predictedSchema: z.array(
                  z.object({ name: z.string(), type: z.string() }),
                ),
                defaultViz: z
                  .enum(["table", "bar", "line", "scatter", "pie"])
                  .optional(),
              }),
            ),
            rootMessage: z.string(),
          }),
        }),
        model: z.string().optional(),
      })
      .action(async ({ body }): Promise<RegeneratePlanResponse> => {
        const { driftReport, model: requestedModel } = body;
        const model = _resolveChatModel(requestedModel);

        const driftedStep = driftReport.plan.steps.find((s) => {
          return s.id === driftReport.driftedStepId;
        });
        if (!driftedStep) {
          return {
            steps: [],
            explanation:
              "Could not find the drifted step in the plan; nothing to regenerate.",
          };
        }

        const affectedSet = new Set(driftReport.affectedStepIds);
        const affectedSteps = driftReport.plan.steps.filter((s) => {
          return affectedSet.has(s.id);
        });
        if (affectedSteps.length === 0) {
          return {
            steps: [],
            explanation:
              "No downstream steps depend on the drifted step; nothing to regenerate.",
          };
        }

        const fmtSchema = (
          cols: Array<{ name: string; type: string }>,
        ): string => {
          return cols
            .map((c) => {
              return `${c.name}:${c.type}`;
            })
            .join(", ");
        };

        const regenSystemPrompt = `${avandarPersonaPrefix}
The user is working with a multi-step SQL plan in DuckDB.

A previously-executed step produced columns that don't match what the
plan predicted. You must regenerate ONLY the downstream steps that
depend on the drifted step, updating their SQL so they work against
the actual schema.

Drifted step: ${driftReport.driftedStepDescription}
Drifted step id: ${driftReport.driftedStepId}
Predicted schema for drifted step: ${fmtSchema(driftReport.predictedSchema)}
Actual schema for drifted step:    ${fmtSchema(driftReport.actualSchema)}

Each downstream step references the drifted step via the DuckDB view
\`"step_${driftReport.driftedStepId.replace(/[^a-zA-Z0-9_]/g, "_")}"\`.

The full plan context is below; only rewrite SQL for the listed
affected step ids:
${driftReport.plan.steps
  .map((s) => {
    return `- ${s.id} (${s.description})\n    inputs: [${s.inputs.join(", ")}]\n    sql: ${s.code}`;
  })
  .join("\n")}

Affected step ids: ${driftReport.affectedStepIds.join(", ")}

Call the \`regenerateSteps\` tool with the corrected SQL and updated
\`predictedSchema\` for each affected step.`;

        const requestBody: Record<string, unknown> = {
          model,
          messages: [
            { role: "system", content: regenSystemPrompt },
            {
              role: "user",
              content: `Please regenerate the affected steps to match the drifted step's actual schema.`,
            },
          ],
          temperature: 0.2,
          tools: [
            {
              type: "function",
              function: {
                name: "regenerateSteps",
                description:
                  "Emit the regenerated SQL for each step in the affected step ids.",
                parameters: {
                  type: "object",
                  properties: {
                    explanation: { type: "string", maxLength: 400 },
                    steps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          stepId: { type: "string" },
                          code: { type: "string" },
                          predictedSchema: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                type: { type: "string" },
                              },
                              required: ["name", "type"],
                              additionalProperties: false,
                            },
                          },
                        },
                        required: ["stepId", "code", "predictedSchema"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["steps", "explanation"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "regenerateSteps" },
          },
        };

        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterApiKey}`,
              "HTTP-Referer": openRouterReferer,
              "X-Title": "Avandar",
            },
            body: JSON.stringify(requestBody),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API error: ${errorText}`);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await response.json();
        const message = data.choices?.[0]?.message;
        const toolCalls: OpenRouterToolCall[] = message?.tool_calls ?? [];
        const tool = toolCalls.find((tc) => {
          return tc?.function?.name === "regenerateSteps";
        });
        if (!tool?.function?.arguments) {
          return {
            steps: [],
            explanation:
              message?.content ??
              "The model declined to regenerate the affected steps.",
          };
        }
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parsed: any = JSON.parse(tool.function.arguments);
          const stepsRaw = Array.isArray(parsed.steps) ? parsed.steps : [];
          const cleaned: RegeneratePlanResponse["steps"] = [];
          for (const s of stepsRaw) {
            if (
              typeof s?.stepId !== "string" ||
              typeof s?.code !== "string" ||
              !Array.isArray(s?.predictedSchema)
            ) {
              continue;
            }
            if (!affectedSet.has(s.stepId)) {
              continue;
            }
            const schema = (
              s.predictedSchema as Array<{
                name?: unknown;
                type?: unknown;
              }>
            )
              .filter((c) => {
                return (
                  typeof c?.name === "string" && typeof c?.type === "string"
                );
              })
              .map((c) => {
                return {
                  name: c.name as string,
                  type: c.type as string,
                };
              });
            cleaned.push({
              stepId: s.stepId,
              code: s.code.trim(),
              predictedSchema: schema,
            });
          }
          return {
            steps: cleaned,
            explanation:
              typeof parsed.explanation === "string" ?
                parsed.explanation
              : "Regenerated downstream steps to match the drifted schema.",
          };
        } catch {
          return {
            steps: [],
            explanation: "The model's regen response was malformed.",
          };
        }
      }),
  },

  /**
   * Returns the HMAC session secret used by the client to sign ack
   * tokens for the consent flow. The secret is derived per
   * (workspaceId, userId) from `SB_SECRET_KEY` so it never has to be
   * stored on the server; both client and server derive it
   * independently.
   *
   * The client should treat the returned base64 string as sensitive
   * material: keep it in memory only, never in localStorage / IDB.
   */
  "/:workspaceId/session-secret": {
    GET: GET({
      path: "/:workspaceId/session-secret",
      schema: { workspaceId: z.uuid() },
    }).action(
      async ({ pathParams, user }): Promise<ChatSessionSecretResponse> => {
        const { workspaceId } = pathParams;
        const secret = await deriveSessionSecret({
          workspaceId,
          userId: user.id,
        });
        return {
          sessionSecret: _arrayBufferToBase64(secret),
          issuedAt: Date.now(),
        };
      },
    ),
  },
});
