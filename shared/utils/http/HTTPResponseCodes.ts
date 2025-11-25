export const HTTPResponseCodes = {
  /** Standard response for successful HTTP requests. */
  OK: 200,

  /**
   * The request could not be understood or was missing required parameters.
   */
  BAD_REQUEST: 400,

  /**
   * Authentication is required and has failed or has not yet been provided.
   */
  UNAUTHORIZED: 401,

  /**
   * The request was valid, but the server is refusing action.
   */
  FORBIDDEN: 403,

  /**
   * The requested resource could not be found.
   */
  NOT_FOUND: 404,

  /**
   * The requested resource can only generate content not acceptable
   * according to the Accept headers sent in the request.
   */
  NOT_ACCEPTABLE: 406,

  /**
   * The request could not be completed due to a conflict with the
   * current state of the resource.
   */
  CONFLICT: 409,

  /**
   * The requested resource is no longer available and will not be
   * available again.
   */
  GONE: 410,
  /**
   * One or more conditions given in the request header fields evaluated
   * to false when tested on the server.
   */
  PRECONDITION_FAILED: 412,
  /**
   * The server refuses to accept the request because the payload format
   * is in an unsupported format.
   */
  PAYMENT_REQUIRED: 415,
  /**
   * The request was well-formed but was unable to be followed due to
   * semantic errors.
   */
  UNPROCESSABLE_ENTITY: 422,

  /**
   * A generic error message, given when no more specific message
   * is suitable.
   */
  INTERNAL_SERVER_ERROR: 500,

  /**
   * The server does not recognize the request method, or lacks the
   * ability to fulfill the request.
   */
  NOT_IMPLEMENTED: 501,

  /**
   * The server was acting as a gateway or proxy and received an invalid
   * response from the upstream server.
   */
  BAD_GATEWAY: 502,

  /**
   * The server is currently unavailable (because it is overloaded or
   * down for maintenance).
   */
  SERVICE_UNAVAILABLE: 503,

  /**
   * The server was acting as a gateway or proxy and did not receive a
   * timely response from the upstream server.
   */
  GATEWAY_TIMEOUT: 504,
};
