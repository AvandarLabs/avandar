import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";

export type WaitlistAPI = APITypeDef<
  "waitlist",
  ["/:signupCode/verify"],
  {
    "/:signupCode/verify": {
      POST: {
        pathParams: {
          signupCode: string;
        };
        body: {
          email: string;
        };
        returnType: {
          success: boolean;
        };
      };
    };
    "/:signupCode/claim": {
      POST: {
        pathParams: {
          signupCode: string;
        };
        body: {
          userId: string;
          email: string;
        };
        returnType: {
          success: boolean;
        };
      };
    };
  }
>;
