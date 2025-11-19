import { Polar } from "npm:@polar-sh/sdk@0.41.3";
import { CustomerSession } from "npm:@polar-sh/sdk/models/components/customersession.js";
import { getPolarAccessToken } from "./getPolarAccessToken.ts";
import { getPolarServerType } from "./getPolarServerType.ts";
import type { Checkout } from "npm:@polar-sh/sdk/models/components/checkout.js";
import type { Product } from "npm:@polar-sh/sdk/models/components/product.js";
import type { Subscription } from "npm:@polar-sh/sdk/models/components/subscription.js";

export type PolarClient = {
  /**
   * Get a subscription by its ID.
   * @param subscriptionId The ID of the subscription to get
   * @returns The subscription
   */
  getSubscription: (options: {
    subscriptionId: string;
  }) => Promise<Subscription | null>;

  /**
   * Update a subscription's subscribed-to product.
   *
   * @param subscriptionId The ID of the subscription to update
   * @param newProductId The ID of the new product to update the subscription to
   * @returns The updated subscription
   */
  updateSubscriptionProduct: (options: {
    subscriptionId: string;
    newProductId: string;
  }) => Promise<Subscription>;

  /**
   * Get the Polar products, but with a simplified structure.
   */
  getProducts: () => Promise<Product[]>;

  /**
   * Create a checkout session for a single Polar product.
   * @param productId The ID of the product to checkout
   * @returns The checkout URL
   */
  createCheckoutSession: (options: {
    /**
     * Metadata that is specific to Avandar, to send with the Polar API reques
     */
    avandarMetadata: {
      /**
       * The Avandar User ID. This will be attached to the checkout metadata,
       * so that we can read it back in a webhook.
       */
      userId: string;

      /**
       * The Avandar Workspace ID. This will be attached to the checkout
       * metadata, so that we can read it back in a webhook and know which
       * workspace the subscription is associated with.
       */
      workspaceId: string;
    };

    /**
     * The ID of the Polar product to checkout.
     */
    productId: string;

    /**
     * The URL to use in the Back button in Polar's checkout page.
     */
    returnURL: string;

    /**
     * The URL to redirect to after the checkout is completed.
     */
    successURL: string;

    /** The email of the user to auto-fill in the checkout form */
    checkoutEmail: string;

    /**
     * Number of seats to purchase in the checkout. This is require
     * if the product being checked out has seat-based pricing.
     */
    numSeats?: number;

    /**
     * The ID of the current subscription if we are upgrading from a free plan
     * to a paid plan.
     */
    currentSubscriptionId?: string | undefined;

    /**
     * The ID of the current customer in Polar (if they already exist)
     * to make sure we link the checkout to the same customer in Polar.
     */
    currentCustomerId?: string | undefined;
  }) => Promise<Checkout>;

  /**
   * Create a customer session for a customer in Polar.
   * @param customerId The Polar ID of the customer to create a session for
   * @returns The customer session
   */
  createCustomerSessions: (
    options: {
      /**
       * The URL to redirect to after the customer session is created.
       */
      returnURL?: string;
    } & (
      | {
          /**
           * The Polar ID of the customer to create a session for
           */
          customerId: string;
          avandarUserId?: undefined;
        }
      | {
          /** * The ID of the customer in Avandar */
          avandarUserId: string;
          customerId?: undefined;
        }
    ),
  ) => Promise<CustomerSession>;
};

function createPolarClient(): PolarClient {
  const polar = new Polar({
    accessToken: getPolarAccessToken(),
    server: getPolarServerType(),
  });

  return {
    getSubscription: async (options: { subscriptionId: string }) => {
      const subscription = await polar.subscriptions.get({
        id: options.subscriptionId,
      });
      return subscription;
    },

    updateSubscriptionProduct: async (options: {
      subscriptionId: string;
      newProductId: string;
    }) => {
      console.log(
        "[PolarClient] Requesting an update to a Polar subscription",
        {
          subscriptionId: options.subscriptionId,
          newProductId: options.newProductId,
        },
      );
      const subscription = await polar.subscriptions.update({
        id: options.subscriptionId,
        subscriptionUpdate: {
          productId: options.newProductId,
          prorationBehavior: "prorate",
        },
      });
      return subscription;
    },

    getProducts: async () => {
      const responses = await polar.products.list({
        page: 1,
        limit: 100, // page size
      });
      const pages = await Array.fromAsync(responses);
      const polarProducts: Product[] = pages.flatMap((page) => {
        return page.result.items;
      });
      return polarProducts;
    },

    createCheckoutSession: async ({
      productId,
      returnURL,
      successURL,
      numSeats,
      checkoutEmail,
      avandarMetadata,
      currentSubscriptionId,
      currentCustomerId,
    }) => {
      console.log(
        "[PolarClient] Requesting a Polar checkout session for product",
        productId,
      );
      const checkout = await polar.checkouts.create({
        products: [productId],
        returnUrl: returnURL,
        successUrl: successURL,
        seats: numSeats,
        metadata: avandarMetadata,
        customerMetadata: {
          avandarEmail: checkoutEmail,
        },
        customerEmail: checkoutEmail,
        externalCustomerId: avandarMetadata.userId,
        subscriptionId: currentSubscriptionId ?? undefined,
        customerId: currentCustomerId ?? undefined,
      });
      return checkout;
    },

    createCustomerSessions: async (options) => {
      const { customerId, avandarUserId, returnURL } = options;
      const customerSessionOptions =
        customerId ? { customerId, returnUrl: returnURL }
        : avandarUserId ?
          { externalCustomerId: avandarUserId, returnUrl: returnURL }
        : undefined;
      if (!customerSessionOptions) {
        throw new Error("No customer session options provided");
      }
      const customerSession = await polar.customerSessions.create(
        customerSessionOptions,
      );
      return customerSession;
    },
  };
}

export const PolarClient = createPolarClient();
