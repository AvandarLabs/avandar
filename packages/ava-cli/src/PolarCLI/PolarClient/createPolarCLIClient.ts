import { Polar } from "@polar-sh/sdk";
import { getItemsFromListPage } from "./listUtils";

export type PolarServerType = "sandbox" | "production";

export type PolarCLIClient = {
  polar: Polar;
  organizationId: string;
};

function _getPolarServerType(): PolarServerType {
  const serverType = process.env.POLAR_SERVER_TYPE;
  if (!serverType) {
    throw new Error("POLAR_SERVER_TYPE is not set in .env.development");
  }

  if (serverType !== "sandbox" && serverType !== "production") {
    throw new Error(
      "Invalid POLAR_SERVER_TYPE. Only 'sandbox' and 'production' are " +
        "supported.",
    );
  }
  return serverType;
}

function _getPolarAccessToken(): string {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN is not set in .env.development");
  }
  return accessToken;
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
 * Loads `.env.development` to read `POLAR_ACCESS_TOKEN` and
 * `POLAR_SERVER_TYPE`.
 */
export async function createPolarCLIClient(): Promise<PolarCLIClient> {
  const accessToken = _getPolarAccessToken();
  const serverType = _getPolarServerType();

  const polar = new Polar({
    accessToken,
    server: serverType,
  });

  const organizationId = await _getOrganizationId(polar);

  return { polar, organizationId };
}
