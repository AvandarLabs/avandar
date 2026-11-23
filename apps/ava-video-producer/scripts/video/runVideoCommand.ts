#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { match } from "ts-pattern";
import { type Storyboard } from "../../src/storyboard/schema/schema";
import { buildProduct } from "../buildProduct/buildProduct";
import { getVideoWorkspaceFromPlanPath } from "../lib/getVideoWorkspaceFromPlanPath";
import { readPlan } from "../lib/planHelpers/planHelpers";
import { productRequirements } from "../lib/productRequirements/productRequirements";
import { requireLicense } from "../requireLicense";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";
import { alignRecording } from "./alignRecording";
import { exportPlan } from "./exportPlan";
import { makeValidationSummaryFromStoryboard } from "./makeValidationSummaryFromStoryboard";
import { parseArgs } from "./parseArgs";
import { runPictureCommand } from "./runPictureCommand";
import { scratchTts } from "./scratchTts/scratchTts";
import { validate } from "./validate";
import { HELP, ROOT } from "./video.constants";
/** Dispatch local pipeline stages; source plans are never edited in place. */
export async function runVideoCommand(
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> {
  requireLicense();
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) {
    console.log(HELP);
    return;
  }
  const options = parseArgs(argv);
  const workspace = await getVideoWorkspaceFromPlanPath({
    producerRoot: ROOT,
    filename: options.filename,
  });
  // Authorize the plan workspace before opening the supplied plan file.
  // react-doctor-disable-next-line server-sequential-independent-await
  const plan = await readPlan(options.filename);
  if (
    ["preview", "render"].includes(options.command) &&
    productRequirements(plan).needsProduct
  ) {
    await buildProduct();
  }
  await _runCommand({ options, plan, workspace });
}
if (
  process.env.AVA_PRODUCER_WORKER_ENTRY === import.meta.url ||
  (process.argv[1] &&
    pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
) {
  runVideoCommand().catch((error) => {
    ProducerCli.failure("video", error);
    process.exitCode = 1;
  });
}

type VideoCommandRequest = Readonly<{
  options: ReturnType<typeof parseArgs>;
  plan: Storyboard;
  workspace: string;
}>;
async function _runCommand({
  options,
  plan,
  workspace,
}: VideoCommandRequest): Promise<void> {
  await match(options.command)
    .with("tts", async () => {
      console.log(
        "Derived scratch plan:",
        await scratchTts({
          plan,
          options,
          workspace,
        }),
      );
    })
    .with("align", async () => {
      console.log(
        "Derived aligned plan:",
        await alignRecording({
          plan,
          options,
          workspace,
        }),
      );
    })
    .with("validate", "plan", "preview", "render", (command) => {
      return _runValidatedCommand({ command, options, plan, workspace });
    })
    .exhaustive();
}
async function _runValidatedCommand({
  command,
  options,
  plan,
  workspace,
}: VideoCommandRequest &
  Readonly<{
    command: "validate" | "plan" | "preview" | "render";
  }>): Promise<void> {
  await validate({
    plan,
    workspace,
  });
  await match(command)
    .with("validate", () => {
      console.log(makeValidationSummaryFromStoryboard(plan));
    })
    .with("plan", async () => {
      console.log(
        "Plan artifacts:",
        await exportPlan({
          plan,
          workspace,
        }),
      );
    })
    .with("preview", "render", () => {
      return runPictureCommand({ options, plan, workspace });
    })
    .exhaustive();
}
