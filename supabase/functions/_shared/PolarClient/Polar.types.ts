/**
 * The entirety of this file is pulleed from the @polar-sh/sdk package. The
 * problem is that the types were not publicly exported and so we could not
 * refer to them within Deno. So they have been copied from the source here.
 *
 * This may go out of sync with the @polar-sh/sdk package, so as soon as we can
 * start importing directly from the package, we should do that instead.
 */
export type TrialInterval = "day" | "week" | "month" | "year";

export type SubscriptionRecurringInterval = "day" | "week" | "month" | "year";

export type ProductPriceType = "one_time" | "recurring";

/**
 * A pay-what-you-want recurring price for a product, i.e. a subscription.
 *
 * @remarks
 *
 * **Deprecated**: The recurring interval should be set on the product itself.
 */
export type LegacyRecurringProductPriceCustom = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the price.
   */
  id: string;
  amountType: "custom";
  /**
   * Whether the price is archived and no longer available.
   */
  isArchived: boolean;
  /**
   * The ID of the product owning the price.
   */
  productId: string;
  /**
   * The type of the price.
   */
  type: "recurring";
  recurringInterval: SubscriptionRecurringInterval;
  /**
   * The currency.
   */
  priceCurrency: string;
  /**
   * The minimum amount the customer can pay.
   */
  minimumAmount: number | null;
  /**
   * The maximum amount the customer can pay.
   */
  maximumAmount: number | null;
  /**
   * The initial amount shown to the customer.
   */
  presetAmount: number | null;
  legacy: true;
};

/**
 * A free recurring price for a product, i.e. a subscription.
 *
 * @remarks
 *
 * **Deprecated**: The recurring interval should be set on the product itself.
 */
export type LegacyRecurringProductPriceFree = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the price.
   */
  id: string;
  amountType: "free";
  /**
   * Whether the price is archived and no longer available.
   */
  isArchived: boolean;
  /**
   * The ID of the product owning the price.
   */
  productId: string;
  /**
   * The type of the price.
   */
  type: "recurring";
  recurringInterval: SubscriptionRecurringInterval;
  legacy: true;
};

/**
 * A recurring price for a product, i.e. a subscription.
 *
 * @remarks
 *
 * **Deprecated**: The recurring interval should be set on the product itself.
 */
export type LegacyRecurringProductPriceFixed = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the price.
   */
  id: string;
  amountType: "fixed";
  /**
   * Whether the price is archived and no longer available.
   */
  isArchived: boolean;
  /**
   * The ID of the product owning the price.
   */
  productId: string;
  /**
   * The type of the price.
   */
  type: "recurring";
  recurringInterval: SubscriptionRecurringInterval;
  /**
   * The currency.
   */
  priceCurrency: string;
  /**
   * The price in cents.
   */
  priceAmount: number;
  legacy: true;
};

export type LegacyRecurringProductPrice =
  | (LegacyRecurringProductPriceCustom & {
      amountType: "custom";
    })
  | (LegacyRecurringProductPriceFixed & {
      amountType: "fixed";
    })
  | (LegacyRecurringProductPriceFree & {
      amountType: "free";
    });

/**
 * A meter associated to a metered price.
 */
export type ProductPriceMeter = {
  /**
   * The ID of the object.
   */
  id: string;
  /**
   * The name of the meter.
   */
  name: string;
};

/**
 * A metered, usage-based, price for a product, with a fixed unit price.
 */
export type ProductPriceMeteredUnit = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the price.
   */
  id: string;
  amountType: "metered_unit";
  /**
   * Whether the price is archived and no longer available.
   */
  isArchived: boolean;
  /**
   * The ID of the product owning the price.
   */
  productId: string;
  type: ProductPriceType;
  /**
   * @deprecated field: This will be removed in a future release, please migrate
   * away from it as soon as possible.
   */
  recurringInterval: SubscriptionRecurringInterval | null;
  /**
   * The currency.
   */
  priceCurrency: string;
  /**
   * The price per unit in cents.
   */
  unitAmount: string;
  /**
   * The maximum amount in cents that can be charged, regardless of the number
   * of units consumed.
   */
  capAmount: number | null;
  /**
   * The ID of the meter associated to the price.
   */
  meterId: string;
  /**
   * A meter associated to a metered price.
   */
  meter: ProductPriceMeter;
};

