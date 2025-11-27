import { buildRelativeImageURL } from "./buildRelativeImageURL";

/** Configuration for the logo to use in emails. */
export const LOGO = {
  /** The source image absolute URL for the logo. */
  src: buildRelativeImageURL("logoAndName.png"),

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
