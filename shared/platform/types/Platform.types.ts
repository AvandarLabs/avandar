/**
 * Discriminator identifying the runtime host: a browser (`"web"`) or the
 * Electrobun desktop shell (`"desktop"`). Platform-specific behavior should
 * branch on {@link isDesktop} rather than directly on this literal.
 */
export type Platform = "web" | "desktop";
