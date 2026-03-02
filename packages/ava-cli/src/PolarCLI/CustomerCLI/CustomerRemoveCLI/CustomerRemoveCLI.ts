import { Acclimate } from "@avandar/acclimate";
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "../../../utils/cliOutput";
import { createPolarCLIClient, getItemsFromListPage } from "../../PolarClient";

type PolarCustomer = Readonly<{
  id: string;
  email?: string;
}>;

/**
 * Remove a customer (and associated subscriptions) by email.
 *
 * This is separated from the CLI wiring so it can be unit-tested.
 */
export async function runCustomerRemove(options: {
  email: string;
}): Promise<void> {
  const { email } = options;

  printWarn("This will delete the Polar customer and cancel subscriptions.");
  printWarn(`email: ${email}`);

  try {
    printInfo("Connecting to Polar...");
    const { polar, organizationId } = await createPolarCLIClient();

    printInfo("Searching for customer by email...");
    const responses: AsyncIterable<unknown> = await polar.customers.list({
      organizationId,
      email,
      page: 1,
      limit: 100,
    });

    const pages = await Array.fromAsync(responses);
    const customers: readonly PolarCustomer[] = pages.flatMap((page) => {
      return getItemsFromListPage<PolarCustomer>(page);
    });

    if (customers.length === 0) {
      printWarn("No Polar customer found for this email. Nothing to do.");
      return;
    }

    await Promise.all(
      customers.map(async (customer) => {
        printInfo(`Deleting customerId: ${customer.id}...`);
        await polar.customers.delete({ id: customer.id });
        printSuccess(`Deleted customerId: ${customer.id}`);
      }),
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    printError("Failed to remove Polar customer.");
    printError(errorMessage);
    printError(
      "Verify .env.development contains POLAR_ACCESS_TOKEN and " +
        "POLAR_SERVER_TYPE.",
    );
    throw error;
  }
}

/** Remove a customer (and associated subscriptions) by email. */
export const CustomerRemoveCLI = Acclimate.createCLI("remove")
  .description("Remove a Polar customer and associated subscriptions by email.")
  .addOption({
    name: "--email",
    description: "Email of the Polar customer to remove.",
    type: "string",
    required: true,
    askIfEmpty: true,
  })
  .action(runCustomerRemove);
