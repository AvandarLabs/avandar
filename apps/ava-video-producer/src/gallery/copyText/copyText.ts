/**
 * Copies text to the clipboard, falling back to a hidden textarea on local
 * HTTP where the Clipboard API is blocked. Throws when neither works. Use it
 * for any copy button, such as a creative brief or a theme's JSON.
 */
export async function copyTextToClipboard(
  value: string,
  label: string,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    /* Local HTTP fallback. */
  }
  const previousFocus =
    document.activeElement instanceof HTMLElement ||
    document.activeElement instanceof SVGElement
      ? document.activeElement
      : undefined;
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("aria-label", label);
  field.style.cssText =
    "position:fixed;left:0;top:0;opacity:0;width:1px;height:1px";
  (document.querySelector("dialog[open]") ?? document.body).append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  previousFocus?.focus();
  if (!copied) {
    throw new Error("Clipboard unavailable");
  }
}
