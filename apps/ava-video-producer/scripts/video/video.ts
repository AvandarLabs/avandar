#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { match } from "ts-pattern";
import {
  durationInFrames,
  type Storyboard,
} from "../../src/storyboard/schema/schema";
import { buildProduct } from "../buildProduct/buildProduct";
import { getVideoWorkspaceFromPlanPath } from "../lib/getVideoWorkspaceFromPlanPath";
import { readPlan } from "../lib/planHelpers/planHelpers";
import { productRequirements } from "../lib/productRequirements/productRequirements";
import { requireLicense } from "../requireLicense";
import { alignRecording } from "./alignRecording";
import { buildValidationSummary } from "./buildValidationSummary";
import { exportPlan } from "./exportPlan";
import { parseArgs } from "./parseArgs";
import { runPictureCommand } from "./runPictureCommand";
import { scratchTts } from "./scratchTts/scratchTts";
import { validate } from "./validate";
import { HELP, ROOT } from "./video.constants";

/** Dispatch local pipeline stages; source plans are never edited in place. */
export async function main(argv = process.argv.slice(2)): Promise<void> {
  requireLicense();
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) {
    console.log(HELP);
    return;
  }
  const options = parseArgs(argv);
  const workspace = await getVideoWorkspaceFromPlanPath(ROOT, options.filename);
  // Authorize the plan workspace before opening the supplied plan file.
  // react-doctor-disable-next-line server-sequential-independent-await
  const plan = await readPlan(options.filename);
  if (
    ["preview", "render"].includes(options.command) &&
    productRequirements(plan).needsProduct
  ) {
    await buildProduct();
  }
  if (options.command === "tts") {
    console.log(
      "Derived scratch plan:",
      await scratchTts(plan, options, workspace),
    );
    return;
  }
  if (options.command === "align") {
    console.log(
      "Derived aligned plan:",
      await alignRecording(plan, options, workspace),
    );
    return;
  }
  await validate(plan, workspace);
  await match(options.command)
    .with("validate", () => {
      console.log(buildValidationSummary(plan));
    })
    .with("plan", async () => {
      console.log("Plan artifacts:", await exportPlan(plan, workspace));
    })
    .with("preview", "render", () => {
      return runPictureCommand({ options, plan, workspace });
    })
    .exhaustive();
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
