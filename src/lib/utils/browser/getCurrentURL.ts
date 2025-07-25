export function getCurrentURL(): string {
  if (window?.location) {
    return window.location.href;
  } else {
    throw new Error("window.location is undefined");
  }
}
