/**
 * The email address to use for the sender of transactional emails.
 *
 * TODO(jpsyx): this should be an environment variable
 */
export const EMAIL_FROM = "Avandar <avandar@notifications.avandarlabs.com>";

/** Configuration for the logo to use in emails. */
export const LOGO = {
  /**
   * The real width of the logo. As in, the actual width of the source
   * image.
   */
  originalWidth: 1841,

  /**
   * The real height of the logo. As in, the actual height of the source
   * image.
   */
  originalHeight: 410,

  /** The scale factor to use when rendering the logo in emails. */
  scaleForEmail: 0.2,
};

/** Configuration for the theme to use in emails. */
export const THEME = {
  /** The background color for the email. */
  bodyBackgroundColor: "#f3f3f5",

  /** The background color for the main content. */
  contentBackgroundColor: "#ffffff",

  /** The color to use for the footer text. */
  footerTextColor: "#9199a1",
};