/**
 * A fixed price for a product.
 */
export type ProductPriceFixed = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the price.
   */
  id: string;
  amountType: "fixed";
  /**
   * Whether the price is archived and no longer available.
   */
  isArchived: boolean;
  /**
   * The ID of the product owning the price.
   */
  productId: string;
  type: ProductPriceType;
  /**
   * @deprecated field: This will be removed in a future release, please migrate
   * away from it as soon as possible.
   */
  recurringInterval: SubscriptionRecurringInterval | null;
  /**
   * The currency.
   */
  priceCurrency: string;
  /**
   * The price in cents.
   */
  priceAmount: number;
};

/**
 * A free price for a product.
 */
export type ProductPriceFree = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the price.
   */
  id: string;
  amountType: "free";
  /**
   * Whether the price is archived and no longer available.
   */
  isArchived: boolean;
  /**
   * The ID of the product owning the price.
   */
  productId: string;
  type: ProductPriceType;
  /**
   * @deprecated field: This will be removed in a future release, please migrate
   * away from it as soon as possible.
   */
  recurringInterval: SubscriptionRecurringInterval | null;
};

/**
 * A pay-what-you-want price for a product.
 */
export type ProductPriceCustom = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the price.
   */
  id: string;
  amountType: "custom";
  /**
   * Whether the price is archived and no longer available.
   */
  isArchived: boolean;
  /**
   * The ID of the product owning the price.
   */
  productId: string;
  type: ProductPriceType;
  /**
   * @deprecated field: This will be removed in a future release, please migrate
   * away from it as soon as possible.
   */
  recurringInterval: SubscriptionRecurringInterval | null;
  /**
   * The currency.
   */
  priceCurrency: string;
  /**
   * The minimum amount the customer can pay.
   */
  minimumAmount: number | null;
  /**
   * The maximum amount the customer can pay.
   */
  maximumAmount: number | null;
  /**
   * The initial amount shown to the customer.
   */
  presetAmount: number | null;
};

/**
 * A pricing tier for seat-based pricing.
 */
export type ProductPriceSeatTier = {
  /**
   * Minimum number of seats (inclusive)
   */
  minSeats: number;
  /**
   * Maximum number of seats (inclusive). None for unlimited.
   */
  maxSeats?: number | null | undefined;
  /**
   * Price per seat in cents for this tier
   */
  pricePerSeat: number;
};

/**
 * List of pricing tiers for seat-based pricing.
 */
export type ProductPriceSeatTiers = {
  /**
   * List of pricing tiers
   */
  tiers: ProductPriceSeatTier[];
};

/**
 * A seat-based price for a product.
 */
export type ProductPriceSeatBased = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the price.
   */
  id: string;
  amountType: "seat_based";
  /**
   * Whether the price is archived and no longer available.
   */
  isArchived: boolean;
  /**
   * The ID of the product owning the price.
   */
  productId: string;
  type: ProductPriceType;

  /**
   * @deprecated field: This will be removed in a future release, please
   * migrate away from it as soon as possible.
   */
  recurringInterval: SubscriptionRecurringInterval | null;
  /**
   * The currency.
   */
  priceCurrency: string;
  /**
   * List of pricing tiers for seat-based pricing.
   */
  seatTiers: ProductPriceSeatTiers;
};

export type ProductPrice =
  | (ProductPriceMeteredUnit & {
      amountType: "metered_unit";
    })
  | (ProductPriceCustom & {
      amountType: "custom";
    })
  | (ProductPriceFixed & {
      amountType: "fixed";
    })
  | (ProductPriceSeatBased & {
      amountType: "seat_based";
    })
  | (ProductPriceFree & {
      amountType: "free";
    });

export type BenefitLicenseKeysMetadata = string | number | number | boolean;

