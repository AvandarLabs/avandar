import { z } from "zod";
import { getDevFanoutServerClientConfig } from "./getDevFanoutServerClientConfig";

export type NgrokDevURLTarget = Readonly<{
  url: string;
  dateAdded: string;
  lastAccessedDate: string | null;
}>;

type NgrokTargetsResponse = Readonly<{
  targets: readonly NgrokDevURLTarget[];
}>;

const NgrokTargetsResponseSchema = z.object({
  targets: z.array(
    z.object({
      url: z.string(),
      dateAdded: z.string(),
      lastAccessedDate: z.string().nullable(),
    }),
  ),
});

async function _readErrorBody(res: Response): Promise<string> {
  try {
    const json: unknown = await res.json();
    if (
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: unknown }).error === "string"
    ) {
      return (json as { error: string }).error;
    }

    return JSON.stringify(json);
  } catch {
    try {
      return await res.text();
    } catch {
      return `HTTP ${res.status}`;
    }
  }
}

export async function sendNgrokURLManagerRequest(options: {
  path: "/ngrok-url/list" | "/ngrok-url/add" | "/ngrok-url/remove";
  method: "GET" | "POST";
  body?: unknown;
}): Promise<NgrokTargetsResponse> {
  const config = getDevFanoutServerClientConfig();
  const url: string = `${config.baseURL}${options.path}`;

  const res: Response = await fetch(url, {
    method: options.method,
    headers: {
      authorization: `Bearer ${config.adminToken}`,
      "content-type": "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const message: string = await _readErrorBody(res);
    throw new Error(`${res.status} ${res.statusText}: ${message}`);
  }

  const json: unknown = await res.json();
  return NgrokTargetsResponseSchema.parse(json);
}
