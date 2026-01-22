import { getItemsFromListPage } from "./listUtils";
import type { Polar } from "@polar-sh/sdk";

export type PolarCustomer = Readonly<{
  id: string;
  email: string;
}>;

export type PolarProduct = Readonly<{
  id: string;
  name?: string;
  isArchived?: boolean;
  metadata: Record<string, unknown>;
  prices: ReadonlyArray<
    Readonly<{
      amountType?: unknown;
    }>
  >;
}>;

function _isFreeProduct(product: PolarProduct): boolean {
  const featurePlanType = product.metadata["featurePlanType"];
  const hasFreePrice = product.prices.some((price) => {
    return price.amountType === "free";
  });
  return featurePlanType === "free" && hasFreePrice;
}

/**
 * Find the Polar product representing the Avandar Free plan.
 *
 * This selects the first product with `metadata.featurePlanType === "free"`
 * and at least one `prices[*].amountType === "free"`.
 *
 * @param options.polar The Polar SDK client
 * @param options.organizationId The Polar organization ID
 * @throws If no eligible Free product is found
 * @returns The Free plan product
 */
export async function getFreeProduct(options: {
  polar: Polar;
  organizationId: string;
}): Promise<PolarProduct> {
  const responses: AsyncIterable<unknown> = await options.polar.products.list({
    organizationId: options.organizationId,
    isArchived: false,
    isRecurring: true,
    page: 1,
    limit: 100,
  });

  const pages = await Array.fromAsync(responses);
  const products: readonly PolarProduct[] = pages.flatMap((page) => {
    return getItemsFromListPage<PolarProduct>(page);
  });

  const freeProducts = products.filter(_isFreeProduct);
  const freeProduct = freeProducts[0];
  if (!freeProduct) {
    throw new Error(
      "Could not find a Free Polar product. Expected a product with " +
        '`metadata.featurePlanType === "free"` and a free price.',
    );
  }

  return freeProduct;
}

/**
 * Look up a Polar customer by exact email address.
 *
 * @param options.polar The Polar SDK client
 * @param options.organizationId The Polar organization ID
 * @param options.email The email to search for
 * @returns The first matching customer, or undefined if none exist
 */
export async function getCustomerByEmail(options: {
  polar: Polar;
  organizationId: string;
  email: string;
}): Promise<PolarCustomer | undefined> {
  const responses: AsyncIterable<unknown> = await options.polar.customers.list({
    organizationId: options.organizationId,
    email: options.email,
    page: 1,
    limit: 100,
  });

  const pages = await Array.fromAsync(responses);
  const customers: readonly PolarCustomer[] = pages.flatMap((page) => {
    return getItemsFromListPage<PolarCustomer>(page);
  });

  return customers[0];
}

/**
 * Create a Polar customer with the given email.
 *
 * @param options.polar The Polar SDK client
 * @param options.organizationId The Polar organization ID
 * @param options.email The email for the new customer
 * @returns The created Polar customer
 */
export async function createCustomer(options: {
  polar: Polar;
  organizationId: string;
  email: string;
}): Promise<PolarCustomer> {
  const customer = await options.polar.customers.create({
    organizationId: options.organizationId,
    email: options.email,
  });

  return customer as PolarCustomer;
}

/**
 * Get an existing Polar customer by email, or create them if missing.
 *
 * @param options.polar The Polar SDK client
 * @param options.organizationId The Polar organization ID
 * @param options.email The email to look up or create
 * @returns The existing or newly created Polar customer
 */
export async function getOrCreateCustomerByEmail(options: {
  polar: Polar;
  organizationId: string;
  email: string;
}): Promise<PolarCustomer> {
  const existingCustomer = await getCustomerByEmail(options);
  if (existingCustomer) {
    return existingCustomer;
  }

  return await createCustomer(options);
}

type PolarCustomerState = Readonly<{
  subscriptions?: ReadonlyArray<
    Readonly<{
      productId?: unknown;
      product?: Readonly<{ id?: unknown }>;
    }>
  >;
}>;

function _getSubscribedProductIds(state: unknown): readonly string[] {
  if (typeof state !== "object" || state === null) {
    return [];
  }

  const typed = state as PolarCustomerState;
  const subscriptions = typed.subscriptions ?? [];
  return subscriptions
    .map((sub) => {
      const productId =
        typeof sub.productId === "string" ? sub.productId
        : typeof sub.product?.id === "string" ? sub.product.id
        : undefined;
      return productId;
    })
    .filter((id): id is string => {
      return id !== undefined;
    });
}

/**
 * Check whether a Polar customer has a subscription for a given product.
 *
 * This uses `polar.customers.getState` and inspects returned subscriptions.
 *
 * @param options.polar The Polar SDK client
 * @param options.customerId The Polar customer ID
 * @param options.productId The Polar product ID
 * @returns True if the product is found among customer subscriptions
 */
export async function hasSubscriptionForProduct(options: {
  polar: Polar;
  customerId: string;
  productId: string;
}): Promise<boolean> {
  const state = (await options.polar.customers.getState({
    id: options.customerId,
  })) as unknown;

  const productIds = _getSubscribedProductIds(state);
  return productIds.includes(options.productId);
}
