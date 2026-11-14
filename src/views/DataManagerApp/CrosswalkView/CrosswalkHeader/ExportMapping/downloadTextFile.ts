/**
 * Saves `text` as a file named `fileName` through the browser's download,
 * then releases the object URL. Used by Export mapping.
 */
export function downloadTextFile(
  options: Readonly<{ text: string; fileName: string; mimeType: string }>,
): void {
  const blob = new Blob([options.text], { type: options.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = options.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
