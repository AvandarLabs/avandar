import { pathToFileURL } from "node:url";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";

await ProducerCli.prepare({
  commandName: "component:build",
  moduleUrl: import.meta.url,
});

/** Builds product components and returns a disposable context when watching. */
export async function buildProduct(
  ...arguments_: Parameters<
    (typeof import("./runBuildProductCommand.ts"))["runBuildProductCommand"]
  >
): ReturnType<
  (typeof import("./runBuildProductCommand.ts"))["runBuildProductCommand"]
> {
  return (await import("./runBuildProductCommand.ts")).runBuildProductCommand(
    ...arguments_,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.env.AVA_PRODUCER_WORKER_ENTRY = new URL(
    "./runBuildProductCommand.ts",
    import.meta.url,
  ).href;
  await import("./runBuildProductCommand.ts");
}
