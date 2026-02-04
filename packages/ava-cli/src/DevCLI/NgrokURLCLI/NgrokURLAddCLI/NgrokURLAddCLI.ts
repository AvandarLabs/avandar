import { Acclimate } from "@avandar/acclimate";
import { printError, printInfo, printSuccess } from "../../../utils/cliOutput";
import { sendNgrokURLManagerRequest } from "../sendNgrokURLManagerRequest";

/**
 * Add a dev ngrok URL to the registry.
 *
 * This is separated from the CLI wiring so it can be unit-tested.
 */
export async function runNgrokURLAdd(options: { url: string }): Promise<void> {
  const { url } = options;

  try {
    printInfo(`Adding ngrok URL: ${url}`);
    const { targets } = await sendNgrokURLManagerRequest({
      path: "/ngrok-url/add",
      method: "POST",
      body: { url },
    });
    printSuccess("Added ngrok URL.");
    printSuccess(`numTargets: ${targets.length}`);
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : String(error);
    printError("Failed to add ngrok URL.");
    printError(message);
    throw error;
  }
}

/** Add a dev ngrok URL to the registry. */
export const NgrokURLAddCLI = Acclimate.createCLI("add")
  .description("Add a dev ngrok URL to the registry.")
  .addPositionalArg({
    name: "url",
    required: true,
    description: "The public ngrok URL to register.",
    type: "string",
    validator: (value: string) => {
      if (!value.startsWith("https://") && !value.startsWith("http://")) {
        return "URL must start with https:// or http://";
      }
      return true;
    },
  })
  .action(({ url }: Readonly<{ url: string }>) => {
    return runNgrokURLAdd({ url });
  });
