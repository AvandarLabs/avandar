import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";

export type WebhookSuccessResponse = {
  success: true;
  message: string;
};

export type WebhookFailureResponse = {
  success: false;
  message: string;
};

export type WebhookResponse = WebhookSuccessResponse | WebhookFailureResponse;

export type PolarPublicAPI = APITypeDef<
  "polar-public",
  ["/webhook"],
  {
    "/webhook": {
      POST: {
        returnType: WebhookSuccessResponse | WebhookFailureResponse;
      };
    };
  }
>;
