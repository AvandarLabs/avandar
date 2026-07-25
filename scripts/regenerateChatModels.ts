import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import dotenv from "dotenv";
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from "seed/SeedData";
import { AuthClient } from "@/clients/AuthClient";
import type { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const CHAT_MODELS_JSON_PATH = path.join(
  PROJECT_ROOT,
  "supabase",
  "functions",
  "chat",
  "chat-models-catalog.gen.json",
);

function _loadScriptEnv(): void {
  [".env.development", ".env.development.edge"].forEach((envFileName) => {
    dotenv.config({
      path: path.join(PROJECT_ROOT, envFileName),
      override: false,
    });
  });
}

async function _fetchLiveChatModels(): Promise<ChatModelOption.Catalog> {
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

  return (await response.json()) as ChatModelOption.Catalog;
}

async function _writeChatModelsCache(
  chatModelCatalog: ChatModelOption.Catalog,
): Promise<void> {
  const isNonEmptyCatalog = chatModelCatalog.groups.some((group) => {
    return group.models.length > 0;
  });

  if (!isNonEmptyCatalog) {
    throw new Error(
      "Refusing to overwrite chat models cache with an empty list",
    );
  }

  await fs.writeFile(
    CHAT_MODELS_JSON_PATH,
    JSON.stringify(chatModelCatalog, null, 2) + "\n",
    "utf8",
  );
}

async function main(): Promise<void> {
  _loadScriptEnv();
  const chatModelCatalog = await _fetchLiveChatModels();
  await _writeChatModelsCache(chatModelCatalog);
  console.log(`Regenerated ${CHAT_MODELS_JSON_PATH}`);
}

void main();
