import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const envFilePath = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../.env.development",
);

if (!existsSync(envFilePath)) {
  throw new Error(
    `The Supabase suite reads ${envFilePath}. Run it from a checkout with a local Supabase stack.`,
  );
}
process.loadEnvFile(envFilePath);

// This suite writes and deletes rows, so it must never reach a deployed
// database, whatever .env.development happens to say.
const { hostname } = new URL(process.env.SUPABASE_URL ?? "http://invalid");
if (hostname !== "127.0.0.1" && hostname !== "localhost") {
  throw new Error(
    `The Supabase suite only runs against a local stack, and SUPABASE_URL points at ${hostname}.`,
  );
}
