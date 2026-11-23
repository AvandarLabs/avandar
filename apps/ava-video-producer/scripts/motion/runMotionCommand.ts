#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { MotionRequests } from "../MotionRequests/MotionRequests";
import { requireLicense } from "../requireLicense";
import { InventoryView } from "../runProducerCommand/InventoryView/InventoryView.mjs";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";
import { previewMotionRequests } from "./previewMotionRequests";
import { renderMotionRequests } from "./renderMotionRequests";

async function _main(): Promise<void> {
  requireLicense();
  const args = MotionRequests.parseArgs(process.argv.slice(2));
  const { command, entries } = args;
  if (command === "list") {
    process.exitCode = await InventoryView.show({
      rows: entries.map((entry) => {
        return {
          id: entry.id,
          group: entry.category,
          name: entry.name,
        };
      }),
      words: JSON.parse(process.env.AVA_PRODUCER_LIST_FILTER ?? "[]"),
    });
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
  process.env.AVA_PRODUCER_WORKER_ENTRY === import.meta.url ||
  (process.argv[1] &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
) {
  _main().catch((error: unknown) => {
    ProducerCli.failure("motion", error);
    process.exitCode = 1;
  });
}
