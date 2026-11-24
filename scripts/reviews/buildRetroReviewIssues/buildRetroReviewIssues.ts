import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

/** One feature of the feature log: its table row plus its section's text. */
export type ReviewFeature = Readonly<{
  id: string;
  title: string;
  section: string;
}>;

/** The order reviews are worked in: security first, then data, then UI. */
export type ReviewTier = "security" | "data" | "ui";

/** A GitHub issue ready to be created with `gh issue create`. */
export type RetroReviewIssue = Readonly<{
  title: string;
  labels: readonly string[];
  body: string;
}>;

const FEATURE_ROW_REGEX = /^\| (F\d+) \| (.+?) \| (.*)\|$/;
const SECTION_HEADING_REGEX = /^## (F\d+): /;
const SECURITY_REGEX = /\b(RLS|polic(?:y|ies)|anon|security definer|grant)/i;
const DATA_REGEX = /supabase\/(?:migrations|schemas)|\bmigration|\bsync\b/i;
const FEATURE_LOG_PATH = "docs/measles-demo/pr-feature-log.md";
const REPO_URL = "https://github.com/AvandarLabs/avandar";

/** Every review tier, in the order the issues are created and worked. */
const REVIEW_TIERS: readonly ReviewTier[] = ["security", "data", "ui"];

/** A commit ID: 7 to 40 lowercase hexadecimal characters. */
const COMMIT_SHA_REGEX = /^[0-9a-f]{7,40}$/;

/** The flags that take a value. Each must be followed by one. */
const VALUE_FLAGS: readonly string[] = ["--sha", "--out"];

/** A file an earlier run wrote: one F<n>.json per feature, or order.md. */
const DRAFT_FILE_NAME_REGEX = /^(?:F\d+\.json|order\.md)$/;

const DEFAULT_OUT_DIR = ".temp/retro-review-issues";
const SCRIPT_PATH =
  "scripts/reviews/buildRetroReviewIssues/buildRetroReviewIssues.ts";

const USAGE = `Writes one GitHub issue draft per feature of the feature log, for the
retroactive review. Creates nothing on GitHub.

Usage:
  node ${SCRIPT_PATH} --sha <commit> [--out <dir>]
  node ${SCRIPT_PATH} -h | --help

Options:
  --sha <commit>  The commit every link in the drafts is pinned to: 7 to 40
                  lowercase hex characters. Required. Prompted for when
                  missing and a terminal is attached.
  --out <dir>     Where to write F<n>.json per feature plus order.md. The
                  folder must not hold drafts from an earlier run.
                  Default: ${DEFAULT_OUT_DIR}
  -h, --help      Print this help and exit.

Examples:
  node ${SCRIPT_PATH} --sha "$(git rev-parse HEAD)"
  node ${SCRIPT_PATH} --sha "$(git rev-parse origin/develop)" \\
    --out .temp/retro-review-issues

Run it with node, not pnpm vite-script: vite-node hides the script's path
from process.argv, so the script cannot tell it is the entry point and
does nothing. Prints the output directory on stdout. Progress goes to
stderr.`;

/**
 * Maps each feature id to the text under its `## F<n>:` heading, up to the
 * next `## ` heading of any kind.
 */
function _getSectionsById(markdown: string): ReadonlyMap<string, string> {
  const lines = markdown.split("\n");
  const headingIndexes = lines.flatMap((line, index) => {
    return line.startsWith("## ") ? [index] : [];
  });
  return new Map(
    headingIndexes.flatMap((headingIndex, position) => {
      const id = SECTION_HEADING_REGEX.exec(lines[headingIndex] ?? "")?.[1];
      if (id === undefined) {
        return [];
      }
      const endIndex = headingIndexes[position + 1] ?? lines.length;
      const sectionText = lines.slice(headingIndex + 1, endIndex).join("\n");
      return [[id, sectionText.trim()] as const];
    }),
  );
}

/**
 * Reads every feature row of the feature log's table, with the text of the
 * feature's own section. `main` turns each one into an issue draft, so a
 * feature that has a section but no table row gets no draft. A row whose
 * status starts with `dropped` is left out: it never shipped as that feature,
 * so there is nothing to review under its name.
 */
export function getFeaturesFromFeatureLog(
  markdown: string,
): readonly ReviewFeature[] {
  const sectionsById = _getSectionsById(markdown);
  return markdown.split("\n").flatMap((line) => {
    const match = FEATURE_ROW_REGEX.exec(line);
    if (match === null) {
      return [];
    }
    const [, id = "", title = "", restOfRow = ""] = match;
    const status = restOfRow.split("|")[0]?.trim() ?? "";
    if (status.startsWith("dropped")) {
      return [];
    }
    return [{ id, title, section: sectionsById.get(id) ?? "" }];
  });
}