export type Timeframe = "year" | "month" | "day";

export type BenefitLicenseKeyExpirationProperties = {
  ttl: number;
  timeframe: Timeframe;
};

export type BenefitLicenseKeyActivationProperties = {
  limit: number;
  enableCustomerAdmin: boolean;
};

export type BenefitLicenseKeysProperties = {
  prefix: string | null;
  expires: BenefitLicenseKeyExpirationProperties | null;
  activations: BenefitLicenseKeyActivationProperties | null;
  limitUsage: number | null;
};

export type BenefitLicenseKeys = {
  /**
   * The ID of the benefit.
   */
  id: string;
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  type: "license_keys";
  /**
   * The description of the benefit.
   */
  description: string;
  /**
   * Whether the benefit is selectable when creating a product.
   */
  selectable: boolean;
  /**
   * Whether the benefit is deletable.
   */
  deletable: boolean;
  /**
   * The ID of the organization owning the benefit.
   */
  organizationId: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  properties: BenefitLicenseKeysProperties;
};

export type BenefitDownloadablesProperties = {
  archived: {
    [k: string]: boolean;
  };
  files: string[];
};

export type BenefitDownloadables = {
  /**
   * The ID of the benefit.
   */
  id: string;
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  type: "downloadables";
  /**
   * The description of the benefit.
   */
  description: string;
  /**
   * Whether the benefit is selectable when creating a product.
   */
  selectable: boolean;
  /**
   * Whether the benefit is deletable.
   */
  deletable: boolean;
  /**
   * The ID of the organization owning the benefit.
   */
  organizationId: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  properties: BenefitDownloadablesProperties;
};

/**
 * The permission level to grant. Read more about roles and their permissions on [GitHub documentation](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization#permissions-for-each-role).
 */
export type Permission = "pull" | "triage" | "push" | "maintain" | "admin";

/**
 * Properties for a benefit of type `github_repository`.
 */
export type BenefitGitHubRepositoryProperties = {
  /**
   * The owner of the repository.
   */
  repositoryOwner: string;
  /**
   * The name of the repository.
   */
  repositoryName: string;
  /**
   * The permission level to grant. Read more about roles and their permissions on [GitHub documentation](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization#permissions-for-each-role).
   */
  permission: Permission;
};

/**
 * A benefit of type `github_repository`.
 *
 * @remarks
 *
 * Use it to automatically invite your backers to a private GitHub repository.
 */
export type BenefitGitHubRepository = {
  /**
   * The ID of the benefit.
   */
  id: string;
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  type: "github_repository";
  /**
   * The description of the benefit.
   */
  description: string;
  /**
   * Whether the benefit is selectable when creating a product.
   */
  selectable: boolean;
  /**
   * Whether the benefit is deletable.
   */
  deletable: boolean;
  /**
   * The ID of the organization owning the benefit.
   */
  organizationId: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  /**
   * Properties for a benefit of type `github_repository`.
   */
  properties: BenefitGitHubRepositoryProperties;
};

/**
 * Properties for a benefit of type `discord`.
 */
export type BenefitDiscordProperties = {
  /**
   * The ID of the Discord server.
   */
  guildId: string;
  /**
   * The ID of the Discord role to grant.
   */
  roleId: string;
  /**
   * Whether to kick the member from the Discord server on revocation.
   */
  kickMember: boolean;
  guildToken: string;
};

/**
 * A benefit of type `discord`.
 *
 * @remarks
 *
 * Use it to automatically invite your backers to a Discord server.
 */
export type BenefitDiscord = {
  /**
   * The ID of the benefit.
   */
  id: string;
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  type: "discord";
  /**
   * The description of the benefit.
   */
  description: string;
  /**
   * Whether the benefit is selectable when creating a product.
   */
  selectable: boolean;
  /**
   * Whether the benefit is deletable.
   */
  deletable: boolean;
  /**
   * The ID of the organization owning the benefit.
   */
  organizationId: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  /**
   * Properties for a benefit of type `discord`.
   */
  properties: BenefitDiscordProperties;
};

