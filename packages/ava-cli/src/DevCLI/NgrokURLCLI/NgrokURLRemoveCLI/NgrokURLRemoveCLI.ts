import { Acclimate } from "@avandar/acclimate";
import { printError, printInfo, printSuccess } from "../../../utils/cliOutput";
import { sendNgrokURLManagerRequest } from "../sendNgrokURLManagerRequest";

/**
 * Remove a dev ngrok URL from the registry.
 *
 * This is separated from the CLI wiring so it can be unit-tested.
 */
export async function runNgrokURLRemove(options: {
  url: string;
}): Promise<void> {
  const { url } = options;
  try {
    printInfo(`Removing ngrok URL: ${url}`);
    await sendNgrokURLManagerRequest({
      path: "/ngrok-url/remove",
      method: "POST",
      body: { url },
    });
    printSuccess("Removed ngrok URL.");
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : String(error);
    printError("Failed to remove ngrok URL.");
    printError(message);
    throw error;
  }
}

/** Remove a dev ngrok URL from the registry. */
export const NgrokURLRemoveCLI = Acclimate.createCLI("remove")
  .description("Remove a dev ngrok URL from the registry.")
  .addPositionalArg({
    name: "url",
    required: true,
    description: "The public ngrok URL to remove.",
    type: "string",
    validator: (value: string) => {
      if (!value.startsWith("https://") && !value.startsWith("http://")) {
        return "URL must start with https:// or http://";
      }
      return true;
    },
  })
  .action(({ url }: Readonly<{ url: string }>) => {
    return runNgrokURLRemove({ url });
  });