/**
 * Sorts a feature into a review tier from what its section mentions, so the
 * riskiest features are reviewed first: access rules before data changes,
 * and data changes before UI.
 */
export function getReviewTierFromSection(section: string): ReviewTier {
  if (SECURITY_REGEX.test(section)) {
    return "security";
  }
  return DATA_REGEX.test(section) ? "data" : "ui";
}

/**
 * Orders features for review: every security feature, then data, then UI,
 * keeping the feature log's order inside a tier. Issues are created and
 * worked in this order, so the riskiest code is read first.
 */
export function getFeaturesInReviewOrder(
  features: readonly ReviewFeature[],
): readonly ReviewFeature[] {
  return REVIEW_TIERS.flatMap((tier) => {
    return features.filter((feature) => {
      return getReviewTierFromSection(feature.section) === tier;
    });
  });
}

/**
 * Builds the public review issue for one feature, pinned to a commit, so
 * every link in it keeps pointing at the code that was reviewed.
 */
export function createRetroReviewIssueFromFeature(
  options: Readonly<{ feature: ReviewFeature; pinnedSha: string }>,
): RetroReviewIssue {
  const { feature, pinnedSha } = options;
  const tier = getReviewTierFromSection(feature.section);
  const logUrl = `${REPO_URL}/blob/${pinnedSha}/${FEATURE_LOG_PATH}`;
  return {
    title: `Retro review ${feature.id}: ${feature.title}`,
    labels: ["retro-review", `retro-review:${tier}`],
    body: [
      "This feature reached `develop` without a pull request review.",
      "It is reviewed here, after the fact. See docs/reviews/README.md.",
      "",
      `- Feature log entry: ${logUrl} (section ${feature.id})`,
      `- Code pinned at: ${REPO_URL}/tree/${pinnedSha}`,
      `- Review tier: ${tier}`,
      "",
      "## Findings",
      "",
      "None recorded yet. Each finding cites a permalink at the pinned commit.",
    ].join("\n"),
  };
}

/**
 * Finds the first value flag (`--sha` or `--out`) given with no value after
 * it: last in the arguments, or followed by another flag. Returns undefined
 * when every value flag present has a value.
 */
export function getFlagWithoutValue(
  args: readonly string[],
): string | undefined {
  return args.find((arg, index) => {
    const value = args[index + 1];
    return (
      VALUE_FLAGS.includes(arg) &&
      (value === undefined || value.startsWith("-"))
    );
  });
}

/**
 * Lists the files in a folder that an earlier run wrote: F<n>.json drafts
 * and order.md. Writing over them would mix two runs' drafts in one folder.
 */
export function getLeftoverDraftNames(
  fileNames: readonly string[],
): readonly string[] {
  return fileNames.filter((fileName) => {
    return DRAFT_FILE_NAME_REGEX.test(fileName);
  });
}

