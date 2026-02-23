import { Acclimate } from "@avandar/acclimate";
import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "../../../utils/cliOutput";
import {
  createPolarCLIClient,
  getFreeProduct,
  getOrCreateCustomerByEmail,
  hasSubscriptionForProduct,
} from "../../PolarClient";

/**
 * Create a test customer and subscribe them to the Free plan.
 *
 * If the customer already has a Free plan subscription we will do nothing.
 */
export async function runCustomerCreate(): Promise<void> {
  const email = "user@avandarlabs.com";

  printWarn("This command only supports creating a test customer:");
  printWarn(`- email: ${email}`);
  printWarn("- plan: Free (auto-selected)");

  try {
    printInfo("Connecting to Polar...");
    const { polar, organizationId } = await createPolarCLIClient();

    printInfo("Resolving Free plan product...");
    const freeProduct = await getFreeProduct({ polar, organizationId });

    printInfo(`Ensuring customer exists: ${email}...`);
    const customer = await getOrCreateCustomerByEmail({
      polar,
      organizationId,
      email,
    });

    printInfo("Checking existing subscriptions...");
    const alreadySubscribed = await hasSubscriptionForProduct({
      polar,
      customerId: customer.id,
      productId: freeProduct.id,
    });

    if (alreadySubscribed) {
      printSuccess("Customer already has a Free subscription. Nothing to do.");
      printSuccess(`customerId: ${customer.id}`);
      printSuccess(`freeProductId: ${freeProduct.id}`);
      return;
    }

    printInfo("Creating Free subscription...");
    const subscription = await polar.subscriptions.create({
      productId: freeProduct.id,
      customerId: customer.id,
    });

    const subscriptionId =
      typeof (subscription as { id?: unknown }).id === "string" ?
        (subscription as { id: string }).id
      : "unknown";

    printSuccess("Created test customer and Free subscription.");
    printSuccess(`customerId: ${customer.id}`);
    printSuccess(`freeProductId: ${freeProduct.id}`);
    printSuccess(`subscriptionId: ${subscriptionId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    printError("Failed to create Polar customer / subscription.");
    printError(errorMessage);
    printError(
      "Verify .env.development contains POLAR_ACCESS_TOKEN and " +
        "POLAR_SERVER_TYPE.",
    );
    throw error;
  }
}

/** Create a test customer and subscribe them to the Free plan. */
export const CustomerCreateCLI = Acclimate.createCLI("create")
  .description("Create a test customer and subscribe them to the Free plan.")
  .action(runCustomerCreate);
