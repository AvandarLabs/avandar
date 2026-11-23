import { pathToFileURL } from "node:url";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";

await ProducerCli.prepare({
  commandName: "motion",
  moduleUrl: import.meta.url,
});

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.env.AVA_PRODUCER_WORKER_ENTRY = new URL(
    "./runMotionCommand.ts",
    import.meta.url,
  ).href;
  await import("./runMotionCommand.ts");
}
