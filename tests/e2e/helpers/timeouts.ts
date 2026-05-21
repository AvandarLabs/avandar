/** Quick UI updates (visibility, enabled after local render). */
export const SHORT_WAIT = 5_000;

/** Debounced fields or short client work. */
export const MEDIUM_WAIT = 15_000;

/** Parse previews, post-auth routing, storage `expect.poll`. */
export const LONG_WAIT = 30_000;

/** Polar sandbox checkout + fetch-and-sync round trip. */
export const CHECKOUT_WAIT = 90_000;