export type BenefitCustomProperties = {
  note: string | null;
};

/**
 * A benefit of type `custom`.
 *
 * @remarks
 *
 * Use it to grant any kind of benefit that doesn't fit in the other types.
 */
export type BenefitCustom = {
  /**
   * The ID of the benefit.
   */
  id: string;
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  type: "custom";
  /**
   * The description of the benefit.
   */
  description: string;
  /**
   * Whether the benefit is selectable when creating a product.
   */
  selectable: boolean;
  /**
   * Whether the benefit is deletable.
   */
  deletable: boolean;
  /**
   * The ID of the organization owning the benefit.
   */
  organizationId: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  /**
   * Properties for a benefit of type `custom`.
   */
  properties: BenefitCustomProperties;
};

export type BenefitMeterCreditProperties = {
  units: number;
  rollover: boolean;
  meterId: string;
};

/**
 * A benefit of type `meter_unit`.
 *
 * @remarks
 *
 * Use it to grant a number of units on a specific meter.
 */
export type BenefitMeterCredit = {
  /**
   * The ID of the benefit.
   */
  id: string;
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  type: "meter_credit";
  /**
   * The description of the benefit.
   */
  description: string;
  /**
   * Whether the benefit is selectable when creating a product.
   */
  selectable: boolean;
  /**
   * Whether the benefit is deletable.
   */
  deletable: boolean;
  /**
   * The ID of the organization owning the benefit.
   */
  organizationId: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  /**
   * Properties for a benefit of type `meter_unit`.
   */
  properties: BenefitMeterCreditProperties;
};

export type Benefit =
  | BenefitCustom
  | BenefitDiscord
  | BenefitGitHubRepository
  | BenefitDownloadables
  | BenefitLicenseKeys
  | BenefitMeterCredit;

/**
 * File to be used as a product media file.
 */
export type ProductMediaFileRead = {
  /**
   * The ID of the object.
   */
  id: string;
  organizationId: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  storageVersion: string | null;
  checksumEtag: string | null;
  checksumSha256Base64: string | null;
  checksumSha256Hex: string | null;
  lastModifiedAt: Date | null;
  version: string | null;
  service: "product_media";
  isUploaded: boolean;
  createdAt: Date;
  sizeReadable: string;
  publicUrl: string;
};

export type CustomFieldTextProperties = {
  formLabel?: string | undefined;
  formHelpText?: string | undefined;
  formPlaceholder?: string | undefined;
  textarea?: boolean | undefined;
  minLength?: number | undefined;
  maxLength?: number | undefined;
};

/**
 * Schema for a custom field of type text.
 */
export type CustomFieldText = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the object.
   */
  id: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  type: "text";

  /**
   * Identifier of the custom field. It'll be used as key when storing the
   * value.
   */
  slug: string;
  /**
   * Name of the custom field.
   */
  name: string;
  /**
   * The ID of the organization owning the custom field.
   */
  organizationId: string;
  properties: CustomFieldTextProperties;
};

export type CustomFieldSelectOption = {
  value: string;
  label: string;
};

export type CustomFieldSelectProperties = {
  formLabel?: string | undefined;
  formHelpText?: string | undefined;
  formPlaceholder?: string | undefined;
  options: CustomFieldSelectOption[];
};

/**
 * Schema for a custom field of type select.
 */
export type CustomFieldSelect = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the object.
   */
  id: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  type: "select";
  /**
   * Identifier of the custom field. It'll be used as key when storing the
   * value.
   */
  slug: string;
  /**
   * Name of the custom field.
   */
  name: string;
  /**
   * The ID of the organization owning the custom field.
   */
  organizationId: string;
  properties: CustomFieldSelectProperties;
};

export type CustomFieldNumberProperties = {
  formLabel?: string | undefined;
  formHelpText?: string | undefined;
  formPlaceholder?: string | undefined;
  ge?: number | undefined;
  le?: number | undefined;
};

/**
 * Schema for a custom field of type number.
 */
