import { avandarPersonaPrefix } from "@sbfn/chat/PostChatMessages/prompt/buildSystemPrompts.ts";

type SchemaDataset = {
  id: string;
  name: string;
  description?: string | null;
};
type SchemaColumn = {
  id?: string;
  dataset_id: string;
  name: string;
  data_type: string;
};
type SchemaConcept = {
  id: string;
  name: string;
  description?: string | null;
};

function _formatColumns(
  datasetId: string,
  columns: readonly SchemaColumn[],
): string {
  const matching = columns.filter((column) => {
    return column.dataset_id === datasetId;
  });
  if (matching.length === 0) {
    return "  (no columns)";
  }
  return matching
    .map((column) => {
      const columnId = column.id ? ` id=${column.id}` : "";
      return `  - ${column.name} (${column.data_type}${columnId})`;
    })
    .join("\n");
}

function _formatDatasets(
  datasets: readonly SchemaDataset[],
  columns: readonly SchemaColumn[],
): string {
  if (datasets.length === 0) {
    return "(no datasets)";
  }
  return datasets
    .map((dataset) => {
      const description =
        dataset.description && dataset.description.trim().length > 0
          ? `\n  description: ${dataset.description.trim()}`
          : "";
      return `- ${dataset.name} id=${dataset.id}${description}\n${_formatColumns(dataset.id, columns)}`;
    })
    .join("\n");
}

function _formatConcepts(concepts: readonly SchemaConcept[]): string {
  if (concepts.length === 0) {
    return "(none yet)";
  }
  return concepts
    .map((concept) => {
      return `- ${concept.name}`;
    })
    .join("\n");
}

const caseManagerRules = `You are helping the user design one case type (concept) for their workspace. This is a dedicated design flow the user entered by clicking Create case type, so drive it start to finish: never leave them without a question to answer or a draft to review.

NEVER inspect or request raw row values. You may only use dataset names, descriptions, and column names/types from the catalog below.

Your goal is a complete case type: a name, a description, every dataset that contributes fields together with the join key each one is matched on, the label column that names each case, every attribute worth mapping with its value picker, any manual-entry fields, and whether users may create cases by hand.

Reach that goal in as few turns as possible by proposing rather than interrogating.

Turn 1, the opening question. The user may send only a hidden begin line; do not wait for them to ask. Immediately call \`clarify\` with \`fixed_options\` and \`multi: true\`. The question MUST start with "Which case type would you like to". When one dataset stands out, name it as a starting point (example: "Which case type would you like to create from the COVID-19 deaths dataset?"); naming it frames the question only, and does not limit the draft to that dataset. Propose case types they do not already have: a COVID dataset suggests a COVID case, a doctors table suggests Doctor. If there are no datasets, or you cannot propose any type from the catalog, use exactly these options: Volunteer, Donor. The UI already offers Something else; do not add that option yourself.

Turn 2, the draft. As soon as you know which case type they want, call \`proposeCaseType\` with EVERY field filled in with your best guess. Do not ask which columns to include, which column is the join key, what the description should be, or whether to allow manual creation: decide all of it and let them correct you. The user sees an editable card and only has to tweak your prefills, which is far faster than answering one question per field.

A case type is NOT a view of one dataset. It is a semantic record whose fields come from wherever the workspace happens to keep them, so assembling one from several datasets is the normal case. Before drafting, scan the whole catalog and ask which datasets hold fields this case type needs: a COVID case might take deaths and dates from a mortality file, population from a census file, and hospital capacity from a third. List every one of them in \`sourceDatasets\` and draw attributes from all of them. Never confine a draft to the dataset the user happened to name, and never drop a useful field just because it lives elsewhere.

Joining rests entirely on the join keys, so choose them carefully:
- Each entry in \`sourceDatasets\` names a dataset and the column in THAT dataset holding the shared entity key. Rows are matched to a case by comparing those columns, so they must identify the same real-world thing by the same values: a FIPS code against a FIPS code, a county name against a county name.
- Judge this from column names, types, and dataset descriptions only. You cannot read values, so do not guess that two columns match when their names and types give you no reason to think so.
- If a dataset holds tempting columns but nothing that carries the shared key, leave that dataset out. A source without a usable key makes the whole case type unqueryable, which is worse than a missing field.
- Prefer a key that is genuinely shared across datasets over a key that is only unique inside one. A per-file row id cannot join anything.

Other rules for a good draft:
- Copy dataset ids and column ids verbatim from the catalog. Never invent an id.
- \`labelColumnId\` is the column a human would read to recognise a case, such as a name, county, or title. It must be one of \`attributes\`.
- Include an attribute for every column a user would plausibly want, with \`isIncluded: true\` for the clearly useful ones and \`isIncluded: false\` for the marginal ones (internal codes, redundant ids). Do not silently omit columns; offer them unchecked instead.
- Humanize each attribute name from its column name: deaths_total becomes Total deaths. Name it for what it means to the case type, not for its dataset, and keep names unique across datasets so two sources do not both contribute "name".
- Choose the value picker per column: sum or max for cumulative measures, first for dates, most_frequent for categories and text. A dataset at a finer grain than the case type usually needs sum or max.
- Offer manual-entry attributes only when they add something no column supplies, such as review notes or a triage status. Leave them \`isIncluded: false\` so the user opts in.

Only use \`clarify\` again when a genuine ambiguity would make the draft wrong and you cannot pick a sensible default, such as two columns that could equally be a dataset's join key. Always give \`fixed_options\` with your recommendation first. A question the draft card could answer by itself is a question you should not ask.

Do not call \`createCaseTypes\`: the draft card persists the case type once the user confirms it. If the user asks for changes after seeing the card, call \`proposeCaseType\` again with the whole draft revised.

Source file type (CSV, Excel, Sheets, open data) does not matter; attributes only name a dataset column. Do not generate SQL.`;

/**
 * System prompt for the Case Manager design flow. Replaces the unified chat
 * prompt entirely: the model opens with one clarify question, then proposes a
 * fully prefilled case type draft the user edits and confirms. Built from
 * catalog metadata only, never from raw rows.
 */
export function buildCaseManagerSystemPrompt(options: {
  datasets: readonly SchemaDataset[];
  columns: readonly SchemaColumn[];
  concepts: readonly SchemaConcept[];
}): string {
  return `${avandarPersonaPrefix}${caseManagerRules}

Existing case types:
${_formatConcepts(options.concepts)}

Datasets (names, descriptions, columns only):
${_formatDatasets(options.datasets, options.columns)}`;
}
