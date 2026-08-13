/**
 * Thrown when a layer's sensitivity policy forbids the geometry it was asked
 * to produce.
 */
export class SensitivityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SensitivityViolationError";
  }
}
