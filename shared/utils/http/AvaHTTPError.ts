import { PostgrestError } from "@supabase/supabase-js";
import { ErrorResponse as ResendError } from "resend";
import { z, ZodError } from "zod/v4";
import { SUPPORT_EMAIL } from "@/config/AppConfig";
import { HTTPResponseCodes } from "./HTTPResponseCodes";

/**
 * This is our custom error class that extends the built-in Error class.
 * It is used as a standard interface for an HTTP Error that we can
 * return to the client.
 */
export class AvaHTTPError extends Error {
  /**
   * Creates an HTTP Error from a string.
   * @param message The error message.
   * @param status The HTTP status code.
   * @returns A AvaHTTPError with the error message and status code.
   */
  static fromString({
    message,
    status = HTTPResponseCodes.BAD_REQUEST,
  }: {
    message: string;
    status: number;
  }): AvaHTTPError {
    return new AvaHTTPError(message, status);
  }

  /**
   * Creates a AvaHTTPError from a Postgrest error.
   * @param error The Postgrest error.
   * @param errorDict Maps postgres error codes to custom error messages.
   *   Example:
   *   ```ts
   *   {
   *     [PostgresErrorCodes.UNIQUE_VIOLATION]:
   *       "This email is already subscribed to our newsletter"
   *   }
   *   ```
   * @returns A NextResponse with the error message and status code.
   */
  static fromPostgresError(
    error: PostgrestError,
    errorDict: Record<string, string> = {},
    defaultErrorMessage: string = `An unexpected error occurred, please reach out to ${SUPPORT_EMAIL} to subscribe to our newsletter.`,
  ): AvaHTTPError {
    return new AvaHTTPError(
      errorDict[error.code] || defaultErrorMessage,
      error.code in errorDict ?
        HTTPResponseCodes.BAD_REQUEST
      : HTTPResponseCodes.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   *
   * @param error The Resend error.
   * @returns A AvaHTTPError with the error message and status code.
   */
  static fromResendError(error: ResendError): AvaHTTPError {
    return new AvaHTTPError(
      `${error.name}: ${error.message}`,
      error.statusCode ?? HTTPResponseCodes.INTERNAL_SERVER_ERROR,
    );
  }

  static fromZodError(error: z.ZodError): AvaHTTPError {
    return new AvaHTTPError(
      error.issues
        .map((issue) => {
          return issue.message;
        })
        .join("\n"),
      HTTPResponseCodes.BAD_REQUEST,
    );
  }

  static fromError(error: Error): AvaHTTPError {
    if (error instanceof AvaHTTPError) {
      return error;
    }
    if (error instanceof ZodError) {
      return AvaHTTPError.fromZodError(error);
    }
    if (error instanceof PostgrestError) {
      return AvaHTTPError.fromPostgresError(error);
    }
    return new AvaHTTPError(
      error.message,
      HTTPResponseCodes.INTERNAL_SERVER_ERROR,
    );
  }

  static fromUnknownValue(error: unknown): AvaHTTPError {
    if (error instanceof Error) {
      return AvaHTTPError.fromError(error as Error);
    }
    return new AvaHTTPError(
      "An unknown error occurred",
      HTTPResponseCodes.INTERNAL_SERVER_ERROR,
    );
  }

  constructor(
    message: string,
    public readonly status: number = HTTPResponseCodes.BAD_REQUEST,
  ) {
    super(message);
  }
}