export type CustomFieldNumber = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the object.
   */
  id: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  type: "number";
  /**
   * Identifier of the custom field. It'll be used as key when storing the
   * value.
   */
  slug: string;
  /**
   * Name of the custom field.
   */
  name: string;
  /**
   * The ID of the organization owning the custom field.
   */
  organizationId: string;
  properties: CustomFieldNumberProperties;
};

export type CustomFieldDateProperties = {
  formLabel?: string | undefined;
  formHelpText?: string | undefined;
  formPlaceholder?: string | undefined;
  ge?: number | undefined;
  le?: number | undefined;
};

/**
 * Schema for a custom field of type date.
 */
export type CustomFieldDate = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the object.
   */
  id: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  type: "date";

  /**
   * Identifier of the custom field. It'll be used as key when storing the
   * value.
   */
  slug: string;
  /**
   * Name of the custom field.
   */
  name: string;
  /**
   * The ID of the organization owning the custom field.
   */
  organizationId: string;
  properties: CustomFieldDateProperties;
};

export type CustomFieldCheckboxProperties = {
  formLabel?: string | undefined;
  formHelpText?: string | undefined;
  formPlaceholder?: string | undefined;
};

/**
 * Schema for a custom field of type checkbox.
 */
export type CustomFieldCheckbox = {
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The ID of the object.
   */
  id: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  type: "checkbox";

  /**
   * Identifier of the custom field. It'll be used as key when storing the
   * value.
   */
  slug: string;
  /**
   * Name of the custom field.
   */
  name: string;
  /**
   * The ID of the organization owning the custom field.
   */
  organizationId: string;
  properties: CustomFieldCheckboxProperties;
};
export type CustomField =
  | (CustomFieldCheckbox & {
      type: "checkbox";
    })
  | (CustomFieldDate & {
      type: "date";
    })
  | (CustomFieldNumber & {
      type: "number";
    })
  | (CustomFieldSelect & {
      type: "select";
    })
  | (CustomFieldText & {
      type: "text";
    });

/**
 * Schema of a custom field attached to a resource.
 */
export type AttachedCustomField = {
  /**
   * ID of the custom field.
   */
  customFieldId: string;
  customField: CustomField;
  /**
   * Order of the custom field in the resource.
   */
  order: number;
  /**
   * Whether the value is required for this custom field.
   */
  required: boolean;
};

/**
 * A product as returned by the Polar API.
 */
export type Product = {
  /**
   * The ID of the object.
   */
  id: string;
  /**
   * Creation timestamp of the object.
   */
  createdAt: Date;
  /**
   * Last modification timestamp of the object.
   */
  modifiedAt: Date | null;
  /**
   * The interval unit for the trial period.
   */
  trialInterval: TrialInterval | null;
  /**
   * The number of interval units for the trial period.
   */
  trialIntervalCount: number | null;
  /**
   * The name of the product.
   */
  name: string;
  /**
   * The description of the product.
   */
  description: string | null;
  /**
   * The recurring interval of the product. If `None`, the product is a
   * one-time purchase.
   */
  recurringInterval: SubscriptionRecurringInterval | null;
  /**
   * Number of interval units of the subscription. If this is set to 1 the
   * charge will happen every interval (e.g. every month), if set to 2 it will
   * be every other month, and so on. None for one-time products.
   */
  recurringIntervalCount: number | null;
  /**
   * Whether the product is a subscription.
   */
  isRecurring: boolean;
  /**
   * Whether the product is archived and no longer available.
   */
  isArchived: boolean;
  /**
   * The ID of the organization owning the product.
   */
  organizationId: string;
  metadata: {
    [k: string]: string | number | number | boolean;
  };
  /**
   * List of prices for this product.
   */
  prices: Array<LegacyRecurringProductPrice | ProductPrice>;
  /**
   * List of benefits granted by the product.
   */
  benefits: Benefit[];
  /**
   * List of medias associated to the product.
   */
  medias: ProductMediaFileRead[];
  /**
   * List of custom fields attached to the product.
   */
  attachedCustomFields: AttachedCustomField[];
};
