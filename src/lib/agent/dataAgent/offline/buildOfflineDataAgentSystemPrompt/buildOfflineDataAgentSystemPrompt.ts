import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { OFFLINE_PLAN_INSTRUCTIONS } from "@/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/offlinePlanInstructions";
import type { DataAgentDataset } from "@/lib/agent/dataAgent/buildDataAgentSystemPrompt/buildDataAgentSystemPrompt";
import type { QuestionValueMatch } from "@/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues";
import type {
  OfflineColumnProfile,
  OfflineDatasetProfile,
} from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";

/**
 * Instructions for a small model on the user's device. Shorter and more
 * literal than the hosted agent's prompt, with SQL patterns written out,
 * because small models follow examples better than principles.
 */
const OFFLINE_INSTRUCTIONS = `You are Avandar's data assistant. You answer questions about the user's datasets with one DuckDB SQL query. The result is shown to the user as a table, or as a chart when they ask for one.

STEPS
1. Pick the dataset and columns that answer the question.
2. Filter text columns only with values listed under VALUES IN THE QUESTION or DATASETS, spelled exactly as listed.
3. Call run_query with the SQL and a one-sentence summary of what it shows.
4. You then see the first rows. If they answer the question, reply in one or two sentences with the answer. If not, fix the SQL and call run_query again.
Never answer a data question without calling run_query. Never ask the user which measure or period they mean: choose the obvious one and say so in the summary.

SQL RULES
- Tables are the aliases t0, t1, ... in double quotes. Columns in double quotes, exactly as listed. One SELECT or WITH statement, no semicolon.
- Columns named like daily_new_X hold one day's count for one place. A total is SUM over days and places.
- "By month" or "monthly": GROUP BY date_trunc('month', "date"). "By week": date_trunc('week', "date"). "By year": year("date").
- A year such as 2022: WHERE "date" >= '2022-01-01' AND "date" < '2023-01-01'.
- "Latest", "last year", "recently": count back from (SELECT max("date") FROM "t0"), never from today. "Last year" is the last full calendar year in the data.
- "Most", "top", "highest" of a count: SUM per group over the whole period, ORDER BY that sum DESC, LIMIT N. One row per group.
- "Peak" or "worst" day or month: the single highest day or month total.
- A place attribute (population, coordinates) repeats on every daily row. Take MAX per smallest place first, then SUM those per larger area. "Per person" or "per capita" divides the total by that population.
- Rolling or moving averages: total per day first, then AVG(...) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), then filter the period.
- Place names repeat inside larger areas (one county name exists in many states): filter the larger area too. New York City is five counties in New York state: New York, Kings, Queens, Bronx, Richmond.
- Keep "Unassigned" and "Out of <state>" rows in totals.
- Overview questions ("show me X", "how bad was X"): monthly totals of every measure the question could mean (cases and deaths), one CTE per dataset grouped by month, joined on month.
- Set chart only when the user asks for a chart, graph, or plot: line over time, bar to compare groups.

EXAMPLES (for a made-up table "t9" with columns state, county, visit_date, daily_visits, enrolled)
Monthly visits in Ohio in 2023:
SELECT date_trunc('month', "visit_date") AS month, SUM("daily_visits") AS visits FROM "t9" WHERE "state" = 'Ohio' AND "visit_date" >= '2023-01-01' AND "visit_date" < '2024-01-01' GROUP BY 1 ORDER BY 1
Top 5 counties by visits:
SELECT "state", "county", SUM("daily_visits") AS visits FROM "t9" GROUP BY 1, 2 ORDER BY visits DESC LIMIT 5
Visits per enrolled person by state:
WITH people AS (SELECT "state", "county", MAX("enrolled") AS enrolled FROM "t9" GROUP BY 1, 2), visits AS (SELECT "state", SUM("daily_visits") AS visits FROM "t9" GROUP BY 1) SELECT v."state", v.visits / SUM(p.enrolled) AS visits_per_person FROM visits v JOIN people p ON p."state" = v."state" GROUP BY v."state", v.visits ORDER BY 2 DESC

ASKING
Call ask_user only when VALUES IN THE QUESTION says a name means different things in different datasets. Then ask which one the user means, with those options.`;

