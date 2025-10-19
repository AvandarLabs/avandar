/** Configuration for the app. */
// TODO(jpsyx): move most of these to environment variables so that
// changes do not require rebuilding production.
type AppConfigType = {
  /**
   * The path and filename to the logo file relative to the `public/` directory.
   * The logo must be in the `public` directory.
   */
  logoFilename: string;

  /** The name of the app. */
  appName: string;

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
};

export const AppConfig = {
  logoFilename: "logoWhite.png",
  appName: "Avandar",
  dataManagerApp: {
    maxDatasetNameLength: 100,
    maxDatasetDescriptionLength: 500,
    maxPreviewRows: 200,
  },
  supportEmail: "support@avandarlabs.com",
  infoEmail: "info@avandarlabs.com",
} satisfies AppConfigType;
