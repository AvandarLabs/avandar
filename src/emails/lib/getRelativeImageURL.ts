if (!process.env.RESEND_SITE_IMG_URL) {
  throw new Error(
    "RESEND_SITE_IMG_URL is not set. We cannot build absolute image URLs without it.",
  );
}

/**
 * Returns the absolute URL to an image whose `relativePath` is relative to the
 * `RESEND_SITE_IMG_URL` environment variable.
 * @param relativePath The path to the image, relative to the
 * `RESEND_SITE_IMG_URL` environment variable.
 * @returns The absolute URL to the image
 */
export function getRelativeImageURL(relativePath: string): string {
  const fixedPath =
    relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  const fixedDomain =
    process.env.RESEND_SITE_IMG_URL?.endsWith("/") ?
      process.env.RESEND_SITE_IMG_URL.slice(0, -1)
    : process.env.RESEND_SITE_IMG_URL;
  return `${fixedDomain}${fixedPath}`;
}
