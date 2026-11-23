import { pathToFileURL } from "node:url";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";

await ProducerCli.prepare({ commandName: "adopt", moduleUrl: import.meta.url });

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.env.AVA_PRODUCER_WORKER_ENTRY = new URL(
    "./runAdoptTheme.ts",
    import.meta.url,
  ).href;
  await import("./runAdoptTheme.ts");
}
