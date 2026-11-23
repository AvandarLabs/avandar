import { pathToFileURL } from "node:url";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";

await ProducerCli.prepare({
  commandName: "capture:curate",
  moduleUrl: import.meta.url,
});

/** Curates a passed capture and returns the receipt for installed assets. */
export async function curateCapture(
  ...arguments_: Parameters<
    (typeof import("./runCurateCaptureCommand.ts"))["runCurateCaptureCommand"]
  >
): ReturnType<
  (typeof import("./runCurateCaptureCommand.ts"))["runCurateCaptureCommand"]
> {
  return (await import("./runCurateCaptureCommand.ts")).runCurateCaptureCommand(
    ...arguments_,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.env.AVA_PRODUCER_WORKER_ENTRY = new URL(
    "./runCurateCaptureCommand.ts",
    import.meta.url,
  ).href;
  await import("./runCurateCaptureCommand.ts");
}
