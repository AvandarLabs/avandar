import { Polar } from "npm:@polar-sh/sdk@0.41.3";
import { match } from "npm:ts-pattern@5";
import { getPolarAccessToken } from "./getPolarAccessToken.ts";
import { getPolarServerType } from "./getPolarServerType.ts";
import type { AvaPolarProduct } from "./PolarClient.types.ts";
import type { Checkout } from "npm:@polar-sh/sdk/models/components/checkout.js";
import type { Product } from "npm:@polar-sh/sdk/models/components/product.js";

export type PolarClient = {
  /**
   * Get the Polar products
   * @returns The subscription plans
   */
  getProducts: () => Promise<AvaPolarProduct[]>;

  /**
   * Create a checkout session for a single Polar product.
   * @param productId The ID of the product to checkout
   * @returns The checkout URL
   */
  createCheckoutSession: (options: {
    productId: string;
    returnURL: string;
    successURL: string;

    /** The email of the user to auto-fill in the checkout form */
    userEmail: string;

    /**
     * Number of seats to purchase in the checkout. This is require
     * if the product being checked out has seat-based pricing.
     */
    numSeats?: number;
  }) => Promise<Checkout>;
};

function createPolarClient(): PolarClient {
  const polar = new Polar({
    accessToken: getPolarAccessToken(),
    server: getPolarServerType(),
  });

  return {
    getProducts: async () => {
      const responses = await polar.products.list({
        page: 1,
        limit: 100, // page size
      });
      const pages = await Array.fromAsync(responses);
      const polarProducts: Product[] = pages.flatMap((page) => {
        return page.result.items;
      });
      const simplifiedProducts: AvaPolarProduct[] = polarProducts.map(
        (product) => {
          return {
            id: product.id,
            name: product.name,
            description: product.description,
            isArchived: product.isArchived,
            recurringInterval: product.recurringInterval,
            metadata: product.metadata,
            prices: product.prices
              .map((price) => {
                const { id, isArchived } = price;
                return match(price)
                  .with({ amountType: "free" }, (p) => {
                    return {
                      id,
                      isArchived,
                      amountType: p.amountType,
                    };
                  })
                  .with({ amountType: "custom" }, (p) => {
                    return {
                      id,
                      isArchived,
                      amountType: p.amountType,
                      priceCurrency: p.priceCurrency,
                    };
                  })
                  .with({ amountType: "seat_based" }, (p) => {
                    return {
                      id,
                      isArchived,
                      amountType: p.amountType,
                      priceCurrency: p.priceCurrency,
                      seatTiers: p.seatTiers.tiers,
                    };
                  })
                  .otherwise(() => {
                    return undefined;
                  });
              })
              .filter((price): price is NonNullable<typeof price> => {
                return price !== undefined;
              }),
          };
        },
      );
      return simplifiedProducts;
    },

    createCheckoutSession: async ({
      productId,
      returnURL,
      successURL,
      numSeats,
      userEmail,
    }) => {
      const checkout = await polar.checkouts.create({
        products: [productId],
        returnUrl: returnURL,
        successUrl: successURL,
        seats: numSeats,
        customerEmail: userEmail,
      });
      return checkout;
    },
  };
}

export const PolarClient = createPolarClient();
