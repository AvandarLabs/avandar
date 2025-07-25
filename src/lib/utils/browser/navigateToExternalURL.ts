export function navigateToExternalURL(url: string): void {
  if (window?.location) {
    window.location.href = url;
  } else {
    throw new Error("window.location is undefined");
  }
}
