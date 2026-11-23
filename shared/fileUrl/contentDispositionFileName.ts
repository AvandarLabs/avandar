/**
 * The file name a `Content-Disposition` header claims, if it claims one.
 * An RFC 5987 `filename*` wins over a plain `filename`.
 */
export function contentDispositionFileName(
  header: string | null,
): string | undefined {
  if (header === null) {
    return undefined;
  }
  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    return _decode(encoded[1]);
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  const name = plain?.[1]?.trim();
  return name === undefined || name.length === 0 ? undefined : name;
}

function _decode(value: string): string | undefined {
  const trimmed = value.trim().replaceAll('"', "");
  if (trimmed.length === 0) {
    return undefined;
  }
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}
