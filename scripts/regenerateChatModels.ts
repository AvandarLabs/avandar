import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from "seed/SeedData";
import { AuthClient } from "@/clients/AuthClient";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { hasCachedChatModels } from "$/utils/chat/chatModelsCache";
import type { ChatModelsResponse } from "$/types/chat.types";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const CHAT_MODELS_JSON_PATH = path.join(
  PROJECT_ROOT,
  "supabase",
  "functions",
  "chat",
  "models.generated.json",
);

function _loadScriptEnv(): void {
  [".env.development", ".env.development.edge"].forEach((envFileName) => {
    dotenv.config({
      path: path.join(PROJECT_ROOT, envFileName),
      override: false,
    });
  });
}

async function _fetchLiveChatModels(): Promise<ChatModelsResponse> {
  const { session } = await AuthClient.signIn({
    email: process.env.CHAT_MODELS_SCRIPT_EMAIL ?? TEST_USER_EMAIL,
    password: process.env.CHAT_MODELS_SCRIPT_PASSWORD ?? TEST_USER_PASSWORD,
  });

  const response = await fetch(
    `${AvaSupabase.getEdgeFunctionsURL()}/chat/models?useCache=false`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to regenerate chat models: ${errorText}`);
  }

  return (await response.json()) as ChatModelsResponse;
}

async function _writeChatModelsCache(
  response: ChatModelsResponse,
): Promise<void> {
  if (!hasCachedChatModels(response)) {
    throw new Error("Refusing to overwrite chat models cache with an empty list");
  }

  await fs.writeFile(
    CHAT_MODELS_JSON_PATH,
    JSON.stringify(response, null, 2) + "\n",
    "utf8",
  );
}

async function main(): Promise<void> {
  _loadScriptEnv();
  const response = await _fetchLiveChatModels();
  await _writeChatModelsCache(response);
  console.log(`Regenerated ${CHAT_MODELS_JSON_PATH}`);
}

void main();