/** Lists a folder's file names, or none when the folder does not exist. */
async function _getFileNamesInDir(dir: string): Promise<readonly string[]> {
  try {
    return await readdir(dir);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/** Colors a line for stderr, or leaves it plain when color is off. */
function _paint(colorCode: string, text: string): string {
  const isColorOn =
    process.stderr.isTTY === true &&
    !process.env.NO_COLOR &&
    process.env.TERM !== "dumb";
  return isColorOn ? `\u001b[${colorCode}m${text}\u001b[0m` : text;
}

/** Prints an error and the step that fixes it, on stderr. */
function _printError(message: string, fix: string): void {
  console.error(_paint("31", `❌ buildRetroReviewIssues: ${message}`));
  console.error(_paint("33", `  ⚠️ ${fix}`));
}

/** Gets the value after a flag, or undefined when the flag is absent. */
function _getFlagValue(
  args: readonly string[],
  flag: string,
): string | undefined {
  const flagIndex = args.indexOf(flag);
  return flagIndex === -1 ? undefined : args[flagIndex + 1];
}

/** Asks for the commit and folder the flags left out, when on a terminal. */
async function _promptForMissingValues(
  options: Readonly<{ sha?: string; outDir?: string }>,
): Promise<Readonly<{ sha?: string; outDir?: string }>> {
  if (options.sha !== undefined || process.stdin.isTTY !== true) {
    return options;
  }
  const prompt = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    const sha = (await prompt.question("Commit to pin the drafts to: ")).trim();
    const typedOutDir = (
      await prompt.question(`Output folder [${options.outDir}]: `)
    ).trim();
    return { sha, outDir: typedOutDir === "" ? options.outDir : typedOutDir };
  } finally {
    prompt.close();
  }
}

/** Builds order.md: the features under one heading per tier, in order. */
function _buildOrderMarkdown(
  features: readonly ReviewFeature[],
  pinnedSha: string,
): string {
  const tierLines = REVIEW_TIERS.flatMap((tier) => {
    const tierFeatures = features.filter((feature) => {
      return getReviewTierFromSection(feature.section) === tier;
    });
    return [
      `## ${tier} (${tierFeatures.length})`,
      "",
      ...tierFeatures.map((feature) => {
        return `- ${feature.id}: ${feature.title} (${feature.id}.json)`;
      }),
      "",
    ];
  });
  return [
    "# Retroactive review order",
    "",
    `Pinned commit: ${pinnedSha}. Create the issues from top to bottom.`,
    "",
    ...tierLines,
  ].join("\n");
}

/** Writes one F<n>.json per feature, plus order.md, into the folder. */
async function _writeDrafts(
  options: Readonly<{
    features: readonly ReviewFeature[];
    pinnedSha: string;
    outDir: string;
  }>,
): Promise<void> {
  const { features, pinnedSha, outDir } = options;
  await mkdir(outDir, { recursive: true });
  await Promise.all(
    features.map((feature) => {
      const issue = createRetroReviewIssueFromFeature({ feature, pinnedSha });
      return writeFile(
        path.join(outDir, `${feature.id}.json`),
        `${JSON.stringify(issue, undefined, 2)}\n`,
      );
    }),
  );
  await writeFile(
    path.join(outDir, "order.md"),
    _buildOrderMarkdown(features, pinnedSha),
  );
}

/**
 * Reads the commit and output folder from the flags, or from prompts on a
 * terminal. Prints the problem and returns undefined when a flag has no
 * value, the commit is not a commit ID, or the folder holds an earlier
 * run's drafts.
 */
async function _getRunOptions(
  args: readonly string[],
): Promise<Readonly<{ sha: string; outDir: string }> | undefined> {
  const flagWithoutValue = getFlagWithoutValue(args);
  if (flagWithoutValue !== undefined) {
    console.error(USAGE);
    _printError(
      `${flagWithoutValue} needs a value.`,
      `Put the value right after ${flagWithoutValue}, or leave the flag out.`,
    );
    return undefined;
  }
  const { sha, outDir = DEFAULT_OUT_DIR } = await _promptForMissingValues({
    sha: _getFlagValue(args, "--sha"),
    outDir: _getFlagValue(args, "--out") ?? DEFAULT_OUT_DIR,
  });
  if (sha === undefined || !COMMIT_SHA_REGEX.test(sha)) {
    console.error(USAGE);
    _printError(
      `--sha must be a commit ID, got ${JSON.stringify(sha ?? "")}.`,
      `Retry with --sha "$(git rev-parse HEAD)".`,
    );
    return undefined;
  }
  const leftoverDraftNames = getLeftoverDraftNames(
    await _getFileNamesInDir(outDir),
  );
  if (leftoverDraftNames.length > 0) {
    _printError(
      `${outDir} already holds ${leftoverDraftNames.length} files from an earlier run.`,
      "Retry with --out <a new folder>, or delete the old F<n>.json files and order.md first.",
    );
    return undefined;
  }
  return { sha, outDir };
}

/**
 * The script's entry point. It reads the feature log beside this script and
 * writes the review issue drafts that the runbook's publishing prompt later
 * turns into GitHub issues. It creates nothing on GitHub itself. Run it with
 * `node`, not `pnpm vite-script`: vite-node hides the script's path from
 * `process.argv`, so the entry-point check below never calls this function.
 */
async function _main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(USAGE);
    return 0;
  }
  const runOptions = await _getRunOptions(args);
  if (runOptions === undefined) {
    return 1;
  }
  const { sha, outDir } = runOptions;
  const logPath = fileURLToPath(
    new URL(`../../../${FEATURE_LOG_PATH}`, import.meta.url),
  );
  console.error(`Reading ${FEATURE_LOG_PATH}...`);
  const features = getFeaturesInReviewOrder(
    getFeaturesFromFeatureLog(await readFile(logPath, "utf8")),
  );
  console.error(`Writing ${features.length} issue drafts to ${outDir}...`);
  await _writeDrafts({ features, pinnedSha: sha, outDir });
  console.error(
    _paint(
      "32",
      `✅ Wrote ${features.length} drafts and order.md. Nothing was created on GitHub.`,
    ),
  );
  console.log(outDir);
  return 0;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  _main().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      _printError(
        error instanceof Error ? error.message : String(error),
        "Check that the feature log exists and the output folder is writable.",
      );
      process.exitCode = 1;
    },
  );
}
