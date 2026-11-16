#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MotionRequests } from "../MotionRequests/MotionRequests";
import { requireLicense } from "../requireLicense";
import { previewMotionRequests } from "./previewMotionRequests";
import { renderMotionRequests } from "./renderMotionRequests";

async function _main(): Promise<void> {
  requireLicense();
  const args = MotionRequests.parseArgs(process.argv.slice(2));
  const { command, entries } = args;
  if (command === "list") {
    entries.forEach((entry) =>
      console.log(
        `${entry.id.padEnd(20)} ${entry.category.padEnd(12)} ${entry.name}`,
      ),
    );
  } else {
    const requests = await MotionRequests.fromArgs({ args });
    if (command === "preview") {
      await previewMotionRequests(requests);
    } else {
      await renderMotionRequests(requests);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  _main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
