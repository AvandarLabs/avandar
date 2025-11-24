/**
 * Returns the absolute URL to an image in the public/images directory
 * @param path The path to the image, relative to the public/images directory
 * @returns The absolute URL to the image
 */
export function getRelativeImageURL(path: string): string {
  const fixedPath = path.startsWith("/") ? path : `/${path}`;
  return `${process.env.RESEND_SITE_IMG_URL ?? ""}${fixedPath}`;
}
