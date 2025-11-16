import { Polar } from "npm:@polar-sh/sdk@0.41.3";
import { getPolarAccessToken } from "./getPolarAccessToken.ts";
import { getPolarServerType } from "./getPolarServerType.ts";
import type { Product } from "./Polar.types.ts";

export type PolarClient = {
  /**
   * Get the subscription plans for Avandar
   * @returns The subscription plans
   */
  getSubscriptionPlans: () => Promise<Product[]>;
};

function createPolarClient(): PolarClient {
  const polar = new Polar({
    accessToken: getPolarAccessToken(),
    server: getPolarServerType(),
  });

  return {
    getSubscriptionPlans: async () => {
      const responses = await polar.products.list({
        page: 1,
        limit: 100, // page size
      });
      const pages = await Array.fromAsync(responses);
      const plans = pages.flatMap((page) => {
        return page.result.items;
      });
      return plans;
    },
  };
}

export const PolarClient = createPolarClient();
