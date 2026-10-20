/**
 * A source returned a connection older than the one before it in the same
 * drive. Writing past it would leave a gap behind the stored high-water mark,
 * so the drive stops at this page.
 */
export class OutOfOrderConnectionError extends Error {
  /** The drive whose source returned connections out of order. */
  readonly driveKey: string;

  constructor(args: {
    driveKey: string;
    connectionId: string;
    timestamp: Date;
    previousTimestamp: Date;
  }) {
    super(
      `Drive ${args.driveKey} returned ${args.connectionId} at ${args.timestamp.toISOString()}, older than the connection before it at ${args.previousTimestamp.toISOString()}. Connections must arrive oldest first.`,
    );
    this.name = "OutOfOrderConnectionError";
    this.driveKey = args.driveKey;
  }
}
