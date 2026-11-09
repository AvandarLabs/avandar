/**
 * Thrown when a pasted link's host is loopback, link-local, or private.
 * The file-link fetcher maps this to a refusal before any request is sent.
 */
export class PrivateFileHostError extends Error {
  constructor(readonly host: string) {
    super(`Refusing to connect to '${host}'`);
    this.name = "PrivateFileHostError";
  }
}
