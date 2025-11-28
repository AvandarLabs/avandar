/** Configuration for the app. */
// TODO(jpsyx): move most of these to environment variables so that
// they do not get bundled in every page of the app

import {
  BasicPlanConfig,
  FreePlanConfig,
  PremiumPlanConfig,
} from "./FeaturePlansConfig";

// TODO(jpsyx): split this up into individually exported consts
type AppConfigType = {
  /**
   * The path and filename to the logo file relative to the `public/` directory.
   * The logo must be in the `public` directory.
   */
  logoFilename: string;

  /** Configuration for the data import app */
  dataManagerApp: {
    /** Maximum length of dataset name */
    maxDatasetNameLength: number;

    /** Maximum length of dataset description */
    maxDatasetDescriptionLength: number;

    /** Maximum number of rows to preview */
    maxPreviewRows: number;
  };

  /** The email address to use for support inquiries */
  supportEmail: string;

  /** The email address to use for general inquiries */
  infoEmail: string;

  /** Metadata for the subscribable feature plans */
  featurePlansMetadata: {
    free: typeof FreePlanConfig;
    basic: typeof BasicPlanConfig;
    premium: typeof PremiumPlanConfig;
  };
};

export const APP_NAME = "Avandar";

/** The email address to use for support inquiries */
export const SUPPORT_EMAIL = "support@avandarlabs.com";

/** The email address to use for general inquiries */
export const INFO_EMAIL = "info@avandarlabs.com";

/**
 * The URL to the waitlist page. This is only used if self-registration is
 * disabled or if we require a sign up code to register.
 */
export const WAITLIST_URL = "https://avandarlabs.com/waitlist";

// TODO(jpsyx): split up the app config into separate consts and objects to
// avoid bundling the entire config object into every page of the app.
export const AppConfig = {
  logoFilename: "logoWhite.png",
  dataManagerApp: {
    maxDatasetNameLength: 100,
    maxDatasetDescriptionLength: 500,
    maxPreviewRows: 200,
  },
  supportEmail: SUPPORT_EMAIL,
  infoEmail: INFO_EMAIL,
  featurePlansMetadata: {
    free: FreePlanConfig,
    basic: BasicPlanConfig,
    premium: PremiumPlanConfig,
  },
} satisfies AppConfigType;