function _quoteValues(values: readonly string[]): string {
  return values
    .map((value) => {
      return `"${value}"`;
    })
    .join(", ");
}

function _formatColumn(column: Readonly<OfflineColumnProfile>): string {
  const type = column.dataType.toLowerCase();
  if (column.range) {
    return `${column.name} ${type}, ${column.range.min} to ${column.range.max}`;
  }
  if (column.values === undefined) {
    return `${column.name} ${type}`;
  }
  const count = column.distinctCount ?? column.values.length;
  if (count <= column.values.length) {
    return `${column.name} text, values: ${_quoteValues(column.values)}`;
  }
  return `${column.name} text, about ${count} values, e.g. ${_quoteValues(column.values)}`;
}

function _formatDatasets(
  datasets: readonly DataAgentDataset[],
  profiles: readonly OfflineDatasetProfile[],
): string {
  const aliases = SqlTableAlias.fromSchema({ datasets });
  return aliases
    .flatMap((entry) => {
      const dataset = datasets.find((candidate) => {
        return entry.kind === "dataset" && candidate.id === entry.datasetId;
      });
      const profile = profiles.find((candidate) => {
        return candidate.datasetId === dataset?.id;
      });
      if (!dataset || !profile) {
        return [];
      }
      const columns = profile.columns.map((column) => {
        return `  - ${_formatColumn(column)}`;
      });
      return [
        `${entry.alias} = "${dataset.name}" (${profile.rowCount} rows)`,
        ...columns,
      ];
    })
    .join("\n");
}

/** Lists matched values and flags names that mean different things. */
export function formatQuestionValues(
  matches: readonly QuestionValueMatch[],
  datasets: readonly DataAgentDataset[],
): string {
  const aliases = SqlTableAlias.fromSchema({ datasets });
  const aliasOf = (datasetId: string): string => {
    return (
      aliases.find((entry) => {
        return entry.kind === "dataset" && entry.datasetId === datasetId;
      })?.alias ?? datasetId
    );
  };
  const values = [
    ...new Set(
      matches.map((match) => {
        return match.storedValue;
      }),
    ),
  ];
  return values
    .map((value) => {
      const places = matches.filter((match) => {
        return match.storedValue === value;
      });
      const where = places
        .map((match) => {
          return `${aliasOf(match.datasetId)}."${match.column}"`;
        })
        .join(", ");
      const columns = new Set(
        places.map((match) => {
          return match.column;
        }),
      );
      const note =
        columns.size > 1
          ? " This name means different things in different columns: ask the user which one they mean."
          : "";
      return `- "${value}" is stored in ${where}.${note}`;
    })
    .join("\n");
}

/**
 * Builds the offline agent's system prompt for a conversation: instructions,
 * each dataset's profile, and today's date. It stays the same for every
 * question, so WebLLM keeps it cached across the conversation; each
 * question's own values travel in its message instead
 * ({@link buildOfflineQuestionMessage}).
 */
export function buildOfflineDataAgentSystemPrompt(
  options: Readonly<{
    datasets: readonly DataAgentDataset[];
    profiles: readonly OfflineDatasetProfile[];
    today: string;
    /** `plan` teaches `plan_query`; `sql` (default) teaches SQL. */
    queryStyle?: "sql" | "plan";
  }>,
): string {
  const instructions =
    options.queryStyle === "plan"
      ? OFFLINE_PLAN_INSTRUCTIONS
      : OFFLINE_INSTRUCTIONS;
  return `${instructions}

DATASETS
${_formatDatasets(options.datasets, options.profiles)}

Today is ${options.today}.`;
}

/**
 * The message the offline model reads for a data question: the stored
 * values found in it, then the question itself.
 */
export function buildOfflineQuestionMessage(
  options: Readonly<{
    question: string;
    matches: readonly QuestionValueMatch[];
    datasets: readonly DataAgentDataset[];
  }>,
): string {
  const values =
    formatQuestionValues(options.matches, options.datasets) ||
    "- None of the question's words are stored values.";
  return `VALUES IN THE QUESTION
${values}

QUESTION
${options.question}`;
}
