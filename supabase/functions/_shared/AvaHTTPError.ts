export class AvaHTTPError extends Error {
  constructor(
    public override readonly message: string,
    public readonly httpCode: number,
  ) {
    super(message);
  }
}
