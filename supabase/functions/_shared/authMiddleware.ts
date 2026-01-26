import * as jose from "jsr:@panva/jose@6";
import { AvaHTTPError } from "./AvaHTTPError.ts";
import { BAD_REQUEST, UNAUTHORIZED } from "./httpCodes.ts";
import { responseError } from "./MiniServer/responseError.ts";
import { AvaSupabaseClient, createSupabaseClient } from "./supabase.ts";
import type { User } from "@supabase/supabase-js";

const SUPABASE_JWT_ISSUER =
  Deno.env.get("SB_JWT_ISSUER") ?? Deno.env.get("SUPABASE_URL") + "/auth/v1";

const SUPABASE_JWT_KEYS = jose.createRemoteJWKSet(
  new URL(Deno.env.get("SUPABASE_URL")! + "/auth/v1/.well-known/jwks.json"),
);

function _getAuthToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new AvaHTTPError("Missing authorization header", BAD_REQUEST);
  }
  const [bearer, token] = authHeader.split(" ");
  if (bearer !== "Bearer") {
    throw new AvaHTTPError(`Auth header is not 'Bearer {token}'`, BAD_REQUEST);
  }

  if (!token) {
    throw new AvaHTTPError(
      "Missing token in authorization header",
      BAD_REQUEST,
    );
  }

  return token;
}

function _verifySupabaseJWT(jwt: string) {
  return jose.jwtVerify(jwt, SUPABASE_JWT_KEYS, {
    issuer: SUPABASE_JWT_ISSUER,
  });
}

async function _getSupabaseClientAndUser(request: Request): Promise<{
  supabaseClient: AvaSupabaseClient;
  user: User;
}> {
  const supabaseClient = createSupabaseClient(request);
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabaseClient.auth.getUser(token);

  if (!user) {
    throw new Error("User not found");
  }

  return {
    supabaseClient,
    user,
  };
}

/**
 * Validates the authorization header and returns a 401 response if the JWT is
 * invalid.
 *
 * If isJWTVerificationDisabled is true, the callback will be called with
 * supabaseClient and user as undefined. This is useful for public routes that
 * do not require authentication.
 *
 * @param options - The options for the authentication middleware
 * @param options.request - The request to validate
 * @param options.skipJWTVerification - Whether to disable JWT verification
 * @param options.callback - The callback to call if the JWT is valid
 * @returns A 401 response if the JWT is invalid, otherwise the response from
 * the callback.
 */
export async function authMiddleware(options: {
  request: Request;
  skipJWTVerification: boolean;
  callback: (options: {
    req: Request;
    supabaseClient: AvaSupabaseClient | undefined;
    user: User | undefined;
  }) => Promise<Response>;
}): Promise<Response> {
  const { request, skipJWTVerification, callback } = options;
  try {
    const { supabaseClient, user } =
      skipJWTVerification ? {} : await _getSupabaseClientAndUser(request);
    const callbackOptions = {
      req: request,
      supabaseClient,
      user,
    };
    const token = _getAuthToken(request);
    const isValidJWT = await _verifySupabaseJWT(token);
    if (isValidJWT) {
      return await callback(callbackOptions);
    }
    return responseError("Invalid JWT", UNAUTHORIZED);
  } catch (e) {
    return responseError(e?.toString(), UNAUTHORIZED);
  }
}
