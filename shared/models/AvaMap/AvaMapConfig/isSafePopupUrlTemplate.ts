const SAFE_URL_PROTOCOLS = new Set(["http:", "https:"]);

/** Returns whether a popup URL template can safely be used as a link. */
export function isSafePopupUrlTemplate(urlTemplate: string): boolean {
  if (urlTemplate === "") {
    return true;
  }

  const urlWithPlaceholders = urlTemplate.replace(/\{[^}]*\}/g, "placeholder");

  try {
    const url = new URL(urlWithPlaceholders, "https://avandar.invalid");
    return SAFE_URL_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}
