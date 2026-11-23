import { pathToFileURL } from "node:url";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";

await ProducerCli.prepare({ commandName: "video", moduleUrl: import.meta.url });

/**
 * Runs a storyboard pipeline stage and resolves after its outputs are ready.
 */
export async function main(
  ...arguments_: Parameters<
    (typeof import("./runVideoCommand.ts"))["runVideoCommand"]
  >
): ReturnType<(typeof import("./runVideoCommand.ts"))["runVideoCommand"]> {
  return (await import("./runVideoCommand.ts")).runVideoCommand(...arguments_);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.env.AVA_PRODUCER_WORKER_ENTRY = new URL(
    "./runVideoCommand.ts",
    import.meta.url,
  ).href;
  await import("./runVideoCommand.ts");
}
