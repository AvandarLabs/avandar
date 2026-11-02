import { AvaEnv } from "@ava-cli/AvaEnv/AvaEnv";
import { getItemsFromListPage } from "@ava-cli/PolarCli/PolarClient/listUtils";
import { Polar } from "@polar-sh/sdk";

export type PolarServerType = "sandbox" | "production";

export type PolarCliClient = {
  polar: Polar;
  organizationId: string;
};

function _getPolarServerType(): PolarServerType {
  const serverType = AvaEnv.requireVar("POLAR_SERVER_TYPE");

  if (serverType !== "sandbox" && serverType !== "production") {
    throw new Error(
      "Invalid POLAR_SERVER_TYPE. Only 'sandbox' and 'production' are " +
        "supported.",
    );
  }
  return serverType;
}

type Organization = Readonly<{
  id: string;
}>;

async function _getOrganizationId(polar: Polar): Promise<string> {
  const responses: AsyncIterable<unknown> = await polar.organizations.list({});
  const pages = await Array.fromAsync(responses);
  const organizations: readonly Organization[] = pages.flatMap((page) => {
    return getItemsFromListPage<Organization>(page);
  });

  const firstOrganization = organizations[0];
  if (!firstOrganization) {
    throw new Error(
      "No Polar organizations found for the provided POLAR_ACCESS_TOKEN.",
    );
  }

  return firstOrganization.id;
}

/**
 * Create an authenticated Polar client and resolve the organizationId.
 *
 * Reads `POLAR_ACCESS_TOKEN` and `POLAR_SERVER_TYPE` from whichever env file
 * this invocation loaded.
 */
export async function createPolarCliClient(): Promise<PolarCliClient> {
  const accessToken = AvaEnv.requireVar("POLAR_ACCESS_TOKEN");
  const serverType = _getPolarServerType();

  const polar = new Polar({
    accessToken,
    server: serverType,
  });

  const organizationId = await _getOrganizationId(polar);

  return { polar, organizationId };
}
